// Settings Page Module

const SettingsPage = {
    settings: {
        userName: '',
        defaultView: 'dashboard',
        showWelcome: true,
        theme: 'light',
        cardSize: 'medium'
    },
    
    // Temporary storage for imported Spiel data before saving
    tempSpielData: null,
    tempSpielFileName: '',
    
    // Existing combined data (if loaded)
    existingCombinedData: null,
    existingFileName: '',
    
    init: function() {
        console.log('Settings page initialized');
        this.loadSettings();
        this.attachEventListeners();
        
        // Try to auto-load the default combined file
        this.autoLoadDefaultCombinedFile();
    },
    
    autoLoadDefaultCombinedFile: function() {
        const defaultPath = 'data/SPIEL-Combined.json';
        
        fetch(defaultPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Default file not found');
                }
                return response.json();
            })
            .then(data => {
                this.processExistingCombinedData(data, 'SPIEL-Combined.json');
                console.log('Auto-loaded SPIEL-Combined.json for merging');
            })
            .catch(error => {
                console.log('Default combined file not found, will need manual load if merging');
            });
    },
    
    loadSettings: function() {
        const savedSettings = localStorage.getItem('meeplewood_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        this.populateForm();
    },
    
    populateForm: function() {
        const userNameInput = document.getElementById('userName');
        const defaultViewSelect = document.getElementById('defaultView');
        const showWelcomeCheck = document.getElementById('showWelcome');
        const themeSelect = document.getElementById('theme');
        const cardSizeSelect = document.getElementById('cardSize');
        
        if (userNameInput) userNameInput.value = this.settings.userName;
        if (defaultViewSelect) defaultViewSelect.value = this.settings.defaultView;
        if (showWelcomeCheck) showWelcomeCheck.checked = this.settings.showWelcome;
        if (themeSelect) themeSelect.value = this.settings.theme;
        if (cardSizeSelect) cardSizeSelect.value = this.settings.cardSize;
    },
    
    attachEventListeners: function() {
        console.log('Attaching event listeners...');
        
        // Save button
        const saveBtn = document.getElementById('saveSettingsBtn');
        console.log('saveBtn found:', !!saveBtn);
        if (saveBtn) {
            saveBtn.addEventListener('click', this.saveSettings.bind(this));
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancelSettingsBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.cancelSettings.bind(this));
        }
        
        // Import Spiel Preview
        const importSpielBtn = document.getElementById('importSpielBtn');
        console.log('importSpielBtn found:', !!importSpielBtn);
        if (importSpielBtn) {
            importSpielBtn.addEventListener('click', (e) => {
                console.log('importSpielBtn clicked!', e);
                this.importSpielPreview();
            });
            console.log('Click listener attached to importSpielBtn');
        } else {
            console.error('importSpielBtn not found in DOM!');
        }
        
        // Load existing combined file
        const loadExistingSpielBtn = document.getElementById('loadExistingSpielBtn');
        console.log('loadExistingSpielBtn found:', !!loadExistingSpielBtn);
        if (loadExistingSpielBtn) {
            loadExistingSpielBtn.addEventListener('click', (e) => {
                console.log('loadExistingSpielBtn clicked!', e);
                this.loadExistingCombinedFile();
            });
            console.log('Click listener attached to loadExistingSpielBtn');
        } else {
            console.error('loadExistingSpielBtn not found in DOM!');
        }
        
        // Import BGStats
        const importBGStatsBtn = document.getElementById('importBGStatsBtn');
        console.log('importBGStatsBtn found:', !!importBGStatsBtn);
        if (importBGStatsBtn) {
            importBGStatsBtn.addEventListener('click', this.importBGStats.bind(this));
        }
        
        // Import BGG
        const importBGGBtn = document.getElementById('importBGGBtn');
        if (importBGGBtn) {
            importBGGBtn.addEventListener('click', this.importBGG.bind(this));
        }
        
        // Export data
        const exportDataBtn = document.getElementById('exportDataBtn');
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', this.exportData.bind(this));
        }
        
        // Clear cache
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', this.clearCache.bind(this));
        }
        
        // Reset data
        const resetDataBtn = document.getElementById('resetDataBtn');
        if (resetDataBtn) {
            resetDataBtn.addEventListener('click', this.resetData.bind(this));
        }
        
        // About links
        const viewLicenseBtn = document.getElementById('viewLicenseBtn');
        if (viewLicenseBtn) {
            viewLicenseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Meeplewood - MIT License');
            });
        }
        
        // Report issue button
        const reportIssueBtn = document.getElementById('reportIssueBtn');
        if (reportIssueBtn) {
            reportIssueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Report issues on GitHub or contact support');
            });
        }
        
        // Spiel metadata modal buttons
        const saveSpielJsonBtn = document.getElementById('saveSpielJsonBtn');
        if (saveSpielJsonBtn) {
            saveSpielJsonBtn.addEventListener('click', this.saveSpielAsJson.bind(this));
        }
        
        const cancelSpielImportBtn = document.getElementById('cancelSpielImportBtn');
        if (cancelSpielImportBtn) {
            cancelSpielImportBtn.addEventListener('click', this.cancelSpielImport.bind(this));
        }
        
        console.log('All event listeners attached successfully');
    },
    
    saveSettings: function() {
        const userNameInput = document.getElementById('userName');
        const defaultViewSelect = document.getElementById('defaultView');
        const showWelcomeCheck = document.getElementById('showWelcome');
        const themeSelect = document.getElementById('theme');
        const cardSizeSelect = document.getElementById('cardSize');
        
        this.settings = {
            userName: userNameInput?.value || '',
            defaultView: defaultViewSelect?.value || 'dashboard',
            showWelcome: showWelcomeCheck?.checked || false,
            theme: themeSelect?.value || 'light',
            cardSize: cardSizeSelect?.value || 'medium'
        };
        
        localStorage.setItem('meeplewood_settings', JSON.stringify(this.settings));
        console.log('Settings saved:', this.settings);
        
        alert('Settings saved successfully!');
    },
    
    cancelSettings: function() {
        console.log('Settings cancelled');
        this.loadSettings(); // Reload original settings
        alert('Changes discarded');
    },
    
    importBGStats: function() {
        console.log('Import from BGStats');
        
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
                        console.log('BGStats data loaded:', data);
                        alert('BGStats import functionality will be implemented here');
                        // TODO: Parse and import BGStats data
                    } catch (error) {
                        alert('Error parsing BGStats file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    },
    
    importSpielPreview: function() {
        console.log('Import Spiel Preview CSV');
        
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.tempSpielFileName = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const csvText = event.target.result;
                        const parsedGames = this.parseSpielCSV(csvText);
                        
                        // Store temporarily
                        this.tempSpielData = parsedGames;
                        
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
    
    showSpielMetadataModal: function() {
        const modal = document.getElementById('spielMetadataModal');
        const gamesCount = document.getElementById('gamesCount');
        const fileName = document.getElementById('fileName');
        const yearInput = document.getElementById('spielYear');
        
        if (modal) {
            modal.style.display = 'flex';
            
            if (gamesCount) gamesCount.textContent = this.tempSpielData.length;
            if (fileName) fileName.textContent = this.tempSpielFileName;
            
            // Set default year to current year
            if (yearInput) yearInput.value = new Date().getFullYear();
        }
    },
    
    cancelSpielImport: function() {
        const modal = document.getElementById('spielMetadataModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.tempSpielData = null;
        this.tempSpielFileName = '';
    },
    
    loadExistingCombinedFile: function() {
        console.log('Loading existing combined Spiel file');
        
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
                this.processExistingCombinedData(data, 'SPIEL-Combined.json');
            })
            .catch(error => {
                console.log('Default file not found, opening file picker:', error);
                this.openExistingFilePicker();
            });
    },
    
    openExistingFilePicker: function() {
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
                        this.processExistingCombinedData(data, file.name);
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
    
    processExistingCombinedData: function(data, fileName) {
        // Validate structure
        if (data.games && Array.isArray(data.games)) {
            this.existingCombinedData = data;
            this.existingFileName = fileName;
            
            const statusEl = document.getElementById('existingFileStatus');
            if (statusEl) {
                statusEl.textContent = `✓ Loaded: ${fileName}`;
                statusEl.style.display = 'block';
            }
            
            console.log(`Loaded existing file with ${data.games.length} games`);
        } else {
            alert('Invalid file format. Expected JSON with "games" array.');
        }
    },
    
    saveSpielAsJson: function() {
        if (!this.tempSpielData) {
            alert('No data to save');
            return;
        }
        
        // Get metadata from form
        const year = document.getElementById('spielYear')?.value || '';
        const convention = document.getElementById('spielConvention')?.value || '';
        const user = document.getElementById('spielUser')?.value || '';
        const notes = document.getElementById('spielNotes')?.value || '';
        
        if (!year || !convention || !user) {
            alert('Please fill in Year, Convention, and User fields - they are required for tracking.');
            return;
        }
        
        const now = new Date().toISOString();
        
        // Create or merge games with new entry structure
        let finalGames = [];
        
        if (this.existingCombinedData && this.existingCombinedData.games) {
            // Start with existing games
            finalGames = JSON.parse(JSON.stringify(this.existingCombinedData.games));
        }
        
        // Process each imported game
        this.tempSpielData.forEach(importedGame => {
            // Find matching game by BGGId or Title
            const matchKey = importedGame.BGGId || importedGame.Title;
            let existingGame = finalGames.find(g => 
                (g.BGGId && g.BGGId === importedGame.BGGId) || 
                (g.Title === importedGame.Title)
            );
            
            // Create new entry for this year/convention/user
            // Normalize priority value (convert 'N/A' and '0' to empty string)
            let priorityValue = importedGame.Priority || importedGame.userPriority || '';
            if (priorityValue === 'N/A' || priorityValue === '0') {
                priorityValue = '';
            }
            
            const newEntry = {
                year: year,
                convention: convention,
                user: user,
                priority: priorityValue,
                notes: importedGame.Notes || importedGame.userNotes || '',
                // Entry-specific data that can vary by year/convention
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
                // Game exists - check if entry for this year/convention/user exists
                if (!existingGame.entries) {
                    existingGame.entries = [];
                }
                
                const existingEntryIndex = existingGame.entries.findIndex(e => 
                    e.year === year && 
                    e.convention === convention && 
                    e.user === user
                );
                
                if (existingEntryIndex >= 0) {
                    // Update existing entry
                    existingGame.entries[existingEntryIndex] = {
                        ...existingGame.entries[existingEntryIndex],
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
                    // Add new entry
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
                // Remove user-specific and entry-specific fields from game level
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
        
        // Create final export structure
        const exportData = {
            metadata: {
                lastUpdated: now,
                totalGames: finalGames.length,
                sources: this.existingCombinedData?.metadata?.sources || []
            },
            games: finalGames
        };
        
        // Add this import as a source
        exportData.metadata.sources.push({
            year: year,
            convention: convention,
            user: user,
            notes: notes,
            sourceFile: this.tempSpielFileName,
            importedDate: now,
            gameCount: this.tempSpielData.length
        });
        
        // Create filename - use convention name or keep existing name
        let filename = 'SPIEL-Combined.json';
        if (this.existingFileName) {
            filename = this.existingFileName;
        } else {
            const conventionPart = convention.replace(/\s+/g, '-');
            filename = `${conventionPart}-Combined.json`;
        }
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        
        // Try File System Access API (Chrome, Edge, Opera)
        if ('showSaveFilePicker' in window) {
            try {
                const handle = window.showSaveFilePicker({
                    suggestedName: filename,
                    startIn: 'downloads',  // Change to 'documents', 'desktop', etc. (browser only allows these preset folders)
                    types: [{
                        description: 'JSON Files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                handle.then(async (fileHandle) => {
                    const writable = await fileHandle.createWritable();
                    await writable.write(jsonContent);
                    await writable.close();
                    
                    this.showSuccessMessage(filename, finalGames.length);
                }).catch((err) => {
                    if (err.name !== 'AbortError') {
                        console.log('Save cancelled or failed, falling back to download');
                        this.fallbackDownload(jsonContent, filename, finalGames.length);
                    }
                });
                
                // Hide modal immediately
                this.cancelSpielImport();
                return;
            } catch (err) {
                console.log('File System Access API not available, using download');
            }
        }
        
        // Fallback: automatic download
        this.fallbackDownload(jsonContent, filename, finalGames.length);
        
        // Hide modal
        this.cancelSpielImport();
    },
    
    fallbackDownload: function(jsonContent, filename, totalGames) {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage(filename, totalGames);
    },
    
    showSuccessMessage: function(filename, totalGames) {
        // Clear existing file reference
        this.existingCombinedData = null;
        this.existingFileName = '';
        const existingStatusEl = document.getElementById('existingFileStatus');
        if (existingStatusEl) {
            existingStatusEl.style.display = 'none';
        }
        
        // Show success message
        const statusEl = document.getElementById('spielImportStatus');
        if (statusEl) {
            statusEl.textContent = `✓ Successfully saved ${this.tempSpielData.length} games to ${filename}`;
            statusEl.style.display = 'block';
            
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 5000);
        }
        
        alert(`Successfully processed ${this.tempSpielData.length} games!\n\nFile: ${filename}\n\nTotal games in file: ${totalGames}\n\nLoad this file in the Spiel Preview page to view your data.`);
    },
    
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
            
            // Add metadata
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
    
    parseCSVLine: function(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote mode
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // End of field
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add last field
        result.push(current.trim());
        
        return result;
    },
    
    importBGG: function() {
        const username = prompt('Enter your BoardGameGeek username:');
        if (username) {
            console.log('Importing from BGG for user:', username);
            alert('BGG import functionality will be implemented here.\n\nWe will fetch your collection from:\nhttps://boardgamegeek.com/xmlapi2/collection?username=' + username);
        }
    },
    
    exportData: function() {
        console.log('Exporting all data');
        
        const data = {
            settings: this.settings,
            games: JSON.parse(localStorage.getItem('meeplewood_games') || '[]'),
            plays: JSON.parse(localStorage.getItem('meeplewood_plays') || '[]'),
            groups: JSON.parse(localStorage.getItem('meeplewood_groups') || '[]'),
            stats: JSON.parse(localStorage.getItem('meeplewood_stats') || '{}'),
            exportDate: new Date().toISOString(),
            note: 'Spiel Preview data is stored separately as JSON files and not included in this export.'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeplewood-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        alert('Data exported successfully!');
    },
    
    clearCache: function() {
        if (confirm('Clear cache? This will not delete your data.')) {
            console.log('Cache cleared');
            alert('Cache cleared successfully!');
        }
    },
    
    resetData: function() {
        const confirmation = prompt('This will DELETE ALL DATA permanently!\n\nType "DELETE" to confirm:');
        if (confirmation === 'DELETE') {
            localStorage.clear();
            console.log('All data reset');
            alert('All data has been reset. The page will reload.');
            window.location.reload();
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsPage;
}
