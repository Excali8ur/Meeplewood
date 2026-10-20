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

const GeekPreviewPage = {
    games: [],
    filteredGames: [],
    selectedPriorityFilters: new Set(),
    searchTerm: '',
    metadata: null,
    currentFileName: null,
    dbName: 'MeeplewoodDB',
    dbVersion: 2,
    
    // Filter settings
    selectedYear: '', // '' = latest
    selectedConvention: '',
    selectedUser: '',
    showHistoricalEntries: true,
    availabilityFilter: 'any', // 'any', 'demo', 'forsale'
    typeFilter: 'any', // 'any', 'standalone', 'expansion'
    entriesFilter: 'any', // 'any', 'multiple', 'single'
    otherUsersFilter: 'show', // 'show', 'hide'

    // Sort settings
    sortBy: 'title', // 'title', 'thumbs', 'publisher'
    sortDirection: 'asc', // 'asc' or 'desc'
    
    // Available filter options
    availableYears: [],
    availableConventions: [],
    availableUsers: [],
    allPriorityFilters: ['1', '2', '3', '4', ''],
    
    // Performance: Cache for relevant entries
    relevantEntryCache: new Map(),
    
    init: async function() {
        console.log('Geek Preview page initialized');
        this.attachEventListeners();
        this.updateSortButtonStates(); // Initialize sort button states
        this.renderGames();
        
        // Show loading screen and hide other elements initially
        this.showLoadingScreen();
        
        // Try to auto-load the default file
        this.autoLoadDefaultFile();
    },
    
    // Open indexedDB connection (shared with settings.js)
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
    
    // Retrieve file handles from indexedDB
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
        let defaultPreviewPath = 'data/GeekPreview-Combined.json'; // fallback default
        
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.defaultPreviewPath) {
                    defaultPreviewPath = settings.defaultPreviewPath;
                }
            } catch (error) {
                console.log('Error parsing settings, using default path');
            }
        }
        
        // Check if it's a local file (stored in indexedDB)
        if (defaultPreviewPath.startsWith('local:')) {
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
            console.log('Could not load local file, please go to settings to select a different file.');
            this.showNoGamesMessage();
            return;
        }
        
        // Try to fetch from server (for web-hosted files)
        try {
            const response = await fetch(defaultPreviewPath);
            if (!response.ok) {
                throw new Error('Default file not found');
            }
            const data = await response.json();
            this.processLoadedData(data, defaultPreviewPath.split('/').pop());
            console.log(`Auto-loaded ${defaultPreviewPath}`);
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
        
        this.attachSegmentedControls();

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
    },

    // Segmented single-choice controls: each [data-filter] maps to a "<name>Filter" property
    attachSegmentedControls: function() {
        document.querySelectorAll('.segmented[data-filter]').forEach(group => {
            const prop = `${group.dataset.filter}Filter`;
            group.addEventListener('click', (e) => {
                const btn = e.target.closest('.segmented-btn');
                if (!btn || !group.contains(btn)) return;
                this[prop] = btn.dataset.value;
                group.querySelectorAll('.segmented-btn').forEach(b => b.classList.toggle('active', b === btn));
                this.clearCache();
                this.batchUpdate();
            });
        });
    },
    
    // Store file handle in indexedDB
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
            
            // Hide loading screen and show content
            this.hideLoadingScreen();            
            // Update UI with batch update (includes metadata, counts, and rendering)
            this.batchUpdate();
            
            console.log(`Processed ${fileName}\nFound games: ${this.games.length}\nLoaded after filtering: ${this.filteredGames.length}`);
        } else {
            this.hideLoadingScreen();
            alert('Invalid file format. Expected JSON with "games" array.');
            this.showNoGamesMessage();
        }
    },
    
    extractFilterOptions: function() {
        const years = new Set();
        const conventions = new Set();
        const user_list = new Set();
        
        this.games.forEach(game => {
            if (game.entries && Array.isArray(game.entries)) {
                game.entries.forEach(entry => {
                    if (entry.year) years.add(entry.year);
                    if (entry.convention) conventions.add(entry.convention);
                    if (entry.users && Array.isArray(entry.users)) {
                        entry.users.forEach(u => user_list.add(u.user));
                    }
                });
            }
        });
        
        this.availableYears = Array.from(years).sort((a, b) => b.localeCompare(a)); // Descending
        this.availableConventions = Array.from(conventions).sort();
        this.availableUsers = Array.from(user_list).sort();
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
        
        // The "All" option and the other-users toggle only make sense with multiple users
        const multipleUsers = this.availableUsers.length > 1;
        const otherUsersGroup = document.getElementById('otherUsersGroup');
        if (otherUsersGroup) otherUsersGroup.style.display = multipleUsers ? '' : 'none';
        if (!multipleUsers) this.otherUsersFilter = 'show';

        // Populate user dropdown
        const userSelect = document.getElementById('filterUser');
        if (userSelect) {
            userSelect.innerHTML = multipleUsers ? '<option value="">All</option>' : '';
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
        // "All" clears any specific priority filters.
        if (priority === 'all') {
            this.selectedPriorityFilters.clear();
        } else if (this.selectedPriorityFilters.has(priority)) {
            this.selectedPriorityFilters.delete(priority);
        } else {
            this.selectedPriorityFilters.add(priority);
        }

        // If all specific priorities are selected, treat it as "All".
        const hasAllSpecificPriorities = this.allPriorityFilters.every((filterValue) =>
            this.selectedPriorityFilters.has(filterValue)
        );
        if (hasAllSpecificPriorities) {
            this.selectedPriorityFilters.clear();
        }
        
        // Update active button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.dataset.priority === 'all') {
                btn.classList.toggle('active', this.selectedPriorityFilters.size === 0);
            } else {
                btn.classList.toggle('active', this.selectedPriorityFilters.has(btn.dataset.priority));
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
    
    //Filtering out games according to the current settings on Game level before checking entries.
    isRelevantGame: function(game) {
        // Check if game has entries
        if (!game.entries || game.entries.length === 0) return false;

        if (this.entriesFilter === 'multiple' && game.entries.length <= 1) return false;
        if (this.entriesFilter === 'single' && game.entries.length > 1) return false;

        const isExpansion = (game.Type || '').toLowerCase() === 'expansion';
        if (this.typeFilter === 'expansion' && !isExpansion) return false;
        if (this.typeFilter === 'standalone' && isExpansion) return false;

        // Check if a search term is provided and if it matches the game name, publisher, or any exhibitor's publisher.
        if (this.searchTerm !== '' && !(            
            (game.Name && game.Name.toLowerCase().includes(this.searchTerm)) ||
            (game.Publisher && game.Publisher.toLowerCase().includes(this.searchTerm)) ||
            (game.entries.some(e => (e.exhibitors || []).some(x => (x.publisher || '').toLowerCase().includes(this.searchTerm))))
           )) {
            return false;
        }

        //Check if there is an entry for the selected year, convention, and user. If not, the game is not relevant.
        const hasRelevantEntry = game.entries.some(entry => {
            const yearMatch = this.selectedYear === '' || entry.year === this.selectedYear;
            const conventionMatch = this.selectedConvention === '' || entry.convention === this.selectedConvention;
            const userMatch = this.selectedUser === '' || entry.users.some(u => u.user === this.selectedUser);
            return yearMatch && conventionMatch && userMatch;
        });
        if (!hasRelevantEntry) return false;

        // Check if the entry for the selected year is a demo
        for (let entry of game.entries) {            
            if (this.selectedYear === '' || entry.year === this.selectedYear) {
                const isDemo = (entry.availability || '').toLowerCase() === 'demo';
                if (this.availabilityFilter === 'demo' && !isDemo) return false;
                if (this.availabilityFilter === 'forsale' && isDemo) return false;
            }
        }        

        // If all checks passed, the game is relevant
        return true;
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

            if (this.isRelevantGame(game)) {
                // Get the relevant entry for this game
                const relevantEntry = this.getRelevantEntry(game);
                if (relevantEntry) {                
                    // Game matches all filters (priority not yet considered)
                    counts.all++;
                    const priority = this.getPriorityKey(relevantEntry);
                    if (priority === '') {
                        counts['none']++;
                    } else if (counts[priority] !== undefined) {
                        counts[priority]++;
                    }
                    
                    // Gather metadata
                    filteredYears.add(relevantEntry.year);
                    filteredConventions.add(relevantEntry.convention);
                    (relevantEntry.users || []).forEach(u => filteredUsers.add(u.user));
                    
                    // Priority filter for display
                    const entryPriority = this.getPriorityKey(relevantEntry);
                    const priorityMatch = this.selectedPriorityFilters.size === 0 ||
                        this.selectedPriorityFilters.has(entryPriority);
                    
                    if (priorityMatch) {
                        filtered.push(game);
                    }
                }
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
        //console.log('Updating metadata display with filtered counts and sources');
        if (!this.metadata) {
            if (metadataDisplay) metadataDisplay.style.display = 'none';
            return;
        }
    },
    
    clearCache: function() {
        this.relevantEntryCache.clear();
    },
    
    getRelevantEntry: function(game) {
        if (!game.entries || game.entries.length === 0) return null;
        
        // Check cache first
        // Use BGGVersionId as primary key to distinguish different versions of the same game
        const gameKey = game.BGGVersionId || game.BGGId || game.Name;
        const cacheKey = `${gameKey}-${this.selectedYear}-${this.selectedConvention}-${this.selectedUser}`;
        if (this.relevantEntryCache.has(cacheKey)) {
            return this.relevantEntryCache.get(cacheKey);
        }
        
        // Filter entries based on selected filters AND version ID
        let matchingEntries = game.entries.filter(entry => {
            const yearMatch = this.selectedYear === '' || entry.year === this.selectedYear;
            const conventionMatch = this.selectedConvention === '' || entry.convention === this.selectedConvention;
            const userMatch = this.selectedUser === '' || entry.users.some(u => u.user === this.selectedUser);
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
        //console.log('Rendering games with current filters and sort settings',this.filteredGames);
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
                const titleA = (a.Name || '').toLowerCase();
                const titleB = (b.Name || '').toLowerCase();
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
        
        const priorityClass = `priority-${this.getPriorityKey(currentEntry) || 'none'}`;
        const priorityLabel = this.getPriorityLabel(currentEntry);
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
        if (this.showHistoricalEntries && game.entries && game.entries.length > 1) {
            historicalEntriesHtml = this.createHistoricalEntriesHtml(game, currentEntry);
        }
        
        return `
            <div class="spiel-card ${priorityClass}">
                <div class="card-header">                    
                    <h3 class="game-title">${this.escapeHtml(game.Name || 'Untitled')}</h3>                    
                    ${game.Type ? game.Type == 'Expansion' ? `<span class="value"><img src="img/icons/${this.escapeHtml(game.Type)}.png" alt="Expansion" title="Expansion" class="small-icon small-icon-img" /></span>` : '' : ''}
                    ${bggLink ? `<a href="${bggLink}" target="_blank" class="bgg-link" title="View on BGG"><img src="img/BGG_Logo.png" alt="BGG" class="small-icon"/></a>` : ''}
                </div>                
                <div class="card-body">
                    <div class="game-info">
                        <div class="info-row">
                            <span class="value">🏢 ${game.Publisher
                                //this.getPublishersHtml(game, currentEntry)}</span>
                            }
                        </div>
                        ${game.Version ? 
                            `<div class="info-row">
                                <span class="label">Version:</span>
                                <span class="value">${this.escapeHtml(game.Version)}</span>
                            </div>` : ''}
                    </div>
                    
                    ${bggInfoHtml}
                    
                    <div class="entry-title">
                        <div class="entry-header">
                            <h4>${currentEntry.convention} ${currentEntry.year}</h4>
                            <span class=\"entry-priority ${priorityClass}\">${priorityLabel}</span>
                        </div>
                        <div class="info-row">                            
                            <span class="label">👍 ${this.escapeHtml(currentEntry.thumbs)}</span>
                            <span class="value">📍 ${this.escapeHtml((currentEntry.exhibitors || []).map(x => x.location).filter(Boolean).join(', ') || '?')}</span>                        
                            ${currentEntry.availability.toLowerCase() === 'demo' ?                             
                                    `<span class="value">📝 Demo </span>
                                </div>
                                <div class="info-row"> 
                                    <span class="label"></span><span class="value"></span>
                                    <span class="value">
                                    🗓️ ${currentEntry.releaseDate || '?'}</span>`
                            : `<span class="value">💰 For Sale</span>`}                              
                        </div>
                        <div class="info-row">
                            <span class="label">Notes:</span>
                            <span class="value" data-game-id="${game.BGGVersionId || game.BGGId || game.Name}" data-entry-key="${currentEntry.year}-${currentEntry.convention}-${this.escapeHtml(this.getUserData(currentEntry).user || '')}">${this.escapeHtml(this.getUserData(currentEntry).notes || '')}</span>
                        </div>
                    </div>
                    ${this.getOtherUsersHtml(currentEntry)}
                    
                    ${historicalEntriesHtml}
                </div>
            </div>
        `;
    },
    
    // Interest/notes of every user on the entry except the one shown in the main card
    getOtherUsersHtml: function(entry) {
        if (this.otherUsersFilter === 'hide') return '';
        const shown = this.getUserData(entry).user;
        const others = (entry.users || []).filter(u => u.user !== shown);
        if (others.length === 0) return '';
        return `<div class="entry-users">${others.map(u => this.getUserHtml(u)).join('')}</div>`;
    },

    getUserHtml: function(u) {
        const key = Object.keys(this.interestByKey).find(k => this.interestByKey[k] === u.interest) || '';
        return `
            <div class="info-row entry-user">
                <span class="label">User:</span>
                <span class="value">${this.escapeHtml(u.user || '')}</span>
                <span class="entry-priority priority-${key || 'none'}" style="margin-left: auto;">${this.escapeHtml(u.interest || 'Not Prioritized')}</span>
            </div>
            ${u.notes ? `<div class="info-row">
                <span class="label">Notes:</span>
                <span class="value">${this.escapeHtml(u.notes)}</span>
            </div>` : ''}`;
    },

    // All distinct exhibitors (with booth location if available) for the entry
    getPublishersHtml: function(game, entry) {
        const exhibitors = entry && Array.isArray(entry.exhibitors) ? entry.exhibitors : [];
        return exhibitors.map(x =>
            (x.location ? ` <small>📍${this.escapeHtml(x.location)}</small>` : '') + ` - 🏢 ${this.escapeHtml(x.publisher)}`
        ).join('<br>');
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
            if (entry === currentEntry) return ''; // Skip current entry in historical list
            let users = entry.users || [];
            if (this.otherUsersFilter === 'hide') {
                const shown = this.getUserData(entry).user;
                users = users.filter(u => u.user === shown);
            }
            const usersHtml = users.map(u => this.getUserHtml(u)).join('');
            
            return `
                <div class="historical-entry">
                    <div class="entry-header">
                        <div class="entry-meta"><strong>${this.escapeHtml(entry.convention)} ${this.escapeHtml(entry.year)}</strong>${entry.thumbs ? ` - 👍${this.escapeHtml(entry.thumbs)}` : ''}</div>
                    </div>
                    <div class="entry-details">
                        <div class="entry-notes">${this.getPublishersHtml(game, entry)}</div>
                        <div class="entry-notes">${(entry.availability || '').toLowerCase() === 'demo' ? `📝 Demo` : `💰 For Sale`}</div>
                    </div>
                    <div class="entry-users">${usersHtml}</div>
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
    
    interestByKey: { '1': 'Must Have', '2': 'Interested', '3': 'Undecided', '4': 'Not Interested' },

    // Filter/CSS key ('1'-'4' or '') derived from the entry's BGG "Interest" string
    getPriorityKey: function(entry) {
        const interest = this.getUserData(entry).interest;
        return Object.keys(this.interestByKey).find(k => this.interestByKey[k] === interest) || '';
    },

    // The interest string is shown as-is; empty means not prioritized
    getPriorityLabel: function(entry) {
        return this.getUserData(entry).interest || 'Not Prioritized';
    },

    // Per-user data (interest, notes) of an entry: the selected user's, or the first user's when "All"
    getUserData: function(entry) {
        const users = entry && Array.isArray(entry.users) ? entry.users : [];
        if (this.selectedUser !== '') {
            return users.find(u => u.user === this.selectedUser) || {};
        }
        return users[0] || {};
    },
    
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeekPreviewPage;
}
