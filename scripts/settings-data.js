// Settings Data Module - everything for the Settings page that isn't a direct button/input handler: 
// IndexedDB persistence, file I/O, CSV parsing, data merging, and status/DOM updates performed as a result of those actions. 
// SettingsPage (settings.js) only wires up controls and defines the handlers users interact with directly.
const SettingsData = {
    dbName: 'MeeplewoodDB',
    dbVersion: 2,

    // Open (or create) the IndexedDB database used to persist file handles
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

    // Ensure the database exists/upgrades; resolves even if opening fails so callers can continue
    initDB: async function() {
        return new Promise((resolve) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('indexedDB error:', request.error);
                resolve();
            };
            request.onsuccess = () => {
                console.log('indexedDB initialized');
                resolve();
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('fileHandles')) {
                    db.createObjectStore('fileHandles', { keyPath: 'id' });
                }
            };
        });
    },

    // Store a file handle in IndexedDB
    storeFileHandle: async function(handle, fileName) {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readwrite');
            const store = transaction.objectStore('fileHandles');

            await store.put({
                id: 'defaultCombinedFile',
                handle: handle,
                fileName: fileName,
                timestamp: Date.now()
            });

            console.log('File handle stored in indexedDB:', fileName);
        } catch (error) {
            console.error('Error storing file handle:', error);
        }
    },

    // Retrieve the stored file handle from IndexedDB
    getStoredFileHandle: async function() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readonly');
            const store = transaction.objectStore('fileHandles');

            return new Promise((resolve) => {
                const request = store.get('defaultCombinedFile');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.error('Error retrieving file handle:', error);
            return null;
        }
    },

    // Open a JSON file picker (with a plain <input type=file> fallback), validate it has a
    // "games" array, and persist the handle via the caller-supplied storeHandle(handle, fileName).
    // Returns { data, fileName, fileHandle, localPath } on success, or null if cancelled/invalid.
    browseFilePath: async function(storeHandle) {
        if ('showOpenFilePicker' in window) {
            try {
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false,
                    startIn: 'downloads'
                });

                const file = await fileHandle.getFile();
                const content = await file.text();

                try {
                    const data = JSON.parse(content);
                    if (!data.games || !Array.isArray(data.games)) {
                        alert('Invalid file format. Expected JSON with a "games" array.');
                        return null;
                    }

                    await storeHandle(fileHandle, file.name);

                    console.log(`Browsed and loaded file: ${file.name}`);
                    return { data, fileName: file.name, fileHandle, localPath: `local:${file.name}` };
                } catch (parseError) {
                    console.error('Error parsing JSON:', parseError);
                    alert('Error: Selected file is not valid JSON');
                    return null;
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    return null;  // User cancelled
                }
                console.log('File System Access API failed, falling back:', err);
            }
        }

        // Fallback for browsers without File System Access API
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.json';

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) {
                    resolve(null);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (!data.games || !Array.isArray(data.games)) {
                            alert('Invalid file format. Expected JSON with a "games" array.');
                            resolve(null);
                            return;
                        }

                        alert(`File ${file.name} loaded successfully!\nNote: Your browser doesn't support persistent file access. You'll need to re-select this file after page reloads.`);
                        resolve({ data, fileName: file.name, fileHandle: null, localPath: `data/${file.name}` });
                    } catch (parseError) {
                        console.error('Error parsing JSON:', parseError);
                        alert('Error: Selected file is not valid JSON');
                        resolve(null);
                    }
                };
                reader.readAsText(file);
            };

            input.click();
        });
    },

    // Open a JSON file picker and load the selected file as the default combined preview file
    loadDefaultFileWithPicker: async function(suggestedPath) {
        try {
            // Try to determine a smart starting location based on the path
            let startIn = 'downloads';  // Default fallback
            const pathLower = suggestedPath.toLowerCase();
            if (pathLower.includes('document')) {
                startIn = 'documents';
            } else if (pathLower.includes('desktop')) {
                startIn = 'desktop';
            } else if (pathLower.includes('download')) {
                startIn = 'downloads';
            }
            
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'JSON Files',
                    accept: { 'application/json': ['.json'] }
                }],
                multiple: false,
                startIn: startIn
            });
            
            const file = await fileHandle.getFile();
            const content = await file.text();
            const data = JSON.parse(content);
            
            this.processExistingCombinedData(data, file.name, fileHandle);
            
            // Store the file handle for future use
            await this.storeFileHandle(fileHandle, file.name);
            
            console.log(`Loaded default file "${file.name}" via file picker with write access`);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error loading file:', error);
                alert('Error loading file: ' + error.message);
            }
        }
    },

    // Show a one-click reconnect action that re-requests permission on an already
    // remembered handle, avoiding a full re-browse just because permission expired.
    showReconnectPrompt: function(handle, fileName) {
        const statusEl = document.getElementById('existingFileStatus');
        if (!statusEl) return;
        
        statusEl.innerHTML = '';
        statusEl.style.display = 'block';
        statusEl.style.color = '#e67e22';
        statusEl.appendChild(document.createTextNode(`⚠️ Access to "${fileName}" needs to be reconfirmed. `));
        
        const reconnectBtn = document.createElement('button');
        reconnectBtn.type = 'button';
        reconnectBtn.textContent = 'Reconnect';
        reconnectBtn.className = 'secondary-button';
        reconnectBtn.style.marginLeft = '8px';
        reconnectBtn.addEventListener('click', async () => {
            try {
                const permission = await handle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    const file = await handle.getFile();
                    const content = await file.text();
                    const data = JSON.parse(content);
                    
                    this.processExistingCombinedData(data, file.name, handle);
                    console.log(`Reconnected to local file "${file.name}"`);
                } else {
                    alert('Permission was not granted. Use "Browse" to select the file again.');
                }
            } catch (error) {
                console.error('Error reconnecting to file:', error);
                alert('Error reconnecting to file: ' + error.message);
            }
        });
        statusEl.appendChild(reconnectBtn);
    },

    // Validate and store a loaded combined preview file, updating SettingsPage state and status
    processExistingCombinedData: function(data, fileName, fileHandle = null) {
        if (data.games && Array.isArray(data.games)) {
            SettingsPage.existingCombinedData = data;
            SettingsPage.existingFileName = fileName;
            SettingsPage.existingFileHandle = fileHandle;  // Store handle for later save
            
            const statusEl = document.getElementById('existingFileStatus');
            if (statusEl) {
                const handleInfo = fileHandle ? ' (with write access)' : '';
                statusEl.textContent = `✓ Loaded: ${fileName}${handleInfo}`;
                statusEl.style.display = 'block';
            }
            
            console.log(`Loaded existing file with ${data.games.length} games`, fileHandle ? 'with file handle' : 'without file handle');
        } else {
            alert('Invalid file format. Expected JSON with "games" array.');
        }
    },

    // Populate the settings form fields from SettingsPage.settings
    populateForm: function() {
        const userNameInput = document.getElementById('userName');
        const defaultPreviewPathInput = document.getElementById('defaultPreviewPath');
        const defaultCollectionPathInput = document.getElementById('defaultCollectionPath');
        const defaultViewSelect = document.getElementById('defaultView');
        const showWelcomeCheck = document.getElementById('showWelcome');
        const themeSelect = document.getElementById('theme');
        const cardSizeSelect = document.getElementById('cardSize');
        
        const settings = SettingsPage.settings;
        if (userNameInput) userNameInput.value = settings.userName;
        if (defaultPreviewPathInput) defaultPreviewPathInput.value = settings.defaultPreviewPath;
        if (defaultCollectionPathInput) defaultCollectionPathInput.value = settings.defaultCollectionPath;
        if (defaultViewSelect) defaultViewSelect.value = settings.defaultView;
        if (showWelcomeCheck) showWelcomeCheck.checked = settings.showWelcome;
        if (themeSelect) themeSelect.value = settings.theme;
        if (cardSizeSelect) cardSizeSelect.value = settings.cardSize;

        this.updateAddDataButtonsState();
    },

    // Adding data only makes sense once a real local file is selected - example/server
    // paths have no writable file handle to save merged data back into.
    updateAddDataButtonsState: function() {
        const isLocal = (path) => typeof path === 'string' && path.startsWith('local:');
        const settings = SettingsPage.settings;

        const importCollectionBtn = document.getElementById('importCollectionBtn');
        if (importCollectionBtn) {
            const enabled = isLocal(settings.defaultCollectionPath);
            importCollectionBtn.disabled = !enabled;
            importCollectionBtn.title = enabled ? '' : 'Select or create a local collection file first (not the example data)';
        }

        const importSpielBtn = document.getElementById('importSpielBtn');
        if (importSpielBtn) {
            const enabled = isLocal(settings.defaultPreviewPath);
            importSpielBtn.disabled = !enabled;
            importSpielBtn.title = enabled ? '' : 'Select or create a local Geek Preview file first (not the example data)';
        }
    },

    // Show the Geek Preview import metadata modal, pre-filled from SettingsPage state
    showSpielMetadataModal: function() {
        const modal = document.getElementById('spielMetadataModal');
        const gamesCount = document.getElementById('gamesCount');
        const fileName = document.getElementById('fileName');
        const yearInput = document.getElementById('spielYear');
        const userInput = document.getElementById('spielUser');
        
        if (modal) {
            modal.style.display = 'flex';
            
            if (gamesCount) gamesCount.textContent = SettingsPage.tempSpielData.length;
            if (fileName) fileName.textContent = SettingsPage.tempSpielFileName;
            
            // Set default year to current year
            if (yearInput) yearInput.value = new Date().getFullYear();
            
            // Pre-populate user field from settings
            if (userInput && SettingsPage.settings.userName) {
                userInput.value = SettingsPage.settings.userName;
            }
        }
    },

    // Show the collection import success/status message
    showCollectionSuccessMessage: function(filename, totalGames, importedGameCount, savedDirectly) {
        const statusEl = document.getElementById('collectionImportStatus');
        if (statusEl) {
            statusEl.textContent = `✓ Successfully saved ${importedGameCount} games to ${filename}`;
            statusEl.style.display = 'block';

            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }

        const message = savedDirectly
            ? `Successfully processed ${importedGameCount} games!\n\nFile: ${filename}\n\nTotal games in file: ${totalGames}\n\nThe file was updated directly - no further action needed.`
            : `Successfully processed ${importedGameCount} games!\n\nFile: ${filename}\n\nTotal games in file: ${totalGames}\n\nThis file was downloaded (your browser couldn't write directly to the configured file). Save it to the Meeplewood "data" folder (as "data/${filename}") so the Games page can load it automatically.`;

        alert(message);
    },

    // Show the Geek Preview import success message and reset the loaded-file status
    showSuccessMessage: function(filename, totalGames, importedGameCount) {
        // Clear existing file reference (but keep handle if we have one)
        SettingsPage.existingCombinedData = null;
        SettingsPage.existingFileName = '';
        // Note: Don't clear existingFileHandle - keep it for next save
        const existingStatusEl = document.getElementById('existingFileStatus');
        if (existingStatusEl) {
            existingStatusEl.style.display = 'none';
        }
        
        const statusEl = document.getElementById('spielImportStatus');
        if (statusEl) {
            statusEl.textContent = `✓ Successfully saved ${importedGameCount} games to ${filename}`;
            statusEl.style.display = 'block';
            
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
        
        alert(`Successfully processed ${importedGameCount} games!\n\nFile: ${filename}\n\nTotal games in file: ${totalGames}\n\nLoad this file in the Spiel Preview page to view your data.`);
    },

    // Create a new empty JSON data file via the save picker (or a manual path as fallback).
    // Returns { fileHandle, file, localPath } on success so the caller can store the handle
    // under its own IndexedDB key and update its own state - or a plain { path } when the
    // File System Access API isn't available.
    createNewFile: async function(suggestedName) {
        const emptyData = {
            metadata: { sources: [] },
            games: []
        };
        const jsonContent = JSON.stringify(emptyData, null, 2);
        
        // Prefer a save picker so the user can choose where the file lives
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: suggestedName || 'MeepleWood-Data.json',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();
                
                const file = await fileHandle.getFile();
                return { emptyData, fileHandle, file, localPath: `local:${file.name}` };
            } catch (err) {
                if (err.name === 'AbortError') {
                    return null;  // User cancelled
                }
                console.log('Save picker failed, falling back to manual path entry:', err);
            }
        }
        
        // Fallback for browsers without File System Access API
        const fileName = prompt('Name for the new file (without extension):', (suggestedName || 'MeepleWood-Data').replace(/\.json$/i, ''));
        if (!fileName) {
            return null;  // User cancelled or entered nothing
        }
        
        const baseName = fileName.trim().replace(/\.json$/i, '');
        const path = `data/${baseName}.json`;
        
        return { emptyData, fileName: `${baseName}.json`, path };
    },

    // Parse a single CSV line, honoring quoted fields with embedded commas/escaped quotes
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

    // Parse a Spiel/Geek Preview CSV export into an array of game objects
    parseSpielCSV: function(csvText) {
        const lines = csvText.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        const games = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // Skip empty lines

            const values = this.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue; // Skip incomplete lines

            const game = {};
            headers.forEach((header, index) => {
                game[header] = values[index] || '';
            });

            game.imported = new Date().toISOString();
            // Normalize priority: 'N/A' and '0' become empty string
            let priority = game.Priority || '';
            if (priority === 'N/A' || priority === '0') {
                priority = '';
            }
            game.userPriority = priority; // Default to '' (not prioritized)
            game.userNotes = game.Notes || '';

            games.push(game);
        }

        return games;
    },

    // Merge freshly imported Spiel/Geek Preview games into the existing combined data set,
    // matching games by BGGVersionId (or BGGId/Title as fallback) and appending a source entry.
    // Returns { exportData, filename } - filename reuses the existing file name when available.
    buildSpielExportData: function(existingCombinedData, tempSpielData, meta) {
        const { year, convention, user, notes, sourceFileName, existingFileName } = meta;
        const now = new Date().toISOString();

        let finalGames = [];
        if (existingCombinedData && existingCombinedData.games) {
            finalGames = JSON.parse(JSON.stringify(existingCombinedData.games));
        }

        tempSpielData.forEach(importedGame => {
            let existingGame = finalGames.find(g =>
                (g.BGGVersionId && g.BGGVersionId === importedGame.BGGVersionId) ||
                (!importedGame.BGGVersionId && g.BGGId && g.BGGId === importedGame.BGGId) ||
                (!importedGame.BGGVersionId && !importedGame.BGGId && g.Title === importedGame.Title)
            );

            // Normalize priority value (convert 'N/A' and '0' to empty string)
            let priorityValue = importedGame.Priority || importedGame.userPriority || '';
            if (priorityValue === 'N/A' || priorityValue === '0') {
                priorityValue = '';
            }

            const newEntry = {
                year: year,
                convention: convention,
                user: user,
                versionId: importedGame.BGGVersionId || '', // Store version ID in entry for proper filtering
                priority: priorityValue,
                notes: importedGame.Notes || importedGame.userNotes || '',
                availability: importedGame.Availability || '',
                msrpCurrency: importedGame['MSRP Currency'] || '',
                msrp: importedGame.MSRP || '',
                showPriceCurrency: importedGame['Show Price Currency'] || '',
                showPrice: importedGame['Show Price'] || '',
                location: importedGame.Location || '',
                thumbs: importedGame.Thumbs || '',
                releaseDate: importedGame['Release Date'] || '',
                overrideReleaseDate: importedGame['Override Release Date'] || '',
                events: importedGame.Events || '',
                insertedDate: now,
                lastModified: now
            };

            if (existingGame) {
                if (!existingGame.entries) {
                    existingGame.entries = [];
                }

                const existingEntryIndex = existingGame.entries.findIndex(e =>
                    e.year === year &&
                    e.convention === convention &&
                    e.user === user
                );

                if (existingEntryIndex >= 0) {
                    existingGame.entries[existingEntryIndex] = {
                        ...existingGame.entries[existingEntryIndex],
                        versionId: newEntry.versionId,
                        priority: newEntry.priority,
                        notes: newEntry.notes,
                        availability: newEntry.availability,
                        msrpCurrency: newEntry.msrpCurrency,
                        msrp: newEntry.msrp,
                        showPriceCurrency: newEntry.showPriceCurrency,
                        showPrice: newEntry.showPrice,
                        location: newEntry.location,
                        thumbs: newEntry.thumbs,
                        releaseDate: newEntry.releaseDate,
                        overrideReleaseDate: newEntry.overrideReleaseDate,
                        events: newEntry.events,
                        lastModified: now
                    };
                } else {
                    existingGame.entries.push(newEntry);
                }

                // Update base game info (in case anything changed)
                Object.keys(importedGame).forEach(key => {
                    // Exclude user-specific and entry-specific fields from game level
                    const excludedFields = ['Priority', 'Notes', 'userPriority', 'userNotes', 'metadata', 'entries',
                        'Availability', 'MSRP Currency', 'MSRP', 'Show Price Currency', 'Show Price',
                        'Location', 'Thumbs', 'Release Date', 'Override Release Date', 'Events'];
                    if (!excludedFields.includes(key)) {
                        existingGame[key] = importedGame[key];
                    }
                });

            } else {
                // New game - create with entry
                const newGame = { ...importedGame };
                delete newGame.Priority;
                delete newGame.Notes;
                delete newGame.userPriority;
                delete newGame.userNotes;
                delete newGame.metadata;
                delete newGame.Availability;
                delete newGame['MSRP Currency'];
                delete newGame.MSRP;
                delete newGame['Show Price Currency'];
                delete newGame['Show Price'];
                delete newGame.Location;
                delete newGame.Thumbs;
                delete newGame['Release Date'];
                delete newGame['Override Release Date'];
                delete newGame.Events;

                newGame.entries = [newEntry];
                finalGames.push(newGame);
            }
        });

        const exportData = {
            metadata: {
                lastUpdated: now,
                totalGames: finalGames.length,
                sources: existingCombinedData?.metadata?.sources || []
            },
            games: finalGames
        };

        exportData.metadata.sources.push({
            year: year,
            convention: convention,
            user: user,
            notes: notes,
            sourceFile: sourceFileName,
            importedDate: now,
            gameCount: tempSpielData.length
        });

        // Reuse the existing file name if available, otherwise derive one from the convention
        let filename = 'GeekPreview-Combined.json';
        if (existingFileName) {
            filename = existingFileName;
        } else {
            const conventionPart = convention.replace(/\s+/g, '-');
            filename = `${conventionPart}-Combined.json`;
        }

        return { exportData, filename };
    },

    // Merge and save an imported BGG collection CSV, preferring a direct write to the
    // already-configured local file and falling back to a picker/download.
    saveCollectionAsJson: async function(exportData, importedGameCount) {
        const jsonContent = JSON.stringify(exportData, null, 2);
        const filename = 'collection.json';

        // Prefer writing straight back to the already-configured local file (if we still
        // hold write permission for it) - this doesn't need a fresh user gesture, unlike
        // showSaveFilePicker, so it works even after the async CSV parsing/merge above.
        if (window.CollectionData) {
            const stored = await window.CollectionData.getStoredFileHandle();
            if (stored && stored.handle) {
                try {
                    let permission = await stored.handle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'prompt') {
                        // Permission resets to 'prompt' after a restart/new session even though the
                        // handle is still remembered - re-request it (the click that started this
                        // import still counts as a user gesture) before falling back to a picker.
                        permission = await stored.handle.requestPermission({ mode: 'readwrite' });
                    }
                    console.log(`Existing collection file handle "${stored.fileName}" permission: ${permission}`);
                    if (permission === 'granted') {
                        const writable = await stored.handle.createWritable();
                        await writable.write(jsonContent);
                        await writable.close();

                        window.CollectionData.cache = { metadata: exportData.metadata, games: exportData.games };
                        console.log(`Saved ${exportData.games.length} games directly to "${stored.fileName}"`);
                        this.showCollectionSuccessMessage(stored.fileName, exportData.games.length, importedGameCount, true);
                        return;
                    }
                } catch (error) {
                    console.log('Could not write to existing collection file handle, falling back:', error.message);
                }
            }
        }

        // Try File System Access API with picker (Chrome, Edge, Opera)
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    startIn: 'downloads',
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });

                const writable = await fileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();

                if (window.CollectionData) {
                    await window.CollectionData.storeFileHandle(fileHandle, fileHandle.name);
                    window.CollectionData.cache = { metadata: exportData.metadata, games: exportData.games };
                }
                console.log(`Saved ${exportData.games.length} games to "${fileHandle.name}" via save picker`);
                this.showCollectionSuccessMessage(fileHandle.name, exportData.games.length, importedGameCount, true);
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    return; // User cancelled
                }
                console.log('Save picker failed, falling back to download:', err);
            }
        }

        // Fallback: automatic download
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`Downloaded ${exportData.games.length} games as "${filename}" (not written to an existing local file)`);
        this.showCollectionSuccessMessage(filename, exportData.games.length, importedGameCount, false);
    },

    // Read and parse a Spiel/Geek Preview CSV export, storing the result on SettingsPage
    // and showing the metadata modal for the user to fill in before saving.
    importSpielPreview: function() {
        console.log('Import Spiel Preview CSV');
        
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        // Include MIME type for better Android compatibility
        input.accept = 'text/csv,.csv,text/plain';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                SettingsPage.tempSpielFileName = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const csvText = event.target.result;
                        const parsedGames = this.parseSpielCSV(csvText);
                        
                        // Store temporarily
                        SettingsPage.tempSpielData = parsedGames;
                        
                        console.log(`Parsed ${parsedGames.length} games from Spiel preview`);
                        
                        // Show metadata modal
                        this.showSpielMetadataModal();
                    } catch (error) {
                        console.error('Error parsing Spiel CSV:', error);
                        alert('Error parsing CSV file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    },

    // Open a JSON file picker to load an existing combined preview file for editing
    openExistingFilePicker: async function() {
        // Try File System Access API first (Chrome, Edge, Opera)
        if ('showOpenFilePicker' in window) {
            try {
                // Try to determine a smart starting location based on default path
                let startIn = 'downloads';  // Default fallback
                const defaultPath = (SettingsPage.settings.defaultPreviewPath || '').toLowerCase();
                if (defaultPath.includes('document')) {
                    startIn = 'documents';
                } else if (defaultPath.includes('desktop')) {
                    startIn = 'desktop';
                } else if (defaultPath.includes('download')) {
                    startIn = 'downloads';
                }
                
                const [fileHandle] = await window.showOpenFilePicker({
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }],
                    multiple: false,
                    startIn: startIn  // Use smart starting point
                });
                
                const file = await fileHandle.getFile();
                const content = await file.text();
                
                try {
                    const data = JSON.parse(content);
                    this.processExistingCombinedData(data, file.name, fileHandle);
                    
                    // Store the file handle for auto-loading
                    await this.storeFileHandle(fileHandle, file.name);
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    alert('Error parsing JSON file: ' + error.message);
                }
                return;
            } catch (err) {
                // User cancelled or API not available, fall back to input method
                if (err.name === 'AbortError') {
                    return;  // User cancelled, just exit
                }
                console.log('File System Access API failed, falling back to input method:', err);
            }
        }
        
        // Fallback for browsers without File System Access API
        const input = document.createElement('input');
        input.type = 'file';
        // Include MIME type for better Android compatibility
        input.accept = 'application/json,.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        this.processExistingCombinedData(data, file.name, null);
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        alert('Error parsing JSON file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    },

    // Merge the temporarily-imported Spiel data and write it to disk (existing handle,
    // save picker, or a plain download as a last resort), then notify SettingsPage.
    saveSpielAsJson: async function() {
        if (!SettingsPage.tempSpielData) {
            alert('No data to save');
            return;
        }
        
        // Store the imported game count before any operations that might clear tempSpielData
        const importedGameCount = SettingsPage.tempSpielData.length;
        
        // Get metadata from form
        const year = document.getElementById('spielYear')?.value || '';
        const convention = document.getElementById('spielConvention')?.value || '';
        const user = document.getElementById('spielUser')?.value || '';
        const notes = document.getElementById('spielNotes')?.value || '';
        
        if (!year || !convention || !user) {
            alert('Please fill in Year, Convention, and User fields - they are required for tracking.');
            return;
        }
        
        const { exportData, filename } = this.buildSpielExportData(SettingsPage.existingCombinedData, SettingsPage.tempSpielData, {
            year, convention, user, notes,
            sourceFileName: SettingsPage.tempSpielFileName,
            existingFileName: SettingsPage.existingFileName
        });
        const finalGames = exportData.games;
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        
        // Try to use existing file handle first
        if (SettingsPage.existingFileHandle) {
            try {
                const writable = await SettingsPage.existingFileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();
                
                this.showSuccessMessage(filename, finalGames.length, importedGameCount);
                SettingsPage.cancelSpielImport();
                return;
            } catch (err) {
                console.log('Failed to write to existing file handle, will prompt for new location:', err);
                SettingsPage.existingFileHandle = null;  // Clear invalid handle
            }
        }
        
        // Try File System Access API with picker (Chrome, Edge, Opera)
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    startIn: 'downloads',  // Change to 'documents', 'desktop', etc. (browser only allows these preset folders)
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();
                
                // Store the handle for future saves
                SettingsPage.existingFileHandle = fileHandle;
                SettingsPage.existingFileName = fileHandle.name;
                
                this.showSuccessMessage(filename, finalGames.length, importedGameCount);
                SettingsPage.cancelSpielImport();
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log('Save cancelled or failed, falling back to download');
                    this.fallbackDownload(jsonContent, filename, finalGames.length, importedGameCount);
                }
                SettingsPage.cancelSpielImport();
                return;
            }
        }
        
        // Fallback: automatic download
        this.fallbackDownload(jsonContent, filename, finalGames.length, importedGameCount);
        
        // Hide modal
        SettingsPage.cancelSpielImport();
    },
    
    // Trigger a browser download of JSON content when no file handle/picker is available
    fallbackDownload: function(jsonContent, filename, totalGames, importedGameCount) {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage(filename, totalGames, importedGameCount);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsData;
}
