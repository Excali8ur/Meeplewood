// Spiel Preview Page Module

// Utility: Debounce function to limit execution rate
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const SpielPreviewPage = {
    games: [],
    filteredGames: [],
    currentFilter: 'all',
    searchTerm: '',
    metadata: null,
    currentFileName: null,
    dbName: 'MeeplewoodDB',
    dbVersion: 1,
    
    // Filter settings
    selectedYear: '', // '' = latest
    selectedConvention: '',
    selectedUser: '',
    showHistoricalEntries: true,
    showMultipleEntriesOnly: false,
    showUniqueEntriesOnly: false,
    
    // Sort settings
    sortBy: 'title', // 'title', 'thumbs', 'publisher'
    sortDirection: 'asc', // 'asc' or 'desc'
    
    // Available filter options
    availableYears: [],
    availableConventions: [],
    availableUsers: [],
    
    // Performance: Cache for relevant entries
    relevantEntryCache: new Map(),
    
    init: async function() {
        console.log('Spiel Preview page initialized');
        this.attachEventListeners();
        this.updateSortButtonStates(); // Initialize sort button states
        this.renderGames();
        
        // Initialize GameDatabase
        if (window.GameDatabase) {
            await window.GameDatabase.init();
            console.log('Game Database initialized in preview page');
        }
        
        // Show loading screen and hide other elements initially
        this.showLoadingScreen();
        
        // Try to auto-load the default file
        this.autoLoadDefaultFile();
    },
    
    // Open IndexedDB connection (shared with settings.js)
    openDB: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    // Retrieve file handle from IndexedDB
    getStoredFileHandle: async function() {
        try {
            const db = await this.openDB();
            const transaction = db.transaction(['fileHandles'], 'readonly');
            const store = transaction.objectStore('fileHandles');
            
            return new Promise((resolve, reject) => {
                const request = store.get('defaultCombinedFile');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
        } catch (error) {
            console.error('Error retrieving file handle:', error);
            return null;
        }
    },
    
    showLoadingScreen: function() {
        const loadingScreen = document.getElementById('loadingScreen');
        const noGamesMessage = document.getElementById('noGamesMessage');
        const spielGrid = document.getElementById('spielGrid');
        const entryFilters = document.getElementById('entryFilters');
        const metadataDisplay = document.getElementById('metadataDisplay');
        
        if (loadingScreen) loadingScreen.style.display = 'flex';
        if (noGamesMessage) noGamesMessage.style.display = 'none';
        if (spielGrid) spielGrid.style.display = 'none';
        if (entryFilters) entryFilters.style.display = 'none';
        if (metadataDisplay) metadataDisplay.style.display = 'none';
    },
    
    hideLoadingScreen: function() {
        const loadingScreen = document.getElementById('loadingScreen');
        const spielGrid = document.getElementById('spielGrid');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (spielGrid) spielGrid.style.display = 'grid';
    },
    
    showNoGamesMessage: function() {
        const loadingScreen = document.getElementById('loadingScreen');
        const noGamesMessage = document.getElementById('noGamesMessage');
        const spielGrid = document.getElementById('spielGrid');
        
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (noGamesMessage) noGamesMessage.style.display = 'block';
        if (spielGrid) spielGrid.style.display = 'none';
    },
    
    autoLoadDefaultFile: async function() {
        // Get default path from settings
        const savedSettings = localStorage.getItem('meeplewood_settings');
        let defaultPath = 'data/GeekPreview-Combined.json'; // fallback default
        
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.defaultDataPath) {
                    defaultPath = settings.defaultDataPath;
                }
            } catch (error) {
                console.log('Error parsing settings, using default path');
            }
        }
        
        // Check if it's a local file (stored in IndexedDB)
        if (defaultPath.startsWith('local:')) {
            const stored = await this.getStoredFileHandle();
            if (stored && stored.handle) {
                try {
                    // Verify we still have permission
                    const permission = await stored.handle.queryPermission({ mode: 'readwrite' });
                    
                    if (permission === 'granted' || permission === 'prompt') {
                        const file = await stored.handle.getFile();
                        const content = await file.text();
                        const data = JSON.parse(content);
                        
                        this.processLoadedData(data, file.name);
                        console.log(`Auto-loaded local file "${file.name}" from stored handle`);
                        return;
                    }
                } catch (error) {
                    console.log('Could not load from stored handle:', error.message);
                    this.showNoGamesMessage();
                    return;
                }
            }
            
            // Stored handle failed
            console.log('Could not auto-load local file, please use the Load File button');
            this.showNoGamesMessage();
            return;
        }
        
        // Try to fetch from server (for web-hosted files)
        try {
            const response = await fetch(defaultPath);
            if (!response.ok) {
                throw new Error('Default file not found');
            }
            const data = await response.json();
            this.processLoadedData(data, defaultPath.split('/').pop());
            console.log(`Auto-loaded ${defaultPath}`);
        } catch (error) {
            console.log('Default file not found, waiting for manual load');
            this.showNoGamesMessage();
        }
    },
    
    attachEventListeners: function() {
        // Load file button
        const loadFileBtn = document.getElementById('loadSpielFileBtn');
        if (loadFileBtn) {
            loadFileBtn.addEventListener('click', this.loadSpielFile.bind(this));
        }
        
        // Save changes button
        const saveChangesBtn = document.getElementById('saveChangesBtn');
        if (saveChangesBtn) {
            saveChangesBtn.addEventListener('click', this.exportUpdatedJson.bind(this));
        }
        
        // Entry filter controls - no debouncing for dropdowns (single selection events)
        const filterYear = document.getElementById('filterYear');
        if (filterYear) {
            filterYear.addEventListener('change', (e) => {
                this.selectedYear = e.target.value;
                this.clearCache();
                this.batchUpdate();
            });
        }
        
        const filterConvention = document.getElementById('filterConvention');
        if (filterConvention) {
            filterConvention.addEventListener('change', (e) => {
                this.selectedConvention = e.target.value;
                this.clearCache();
                this.batchUpdate();
            });
        }
        
        const filterUser = document.getElementById('filterUser');
        if (filterUser) {
            filterUser.addEventListener('change', (e) => {
                this.selectedUser = e.target.value;
                this.clearCache();
                this.batchUpdate();
            });
        }
        
        const showHistorical = document.getElementById('showHistoricalEntries');
        if (showHistorical) {
            showHistorical.addEventListener('change', (e) => {
                this.showHistoricalEntries = e.target.checked;
                this.renderGames();
            });
        }
        
        const showMultipleOnly = document.getElementById('showMultipleEntriesOnly');
        const showUniqueOnly = document.getElementById('showUniqueEntriesOnly');
        if (showMultipleOnly) {
            showMultipleOnly.addEventListener('change', (e) => {
                this.showMultipleEntriesOnly = e.target.checked;
                if(this.showMultipleEntriesOnly){
                    this.showUniqueEntriesOnly = !e.target.checked; // Ensure mutual exclusivity
                }
                showMultipleOnly.checked = this.showMultipleEntriesOnly;
                showUniqueOnly.checked = this.showUniqueEntriesOnly;
                this.clearCache();
                this.batchUpdate();
            });
        }      
        if (showUniqueOnly) {
            showUniqueOnly.addEventListener('change', (e) => {
                this.showUniqueEntriesOnly = e.target.checked;                
                if(this.showUniqueEntriesOnly){
                    this.showMultipleEntriesOnly = !e.target.checked; // Ensure mutual exclusivity
                }
                showMultipleOnly.checked = this.showMultipleEntriesOnly;
                showUniqueOnly.checked = this.showUniqueEntriesOnly;
                this.clearCache();
                this.batchUpdate();
            });
        }
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.closest('.filter-btn').dataset.priority);
            });
        });
        
        // Search input with debouncing
        const searchInput = document.getElementById('spielSearch');
        if (searchInput) {
            const debouncedSearch = debounce((value) => {
                this.handleSearch(value);
            }, 300);
            searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
        }
        
        // Sort controls
        const sortByTitle = document.getElementById('sortByTitle');
        if (sortByTitle) {
            sortByTitle.addEventListener('click', () => {
                this.handleSort('title');
            });
        }
        
        const sortByThumbs = document.getElementById('sortByThumbs');
        if (sortByThumbs) {
            sortByThumbs.addEventListener('click', () => {
                this.handleSort('thumbs');
            });
        }

        const sortByPublisher = document.getElementById('sortByPublisher');
        if (sortByPublisher) {
            sortByPublisher.addEventListener('click', () => {
                this.handleSort('publisher');
            });
        }
        
        // Event delegation for priority dropdowns and notes (on the grid)
        /*Changes not made in Meeplewood at the moment, but can be re-enabled if needed.
        const spielGrid = document.getElementById('spielGrid');
        if (spielGrid) {
            spielGrid.addEventListener('change', (e) => {
                if (e.target.classList.contains('priority-select')) {
                    const gameId = e.target.dataset.gameId;
                    const entryKey = e.target.dataset.entryKey;
                    this.updateGamePriority(gameId, entryKey, e.target.value);
                }
            });
            
            spielGrid.addEventListener('blur', (e) => {
                if (e.target.classList.contains('notes-input')) {
                    const gameId = e.target.dataset.gameId;
                    const entryKey = e.target.dataset.entryKey;
                    this.updateGameNotes(gameId, entryKey, e.target.value);
                }
            }, true); // Use capture phase for blur
        }*/
        
    },
    
    loadSpielFile: async function() {
        console.log('Opening file picker to load a different file');
        
        // Always open file picker to let user choose a file
        await this.openFilePicker();
    },
    
    openFilePicker: async function() {
        // Try File System Access API first (Chrome, Edge, Opera)
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
                
                // Show loading screen
                this.showLoadingScreen();
                
                const file = await fileHandle.getFile();
                const content = await file.text();
                
                try {
                    const data = JSON.parse(content);
                    this.clearCache(); // Clear cache before processing new data
                    this.processLoadedData(data, file.name);
                    
                    // Store the file handle for future auto-loading
                    await this.storeFileHandle(fileHandle, file.name);
                } catch (error) {
                    console.error('Error parsing JSON file:', error);
                    this.hideLoadingScreen();
                    alert('Error parsing JSON file: ' + error.message);
                    this.showNoGamesMessage();
                }
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;  // User cancelled
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
                // Show loading screen
                this.showLoadingScreen();
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        this.processLoadedData(data, file.name);
                    } catch (error) {
                        console.error('Error parsing JSON file:', error);
                        this.hideLoadingScreen();
                        alert('Error parsing JSON file: ' + error.message);
                        this.showNoGamesMessage();
                    }
                };
                reader.onerror = () => {
                    this.hideLoadingScreen();
                    alert('Error reading file');
                    this.showNoGamesMessage();
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    },
    
    // Store file handle in IndexedDB
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
            
            console.log('File handle stored in IndexedDB:', fileName);
        } catch (error) {
            console.error('Error storing file handle:', error);
        }
    },
    
    processLoadedData: function(data, fileName) {
        // Check if it's the correct format
        if (data.games && Array.isArray(data.games)) {
            this.games = data.games;
            this.metadata = data.metadata || null;
            this.currentFileName = fileName;
            
            // Extract available filter options from entries
            this.extractFilterOptions();
            
            // Set default filters (latest year, first user)
            this.setDefaultFilters();
            
            // Populate filter dropdowns
            this.populateFilterDropdowns();
            
            // Show entry filters
            const entryFilters = document.getElementById('entryFilters');
            if (entryFilters) entryFilters.style.display = 'block';
            
            this.filteredGames = [...this.games]; //uses the spread operator (...) to create a shallow copy of the this.games array.
            
            // Update file name display
            const fileNameEl = document.getElementById('currentFileName');
            if (fileNameEl) {
                fileNameEl.textContent = `📄 ${fileName}`;
            }
            
            // Show save button
            /* Changes not made in Meeplewood (yet?)
            const saveBtn = document.getElementById('saveChangesBtn');
            if (saveBtn) {
                saveBtn.style.display = 'inline-block';
            }
            */
            
            // Hide loading screen and show content
            this.hideLoadingScreen();
            
            // Update UI with batch update (includes metadata, counts, and rendering)
            this.batchUpdate();
            
            console.log(`Loaded ${this.games.length} games from ${fileName}`);
        } else {
            this.hideLoadingScreen();
            alert('Invalid file format. Expected JSON with "games" array.');
            this.showNoGamesMessage();
        }
    },
    
    extractFilterOptions: function() {
        const years = new Set();
        const conventions = new Set();
        const users = new Set();
        
        this.games.forEach(game => {
            if (game.entries && Array.isArray(game.entries)) {
                game.entries.forEach(entry => {
                    if (entry.year) years.add(entry.year);
                    if (entry.convention) conventions.add(entry.convention);
                    if (entry.user) users.add(entry.user);
                });
            }
        });
        
        this.availableYears = Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending
        this.availableConventions = Array.from(conventions).sort();
        this.availableUsers = Array.from(users).sort();
    },
    
    setDefaultFilters: function() {
        // Default to latest year (actual year value, not 'Latest' option)
        this.selectedYear = this.availableYears.length > 0 ? this.availableYears[0] : '';
        
        // Default to all conventions
        this.selectedConvention = '';
        
        // Default to first user or all if multiple
        this.selectedUser = this.availableUsers.length === 1 ? this.availableUsers[0] : '';
    },
    
    populateFilterDropdowns: function() {
        // Populate year dropdown
        const yearSelect = document.getElementById('filterYear');
        if (yearSelect) {
            yearSelect.innerHTML = '';
            this.availableYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                if (year === this.selectedYear) {
                    option.selected = true;
                }
                yearSelect.appendChild(option);
            });
        }
        
        // Populate convention dropdown
        const conventionSelect = document.getElementById('filterConvention');
        if (conventionSelect) {
            conventionSelect.innerHTML = '<option value="">All</option>';
            this.availableConventions.forEach(convention => {
                const option = document.createElement('option');
                option.value = convention;
                option.textContent = convention;
                conventionSelect.appendChild(option);
            });
        }
        
        // Populate user dropdown
        const userSelect = document.getElementById('filterUser');
        if (userSelect) {
            userSelect.innerHTML = '<option value="">All</option>';
            this.availableUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                if (this.selectedUser === user) {
                    option.selected = true;
                }
                userSelect.appendChild(option);
            });
        }
    },
    
    handleFilterChange: function(priority) {
        this.currentFilter = priority;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.priority === priority) {
                btn.classList.add('active');
            }
        });
        
        this.batchUpdate();
    },
    
    handleSearch: function(term) {
        this.searchTerm = term.toLowerCase();
        this.batchUpdate();
    },
    
    handleSort: function(sortBy) {
        // Toggle direction if clicking the same sort button
        if (this.sortBy === sortBy) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Otherwise set to asc, except thumbs defaults to desc
            this.sortBy = sortBy;
            this.sortDirection = this.sortBy === 'thumbs' ? 'desc' : 'asc';
        }
        
        // Update button states
        this.updateSortButtonStates();
        
        // Re-render with new sort
        this.renderGames();
    },
    
    updateSortButtonStates: function() {
        const sortByTitle = document.getElementById('sortByTitle');
        const sortByThumbs = document.getElementById('sortByThumbs');
        const sortByPublisher = document.getElementById('sortByPublisher');
        
        if (sortByTitle) {
            sortByTitle.classList.toggle('active', this.sortBy === 'title');
            sortByTitle.innerHTML = this.sortBy === 'title' 
                ? `📝 Title ${this.sortDirection === 'asc' ? '↑' : '↓'}`
                : '📝 Title';
        }
        
        if (sortByThumbs) {
            sortByThumbs.classList.toggle('active', this.sortBy === 'thumbs');
            sortByThumbs.innerHTML = this.sortBy === 'thumbs'
                ? `👍 Thumbs ${this.sortDirection === 'desc' ? '↓' : '↑'}`
                : '👍 Thumbs';
        }

        if (sortByPublisher) {
            sortByPublisher.classList.toggle('active', this.sortBy === 'publisher');
            sortByPublisher.innerHTML = this.sortBy === 'publisher'
                ? `🏢 Publisher ${this.sortDirection === 'asc' ? '↑' : '↓'}`
                : '🏢 Publisher';
        }   
    },
    
    batchUpdate: function() {
        
        // Single pass through data to filter, count, and gather metadata
        const counts = {
            all: 0,
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            'none': 0
        };
        const filteredYears = new Set();
        const filteredConventions = new Set();
        const filteredUsers = new Set();
        const filtered = [];

        // Single iteration through all games
        for (let i = 0; i < this.games.length; i++) {
            const game = this.games[i];
            
            // Check if game has entries
            if (!game.entries || game.entries.length === 0) {
                continue; //ToDO -> Create structure without continue?
            }
            
            // Multiple entries filter
            if (this.showMultipleEntriesOnly && game.entries.length <= 1) {
                continue;
            }
            
            // Unique entries filter
            if (this.showUniqueEntriesOnly && game.entries.length > 1) {
                continue;
            }
            
            // Get the relevant entry for this game
            const relevantEntry = this.getRelevantEntry(game);
            if (!relevantEntry) {
                continue;
            }
            
            // Search filter
            const searchMatch = this.searchTerm === '' ||
                               (game.Title && game.Title.toLowerCase().includes(this.searchTerm)) ||
                               (game.Publisher && game.Publisher.toLowerCase().includes(this.searchTerm)) ||
                               (relevantEntry.location && relevantEntry.location.toLowerCase().includes(this.searchTerm));
            
            if (!searchMatch) {
                continue;
            }
            
            // Game matches all filters except priority - count it
            counts.all++;
            const priority = relevantEntry.priority || '';
            if (priority === '' || !priority || priority === 'N/A' || priority === '0') {
                counts['none']++;
            } else if (counts[priority] !== undefined) {
                counts[priority]++;
            }
            
            // Gather metadata
            filteredYears.add(relevantEntry.year);
            filteredConventions.add(relevantEntry.convention);
            filteredUsers.add(relevantEntry.user);
            
            // Priority filter for display
            const entryPriority = relevantEntry.priority || '';
            const priorityMatch = this.currentFilter === 'all' || 
                                  entryPriority === this.currentFilter;
            
            if (priorityMatch) {
                filtered.push(game);
            }
        }
        
        // Update filtered games
        this.filteredGames = filtered;
        
        // Update counts
        const countAll = document.getElementById('countAll');
        const count1 = document.getElementById('count1');
        const count2 = document.getElementById('count2');
        const count3 = document.getElementById('count3');
        const count4 = document.getElementById('count4');
        const countNone = document.getElementById('countNone');
        
        if (countAll) countAll.textContent = counts.all;
        if (count1) count1.textContent = counts['1'];
        if (count2) count2.textContent = counts['2'];
        if (count3) count3.textContent = counts['3'];
        if (count4) count4.textContent = counts['4'];
        if (countNone) countNone.textContent = counts['none'];
        
        // Update metadata
        this.updateMetadataDisplay(filteredYears, filteredConventions, filteredUsers, counts.all);
        
        // Render games
        this.renderGames();
    },
    
    updateMetadataDisplay: function(filteredYears, filteredConventions, filteredUsers, filteredGameCount) {
        const metadataDisplay = document.getElementById('metadataDisplay');
        console.log('Updating metadata display with filtered counts and sources');
        if (!this.metadata) {
            if (metadataDisplay) metadataDisplay.style.display = 'none';
            return;
        }
    },
    
    clearCache: function() {
        this.relevantEntryCache.clear();
    },
    
    getRelevantEntry: function(game) {
        if (!game.entries || game.entries.length === 0) {
            return null;
        }
        
        // Check cache first
        // Use BGGVersionId as primary key to distinguish different versions of the same game
        const gameKey = game.BGGVersionId || game.BGGId || game.Title;
        const cacheKey = `${gameKey}-${this.selectedYear}-${this.selectedConvention}-${this.selectedUser}`;
        if (this.relevantEntryCache.has(cacheKey)) {
            return this.relevantEntryCache.get(cacheKey);
        }
        
        // Filter entries based on selected filters AND version ID
        let matchingEntries = game.entries.filter(entry => {
            const yearMatch = this.selectedYear === '' || entry.year === this.selectedYear;
            const conventionMatch = this.selectedConvention === '' || entry.convention === this.selectedConvention;
            const userMatch = this.selectedUser === '' || entry.user === this.selectedUser;
            // Ensure entry belongs to this specific version of the game
            const versionMatch = !entry.versionId || !game.BGGVersionId || entry.versionId === game.BGGVersionId;
            
            return yearMatch && conventionMatch && userMatch && versionMatch;
        });
        
        if (matchingEntries.length === 0) {
            this.relevantEntryCache.set(cacheKey, null);
            return null;
        }
        
        /* Not possible/needed (anymore) since we don't have a "Latest" option in the year dropdown
        // If year is not specified, get the latest year
        if (this.selectedYear === '') {
            const latestYear = Math.max(...matchingEntries.map(e => parseInt(e.year) || 0));
            matchingEntries = matchingEntries.filter(e => parseInt(e.year) === latestYear);
        }
        */
        
        // Return the first matching entry (or most recent if multiple)
        const result = matchingEntries.sort((a, b) => 
            (b.lastModified || b.insertedDate).localeCompare(a.lastModified || a.insertedDate)
        )[0];
        
        // Cache the result
        this.relevantEntryCache.set(cacheKey, result);
        return result;
    },
    
    renderGames: function() {
        console.log('Rendering games with current filters and sort settings',this.filteredGames);
        const grid = document.getElementById('spielGrid');
        const noGamesMsg = document.getElementById('noGamesMessage');
        
        if (this.games.length === 0) {
            if (noGamesMsg) noGamesMsg.style.display = 'block';
            if (grid) grid.style.display = 'none';
            return;
        }
        
        if (noGamesMsg) noGamesMsg.style.display = 'none';
        if (grid) grid.style.display = 'grid';
        
        if (this.filteredGames.length === 0) {
            grid.innerHTML = '<div class="no-results"><p>No games match your filters</p></div>';
            return;
        }
        
        // Sort the filtered games
        this.sortFilteredGames();
        
        // Performance optimization: For large datasets, render in batches
        if (this.filteredGames.length > 500) {
            this.renderGamesInBatches(grid);
        } else {
            grid.innerHTML = this.filteredGames.map(game => this.createGameCard(game)).join('');
        }
        
        // Event listeners are handled by event delegation in attachEventListeners
    },
    
    sortFilteredGames: function() {
        if (this.sortBy === 'title') {
            this.filteredGames.sort((a, b) => {
                const titleA = (a.Title || '').toLowerCase();
                const titleB = (b.Title || '').toLowerCase();
                return this.sortDirection === 'asc' 
                    ? titleA.localeCompare(titleB)
                    : titleB.localeCompare(titleA);
            });
        } else if (this.sortBy === 'thumbs') {
            this.filteredGames.sort((a, b) => {
                const entryA = this.getRelevantEntry(a);
                const entryB = this.getRelevantEntry(b);
                const thumbsA = parseInt(entryA.thumbs) || 0;
                const thumbsB = parseInt(entryB.thumbs) || 0;
                return this.sortDirection === 'desc'
                    ? thumbsB - thumbsA
                    : thumbsA - thumbsB;
            });
        } else if (this.sortBy === 'publisher') {
            this.filteredGames.sort((a, b) => {
                const publisherA = (a.Publisher || '').toLowerCase();
                const publisherB = (b.Publisher || '').toLowerCase();
                return this.sortDirection === 'asc' 
                    ? publisherA.localeCompare(publisherB)
                    : publisherB.localeCompare(publisherA);
            });
        }
    },
    
    renderGamesInBatches: function(grid) {
        // Clear the grid first
        grid.innerHTML = '<div class="loading-more"><p>Rendering games...</p></div>';
        
        const BATCH_SIZE = 100;
        let currentIndex = 0;
        
        const renderBatch = () => {
            const fragment = document.createDocumentFragment();
            const endIndex = Math.min(currentIndex + BATCH_SIZE, this.filteredGames.length);
            
            // Create a temporary container to parse HTML
            const temp = document.createElement('div');
            const htmlChunks = [];
            
            for (let i = currentIndex; i < endIndex; i++) {
                htmlChunks.push(this.createGameCard(this.filteredGames[i]));
            }
            
            temp.innerHTML = htmlChunks.join('');
            
            // Move all children to fragment
            while (temp.firstChild) {
                fragment.appendChild(temp.firstChild);
            }
            
            // If this is the first batch, clear the loading message
            if (currentIndex === 0) {
                grid.innerHTML = '';
            }
            
            grid.appendChild(fragment);
            currentIndex = endIndex;
            
            // Continue rendering if there are more items
            if (currentIndex < this.filteredGames.length) {
                requestAnimationFrame(renderBatch);
            }
        };
        
        // Start rendering
        requestAnimationFrame(renderBatch);
    },
    
    createGameCard: function(game) {
        // Get the relevant entry for this view
        const currentEntry = this.getRelevantEntry(game);
        if (!currentEntry) return '';
        
        const priorityClass = `priority-${currentEntry.priority || 'none'}`;
        const priorityLabel = this.getPriorityLabel(currentEntry.priority);
        const bggLink = game.BGGId ? `https://boardgamegeek.com/boardgame/${game.BGGId}` : '';
        
        // Get BGG data if available
        const bggData = game.BGGId && window.GameDatabase ? window.GameDatabase.cache[game.BGGId] : null;
        
        // Build BGG info section
        let bggInfoHtml = '';
        if (bggData && bggData.rating) {
            const rating = bggData.rating.average ? bggData.rating.average.toFixed(1) : 'N/A';
            const weight = bggData.weight ? bggData.weight.toFixed(1) : 'N/A';
            const players = bggData.minPlayers && bggData.maxPlayers ? 
                `${bggData.minPlayers}-${bggData.maxPlayers}` : 'N/A';
            const playTime = bggData.playingTime || 'N/A';
            
            bggInfoHtml = `
                <div class="bgg-info" style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                    <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                        <span title="BGG Rating">⭐ ${rating}</span>
                        <span title="Complexity (1-5)">🧩 ${weight}</span>
                        <span title="Players">👥 ${players}</span>
                        <span title="Play Time (min)">⏱️ ${playTime}</span>
                    </div>
                </div>
            `;
        }
        
        // Get historical entries if enabled
        let historicalEntriesHtml = '';
        if (this.showHistoricalEntries && game.entries && game.entries.length > 0) {
            historicalEntriesHtml = this.createHistoricalEntriesHtml(game, currentEntry);
        }
        
        return `
            <div class="spiel-card ${priorityClass}">
                <div class="card-header">
                    <h3 class="game-title">${this.escapeHtml(game.Title || 'Untitled')}</h3>
                    ${bggLink ? `<a href="${bggLink}" target="_blank" class="bgg-link" title="View on BGG"><img src="img/BGG_Logo.png" alt="BGG" class="small-icon"/></a>` : ''}
                </div>                
                <div class="card-body">
                    <div class="game-info">
                        <div class="info-row">
                                <span class="value">🏢 ${this.escapeHtml(game.Publisher || '?')}</span>
                        </div>
                        <div class="info-row">
                             ${game.Type ? `<span class="value">${this.escapeHtml(game.Type)}</span>` : ''}
                            <span class="label">Release:</span>
                            <span class="value">${this.escapeHtml(currentEntry.overrideReleaseDate || currentEntry.releaseDate)}</span>
                        </div>
                    </div>
                    
                    ${bggInfoHtml}
                    
                    <div class="entry-title">
                        <div class="entry-header">
                            <h4>${currentEntry.convention} ${currentEntry.year}</h4>
                            <span class=\"entry-priority ${priorityClass}\">${priorityLabel}</span>
                        </div>
                        <div class="info-row">
                            <span class="value">👍${this.escapeHtml(currentEntry.thumbs)}</span>
                        </div>                    
                        <div class="info-row">
                            <span class="label">Notes:</span>
                            <span class="value" data-game-id="${game.BGGVersionId || game.BGGId || game.Title}" data-entry-key="${currentEntry.year}-${currentEntry.convention}-${currentEntry.user}">${this.escapeHtml(currentEntry.notes || '')}</span>
                        </div>
                    </div>
                    
                    ${historicalEntriesHtml}
                </div>
            </div>
        `;
    },
    
    createHistoricalEntriesHtml: function(game, currentEntry) {
        if (!game.entries || game.entries.length <= 1) {
            return '';
        }
        
        // Sort entries by year (descending) then by lastModified
        const sortedEntries = [...game.entries].sort((a, b) => {
            const yearDiff = (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
            if (yearDiff !== 0) return yearDiff;
            return (b.lastModified || b.insertedDate).localeCompare(a.lastModified || a.insertedDate);
        });
        
        const entriesHtml = sortedEntries.map(entry => {
            const isCurrent = entry === currentEntry;
            if (isCurrent) return ''; // Skip current entry in historical list
            const priorityLabel = this.getPriorityLabel(entry.priority);
            
            const insertedDate = new Date(entry.insertedDate).toLocaleDateString();
            const modifiedDate = entry.lastModified !== entry.insertedDate ? 
                `Modified: ${new Date(entry.lastModified).toLocaleDateString()}` : '';
            
            return `
                <div class="historical-entry">
                    <div class="entry-header">
                        <div class="entry-meta">
                            <strong>${entry.year}</strong> ${this.escapeHtml(entry.convention)} - ${entry.thumbs ? `👍${this.escapeHtml(entry.thumbs)}` : ''}
                            <br>${this.escapeHtml(entry.user)}    
                        </div>
                        <span class=\"entry-priority priority-${entry.priority || 'none'}\">${priorityLabel}</span>
                    </div>
                    <div class="entry-details">                        
                        ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> "${this.escapeHtml(entry.notes)}"</div>` : ''}                        
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="historical-entries">
                <h4>📅 Other Entries (${game.entries.length - 1})</h4>
                ${entriesHtml}
            </div>
        `;
    },
    
    getPriorityLabel: function(priority) {
        const labels = {
            '1': 'Must Have',
            '2': 'Interested',
            '3': 'Undecided',
            '4': 'Not Interested',
            '0': 'Not Prioritized',
            '': 'Not Prioritized',
            'N/A': 'Not Prioritized'
        };
        return labels[priority] || 'Not Prioritized';
    },
    
    updateGamePriority: function(gameId, entryKey, priority) {
        // Find the game by BGGVersionId (primary), BGGId, or Title
        const game = this.games.find(g => (g.BGGVersionId || g.BGGId || g.Title) === gameId);
        if (!game || !game.entries) return;
        
        // Parse entry key (format: year-convention-user)
        const [year, convention, user] = entryKey.split('-');
        
        // Find and update the entry
        const entry = game.entries.find(e => 
            e.year === year && e.convention === convention && e.user === user
        );
        
        if (entry) {
            entry.priority = priority;
            entry.lastModified = new Date().toISOString();
            
            // Clear cache since priority changed
            this.clearCache();
            this.batchUpdate();
        }
    },
    
    updateGameNotes: function(gameId, entryKey, notes) {
        // Find the game by BGGVersionId (primary), BGGId, or Title
        const game = this.games.find(g => (g.BGGVersionId || g.BGGId || g.Title) === gameId);
        if (!game || !game.entries) return;
        
        // Parse entry key (format: year-convention-user)
        const [year, convention, user] = entryKey.split('-');
        
        // Find and update the entry
        const entry = game.entries.find(e => 
            e.year === year && e.convention === convention && e.user === user
        );
        
        if (entry) {
            entry.notes = notes;
            entry.lastModified = new Date().toISOString();
        }
    },
    
    exportUpdatedJson: async function() {
        if (this.games.length === 0) {
            alert('No games loaded. Please load a Spiel preview file first.');
            return;
        }
        
        // Create export data with updated metadata
        const exportData = {
            metadata: {
                ...this.metadata,
                lastUpdated: new Date().toISOString(),
                totalGames: this.games.length
            },
            games: this.games
        };
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        const filename = this.currentFileName || 'GeekPreview-Combined.json';
        
        // Try File System Access API (Chrome, Edge, Opera)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    startIn: 'downloads',  // Change to 'documents', 'desktop', etc. (browser only allows these preset folders)
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await handle.createWritable();
                await writable.write(jsonContent);
                await writable.close();
                
                alert(`Changes saved to ${filename}!\n\nYour updated priorities and notes have been exported.`);
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    // User cancelled, do nothing
                    return;
                }
                console.log('File System Access API failed, falling back to download:', err);
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
        
        alert(`Changes saved to ${filename}!\n\nYour updated priorities and notes have been exported.`);
    },
    
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpielPreviewPage;
}
