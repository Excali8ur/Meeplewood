// Spiel Preview Page Module

const SpielPreviewPage = {
    games: [],
    filteredGames: [],
    currentFilter: 'all',
    searchTerm: '',
    metadata: null,
    currentFileName: null,
    
    // Filter settings
    selectedYear: '', // '' = latest
    selectedConvention: '',
    selectedUser: '',
    showHistoricalEntries: true,
    showMultipleEntriesOnly: false,
    
    // Available filter options
    availableYears: [],
    availableConventions: [],
    availableUsers: [],
    
    init: function() {
        console.log('Spiel Preview page initialized');
        this.attachEventListeners();
        this.renderGames();
        
        // Try to auto-load the default file
        this.autoLoadDefaultFile();
    },
    
    autoLoadDefaultFile: function() {
        const defaultPath = 'data/SPIEL-Combined.json';
        
        fetch(defaultPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Default file not found');
                }
                return response.json();
            })
            .then(data => {
                this.processLoadedData(data, 'SPIEL-Combined.json');
                console.log('Auto-loaded SPIEL-Combined.json from data folder');
            })
            .catch(error => {
                console.log('Default file not found, waiting for manual load');
            });
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
        
        // Entry filter controls
        const filterYear = document.getElementById('filterYear');
        if (filterYear) {
            filterYear.addEventListener('change', (e) => {
                this.selectedYear = e.target.value;
                this.applyFilters();
                this.updateCounts();
                this.displayMetadata();
                this.renderGames();
            });
        }
        
        const filterConvention = document.getElementById('filterConvention');
        if (filterConvention) {
            filterConvention.addEventListener('change', (e) => {
                this.selectedConvention = e.target.value;
                this.applyFilters();
                this.updateCounts();
                this.displayMetadata();
                this.renderGames();
            });
        }
        
        const filterUser = document.getElementById('filterUser');
        if (filterUser) {
            filterUser.addEventListener('change', (e) => {
                this.selectedUser = e.target.value;
                this.applyFilters();
                this.updateCounts();
                this.displayMetadata();
                this.renderGames();
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
        if (showMultipleOnly) {
            showMultipleOnly.addEventListener('change', (e) => {
                this.showMultipleEntriesOnly = e.target.checked;
                this.applyFilters();
                this.updateCounts();
                this.displayMetadata();
                this.renderGames();
            });
        }
        
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.closest('.filter-btn').dataset.priority);
            });
        });
        
        // Search input
        const searchInput = document.getElementById('spielSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }
    },
    
    loadSpielFile: function() {
        console.log('Loading Spiel Preview JSON file');
        
        // Try to load the default file first
        const defaultPath = 'data/SPIEL-Combined.json';
        
        fetch(defaultPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Default file not found');
                }
                return response.json();
            })
            .then(data => {
                this.processLoadedData(data, 'SPIEL-Combined.json');
            })
            .catch(error => {
                console.log('Default file not found, opening file picker:', error);
                this.openFilePicker();
            });
    },
    
    openFilePicker: function() {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        this.processLoadedData(data, file.name);
                    } catch (error) {
                        console.error('Error parsing JSON file:', error);
                        alert('Error parsing JSON file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
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
            
            this.filteredGames = [...this.games];
            
            // Update file name display
            const fileNameEl = document.getElementById('currentFileName');
            if (fileNameEl) {
                fileNameEl.textContent = `📄 ${fileName}`;
            }
            
            // Show save button
            const saveBtn = document.getElementById('saveChangesBtn');
            if (saveBtn) {
                saveBtn.style.display = 'inline-block';
            }
            
            // Show metadata
            this.displayMetadata();
            
            // Update UI
            this.applyFilters();
            this.updateCounts();
            this.renderGames();
            
            console.log(`Loaded ${this.games.length} games from ${fileName}`);
        } else {
            alert('Invalid file format. Expected JSON with "games" array.');
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
        // Default to latest year
        this.selectedYear = '';
        
        // Default to all conventions
        this.selectedConvention = '';
        
        // Default to first user or all if multiple
        this.selectedUser = this.availableUsers.length === 1 ? this.availableUsers[0] : '';
    },
    
    populateFilterDropdowns: function() {
        // Populate year dropdown
        const yearSelect = document.getElementById('filterYear');
        if (yearSelect) {
            yearSelect.innerHTML = '<option value="">Latest</option>';
            this.availableYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
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
    
    displayMetadata: function() {
        const metadataDisplay = document.getElementById('metadataDisplay');
        
        if (!this.metadata) {
            if (metadataDisplay) metadataDisplay.style.display = 'none';
            return;
        }
        
        if (metadataDisplay) metadataDisplay.style.display = 'block';
        
        // Update metadata fields with summary info
        const metaConvention = document.getElementById('metaConvention');
        const metaYear = document.getElementById('metaYear');
        const metaUser = document.getElementById('metaUser');
        const metaGameCount = document.getElementById('metaGameCount');
        const metaNotes = document.getElementById('metaNotes');
        
        // Calculate filtered data
        const filteredYears = new Set();
        const filteredConventions = new Set();
        const filteredUsers = new Set();
        let filteredGameCount = 0;
        
        this.games.forEach(game => {
            if (!game.entries || game.entries.length === 0) {
                return;
            }
            
            // Multiple entries filter
            if (this.showMultipleEntriesOnly && game.entries.length <= 1) {
                return;
            }
            
            // Get the relevant entry for this game
            const relevantEntry = this.getRelevantEntry(game);
            if (!relevantEntry) {
                return;
            }
            
            // Search filter
            const searchMatch = this.searchTerm === '' ||
                               (game.Title && game.Title.toLowerCase().includes(this.searchTerm)) ||
                               (game.Publisher && game.Publisher.toLowerCase().includes(this.searchTerm)) ||
                               (game.Location && game.Location.toLowerCase().includes(this.searchTerm));
            
            if (!searchMatch) {
                return;
            }
            
            // This game matches all filters
            filteredGameCount++;
            filteredYears.add(relevantEntry.year);
            filteredConventions.add(relevantEntry.convention);
            filteredUsers.add(relevantEntry.user);
        });
        
        // Show filtered conventions, years, and users
        if (metaConvention) {
            metaConvention.textContent = Array.from(filteredConventions).sort().join(', ') || '-';
        }
        if (metaYear) {
            metaYear.textContent = Array.from(filteredYears).sort().join(', ') || '-';
        }
        if (metaUser) {
            metaUser.textContent = Array.from(filteredUsers).sort().join(', ') || '-';
        }
        if (metaGameCount) {
            metaGameCount.textContent = filteredGameCount;
        }
        
        if (metaNotes) {
            if (this.metadata.sources && this.metadata.sources.length > 0) {
                const sourceInfo = this.metadata.sources.map(s => 
                    `${s.year} ${s.convention} (${s.user})`
                ).join(', ');
                metaNotes.innerHTML = `<strong>Data sources:</strong> ${this.escapeHtml(sourceInfo)}`;
                metaNotes.style.display = 'block';
            } else {
                metaNotes.style.display = 'none';
            }
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
        
        this.applyFilters();
        this.displayMetadata();
        this.renderGames();
    },
    
    handleSearch: function(term) {
        this.searchTerm = term.toLowerCase();
        this.applyFilters();
        this.updateCounts();
        this.displayMetadata();
        this.renderGames();
    },
    
    applyFilters: function() {
        this.filteredGames = this.games.filter(game => {
            // Check if game has entries
            if (!game.entries || game.entries.length === 0) {
                return false;
            }
            
            // Multiple entries filter
            if (this.showMultipleEntriesOnly && game.entries.length <= 1) {
                return false;
            }
            
            // Get the relevant entry for this game based on filters
            const relevantEntry = this.getRelevantEntry(game);
            if (!relevantEntry) {
                return false;
            }
            
            // Priority filter
            const entryPriority = relevantEntry.priority || '';
            const priorityMatch = this.currentFilter === 'all' || 
                                  entryPriority === this.currentFilter;
            
            // Search filter
            const searchMatch = this.searchTerm === '' ||
                               (game.Title && game.Title.toLowerCase().includes(this.searchTerm)) ||
                               (game.Publisher && game.Publisher.toLowerCase().includes(this.searchTerm)) ||
                               (game.Location && game.Location.toLowerCase().includes(this.searchTerm));
            
            return priorityMatch && searchMatch;
        });
    },
    
    getRelevantEntry: function(game) {
        if (!game.entries || game.entries.length === 0) {
            return null;
        }
        
        // Filter entries based on selected filters
        let matchingEntries = game.entries.filter(entry => {
            const yearMatch = this.selectedYear === '' || entry.year === this.selectedYear;
            const conventionMatch = this.selectedConvention === '' || entry.convention === this.selectedConvention;
            const userMatch = this.selectedUser === '' || entry.user === this.selectedUser;
            
            return yearMatch && conventionMatch && userMatch;
        });
        
        if (matchingEntries.length === 0) {
            return null;
        }
        
        // If year is not specified, get the latest year
        if (this.selectedYear === '') {
            const latestYear = Math.max(...matchingEntries.map(e => parseInt(e.year) || 0));
            matchingEntries = matchingEntries.filter(e => parseInt(e.year) === latestYear);
        }
        
        // Return the first matching entry (or most recent if multiple)
        return matchingEntries.sort((a, b) => 
            (b.lastModified || b.insertedDate).localeCompare(a.lastModified || a.insertedDate)
        )[0];
    },
    
    renderGames: function() {
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
        
        grid.innerHTML = this.filteredGames.map(game => this.createGameCard(game)).join('');
        
        // Attach event listeners to priority dropdowns
        document.querySelectorAll('.priority-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const gameId = e.target.dataset.gameId;
                const entryKey = e.target.dataset.entryKey;
                this.updateGamePriority(gameId, entryKey, e.target.value);
            });
        });
        
        // Attach event listeners to notes
        document.querySelectorAll('.notes-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                const gameId = e.target.dataset.gameId;
                const entryKey = e.target.dataset.entryKey;
                this.updateGameNotes(gameId, entryKey, e.target.value);
            });
        });
    },
    
    createGameCard: function(game) {
        // Get the relevant entry for this view
        const currentEntry = this.getRelevantEntry(game);
        if (!currentEntry) return '';
        
        const priorityClass = `priority-${currentEntry.priority || 'none'}`;
        const bggLink = game.BGGId ? `https://boardgamegeek.com/boardgame/${game.BGGId}` : '';
        
        // Get historical entries if enabled
        let historicalEntriesHtml = '';
        if (this.showHistoricalEntries && game.entries && game.entries.length > 0) {
            historicalEntriesHtml = this.createHistoricalEntriesHtml(game, currentEntry);
        }
        
        return `
            <div class="spiel-card ${priorityClass}">
                <div class="card-header">
                    <h3 class="game-title">${this.escapeHtml(game.Title || 'Untitled')}</h3>
                    ${bggLink ? `<a href="${bggLink}" target="_blank" class="bgg-link" title="View on BGG">🎲</a>` : ''}
                </div>
                
                <div class="card-body">
                    <div class="game-info">
                        <div class="info-row">
                            <span class="label">Publisher:</span>
                            <span class="value">${this.escapeHtml(game.Publisher || 'Unknown')}</span>
                        </div>
                        <div class="info-row">
                            <span class="label">Location:</span>
                            <span class="value location">${this.escapeHtml(game.Location || 'TBA')}</span>
                        </div>
                        ${game.MSRP ? `
                        <div class="info-row">
                            <span class="label">Price:</span>
                            <span class="value">${this.escapeHtml(game['MSRP Currency'] || '')} ${this.escapeHtml(game.MSRP)}</span>
                        </div>` : ''}
                        ${game.Type ? `
                        <div class="info-row">
                            <span class="label">Type:</span>
                            <span class="value">${this.escapeHtml(game.Type)}</span>
                        </div>` : ''}
                    </div>
                    
                    <div class="priority-control">
                        <label>Your Priority (${currentEntry.year} ${currentEntry.convention}):</label>
                        <select class="priority-select" data-game-id="${game.BGGId || game.Title}" data-entry-key="${currentEntry.year}-${currentEntry.convention}-${currentEntry.user}">
                            <option value="1" ${currentEntry.priority === '1' ? 'selected' : ''}>Must Have</option>
                            <option value="2" ${currentEntry.priority === '2' ? 'selected' : ''}>Interested</option>
                            <option value="3" ${currentEntry.priority === '3' ? 'selected' : ''}>Undecided</option>
                            <option value="4" ${currentEntry.priority === '4' ? 'selected' : ''}>Not Interested</option>
                            <option value="" ${!currentEntry.priority || currentEntry.priority === '' ? 'selected' : ''}>Not Prioritized</option>
                        </select>
                    </div>
                    
                    <div class="notes-control">
                        <label>Notes:</label>
                        <textarea class="notes-input" data-game-id="${game.BGGId || game.Title}" data-entry-key="${currentEntry.year}-${currentEntry.convention}-${currentEntry.user}" 
                                  placeholder="Add personal notes...">${this.escapeHtml(currentEntry.notes || '')}</textarea>
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
            const badgeClass = isCurrent ? 'current' : 'historical';
            const entryClass = isCurrent ? 'current' : '';
            const priorityLabel = this.getPriorityLabel(entry.priority);
            
            const insertedDate = new Date(entry.insertedDate).toLocaleDateString();
            const modifiedDate = entry.lastModified !== entry.insertedDate ? 
                `Modified: ${new Date(entry.lastModified).toLocaleDateString()}` : '';
            
            return `
                <div class="historical-entry ${entryClass}">
                    <div class="entry-header">
                        <div class="entry-meta">
                            <strong>${entry.year}</strong> ${this.escapeHtml(entry.convention)} - ${this.escapeHtml(entry.user)}
                        </div>
                        <span class="entry-badge ${badgeClass}">${isCurrent ? 'Current View' : 'Historical'}</span>
                    </div>
                    <div class="entry-details">
                        <span class=\"entry-priority priority-${entry.priority || 'none'}\">${priorityLabel}</span>
                        ${entry.notes ? `<div class="entry-notes"><strong>Notes:</strong> "${this.escapeHtml(entry.notes)}"</div>` : ''}
                        <div class="entry-dates">
                            Added: ${insertedDate}
                            ${modifiedDate ? `<br>${modifiedDate}` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        return `
            <div class="historical-entries">
                <h4>📅 All Entries (${game.entries.length})</h4>
                ${entriesHtml}
            </div>
        `;
    },
    
    getPriorityLabel: function(priority) {
        const labels = {
            '1': 'Must Have',
            '2': 'Interested',
            '3': 'Undecided',
            '4': 'Not Interested'
        };
        return labels[priority] || 'Not Prioritized';
    },
    
    updateGamePriority: function(gameId, entryKey, priority) {
        // Find the game
        const game = this.games.find(g => (g.BGGId || g.Title) === gameId);
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
            
            this.updateCounts();
            this.applyFilters();
            this.renderGames();
        }
    },
    
    updateGameNotes: function(gameId, entryKey, notes) {
        // Find the game
        const game = this.games.find(g => (g.BGGId || g.Title) === gameId);
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
        const filename = this.currentFileName || 'SPIEL-Combined.json';
        
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
    
    updateCounts: function() {
        const counts = {
            all: 0,
            '1': 0,
            '2': 0,
            '3': 0,
            '4': 0,
            'none': 0
        };
        
        // Count games that match all filters EXCEPT priority
        this.games.forEach(game => {
            // Check if game has entries
            if (!game.entries || game.entries.length === 0) {
                return;
            }
            
            // Multiple entries filter
            if (this.showMultipleEntriesOnly && game.entries.length <= 1) {
                return;
            }
            
            // Get the relevant entry for this game
            const relevantEntry = this.getRelevantEntry(game);
            if (!relevantEntry) {
                return;
            }
            
            // Search filter
            const searchMatch = this.searchTerm === '' ||
                               (game.Title && game.Title.toLowerCase().includes(this.searchTerm)) ||
                               (game.Publisher && game.Publisher.toLowerCase().includes(this.searchTerm)) ||
                               (game.Location && game.Location.toLowerCase().includes(this.searchTerm));
            
            if (!searchMatch) {
                return;
            }
            
            // Count this game
            counts.all++;
            const priority = relevantEntry.priority || '';
            if (priority === '' || !priority) {
                counts['none']++;
            } else if (counts[priority] !== undefined) {
                counts[priority]++;
            }
        });
        
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
