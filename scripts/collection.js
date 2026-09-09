// Collection Data Module - Manages the board game collection imported from BGG CSV exports.
// Produces/consumes data/collection.json, structured like GeekPreview-Combined.json
// (metadata + games array) so it can later be combined with other data sources.

const CollectionData = {
    dataPath: 'data/collection.json',
    cache: { metadata: null, games: [] },
    dbName: 'MeeplewoodDB',
    dbVersion: 2,
    fileHandleId: 'defaultCollectionFile',

    /**
     * Read the configured default path from settings (falls back to data/collection.json).
     */
    getConfiguredPath: function() {
        const savedSettings = localStorage.getItem('meeplewood_settings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.defaultCollectionPath) {
                    return settings.defaultCollectionPath;
                }
            } catch (error) {
                console.log('Error parsing settings, using default collection path');
            }
        }
        return 'data/collection.json';
    },

    // Open IndexedDB connection (shared store with settings.js/geek-preview.js)
    openDB: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };
        });
    },

    // Retrieve the stored local file handle for the default collection file
    getStoredFileHandle: async function() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readonly');
            const store = transaction.objectStore('fileHandles');

            return new Promise((resolve) => {
                const request = store.get(this.fileHandleId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.error('Error retrieving collection file handle:', error);
            return null;
        }
    },

    // Store a local file handle for the default collection file
    storeFileHandle: async function(handle, fileName) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readwrite');
            const store = transaction.objectStore('fileHandles');

            await store.put({
                id: this.fileHandleId,
                handle: handle,
                fileName: fileName,
                timestamp: Date.now()
            });

            console.log('Collection file handle stored in IndexedDB:', fileName);
        } catch (error) {
            console.error('Error storing collection file handle:', error);
        }
    },

    /**
     * Load the current collection.json (if present) into cache.
     * Respects the configured default path, including local (File System Access) files.
     */
    init: async function() {
        const configuredPath = this.getConfiguredPath();
        this.dataPath = configuredPath;

        if (configuredPath.startsWith('local:')) {
            const stored = await this.getStoredFileHandle();
            if (stored && stored.handle) {
                try {
                    const permission = await stored.handle.queryPermission({ mode: 'read' });
                    if (permission === 'granted' || permission === 'prompt') {
                        const file = await stored.handle.getFile();
                        const content = await file.text();
                        const data = JSON.parse(content);
                        this.cache = { metadata: data.metadata || null, games: data.games || [] };
                        console.log(`Loaded ${this.cache.games.length} games from local file "${file.name}"`);
                        return this.cache;
                    }
                } catch (error) {
                    console.log('Could not load collection from stored handle:', error.message);
                }
            }
            console.log('No accessible local collection file found, starting fresh');
            this.cache = { metadata: null, games: [] };
            return this.cache;
        }

        try {
            const response = await fetch(configuredPath);
            if (response.ok) {
                const data = await response.json();
                this.cache = { metadata: data.metadata || null, games: data.games || [] };
                console.log(`Loaded ${this.cache.games.length} games from ${configuredPath}`);
            } else {
                console.log('No existing collection.json found, starting fresh');
                this.cache = { metadata: null, games: [] };
            }
        } catch (error) {
            console.log('Could not load collection.json, starting fresh:', error);
            this.cache = { metadata: null, games: [] };
        }
        return this.cache;
    },

    /**
     * Parse a BGG collection export CSV into an array of normalized game objects.
     */
    parseCSV: function(csvText) {
        const lines = csvText.split('\n');
        if (lines.length === 0) return [];

        const headers = this.parseCSVLine(lines[0]);
        const games = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;

            const values = this.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            games.push(this.normalizeRow(row));
        }

        return games;
    },

    /**
     * Parse a single CSV line, respecting quoted fields.
     */
    parseCSVLine: function(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());

        return result;
    },

    /**
     * Convert a raw CSV row (BGG collection export columns) into a normalized game object.
     */
    normalizeRow: function(row) {
        const toNum = (value) => {
            if (value === undefined || value === null || value === '') return null;
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
        };
        const toBool = (value) => value === '1';

        return {
            bggId: row.objectid || '',
            collId: row.collid || '',
            name: row.objectname || '',
            itemType: row.objecttype || 'thing', // 'thing' = base game, 'expansion' = expansion
            yearPublished: row.yearpublished || '',
            minPlayers: toNum(row.minplayers),
            maxPlayers: toNum(row.maxplayers),
            bestPlayers: row.bggbestplayers || '',
            playingTime: toNum(row.playingtime),
            minPlayTime: toNum(row.minplaytime),
            maxPlayTime: toNum(row.maxplaytime),

            collectionStatus: {
                own: toBool(row.own),
                forTrade: toBool(row.fortrade),
                want: toBool(row.want),
                wantToBuy: toBool(row.wanttobuy),
                wantToPlay: toBool(row.wanttoplay),
                prevOwned: toBool(row.prevowned),
                preOrdered: toBool(row.preordered),
                wishlist: toBool(row.wishlist),
                wishlistPriority: row.wishlistpriority || '',
            },

            comment: row.comment || '',
            rating: toNum(row.rating),
            weight: toNum(row.weight),
            avgWeight: toNum(row.avgweight),
            average: toNum(row.average),
            bayesAverage: toNum(row.baverage),

            lastImported: new Date().toISOString()
        };
    },

    /**
     * Merge newly imported games into an existing games array, matching on bggId.
     * Imported data takes precedence for collection-specific fields.
     */
    mergeGames: function(existingGames, newGames) {
        const merged = existingGames ? JSON.parse(JSON.stringify(existingGames)) : [];

        newGames.forEach(newGame => {
            const index = merged.findIndex(g => g.bggId === newGame.bggId);
            if (index >= 0) {
                merged[index] = { ...merged[index], ...newGame };
            } else {
                merged.push(newGame);
            }
        });

        return merged;
    },

    /**
     * Build the exportable data structure (metadata + games).
     */
    buildExportData: function(games, sourceFileName) {
        return {
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalGames: games.length,
                sourceFile: sourceFileName || null
            },
            games: games
        };
    }
};

// Make it available globally
window.CollectionData = CollectionData;
