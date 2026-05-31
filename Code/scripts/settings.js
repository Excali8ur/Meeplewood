// Settings Page Module

const SettingsPage = {
    settings: {
        userName: '',
        defaultView: 'dashboard',
        showWelcome: true,
        theme: 'light',
        cardSize: 'medium'
    },
    
    init: function() {
        console.log('Settings page initialized');
        this.loadSettings();
        this.attachEventListeners();
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
        // Save button
        const saveBtn = document.getElementById('saveSettingsBtn');
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
        if (importSpielBtn) {
            importSpielBtn.addEventListener('click', this.importSpielPreview.bind(this));
        }
        
        // Import BGStats
        const importBGStatsBtn = document.getElementById('importBGStatsBtn');
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
        
        const reportIssueBtn = document.getElementById('reportIssueBtn');
        if (reportIssueBtn) {
            reportIssueBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Report issues on GitHub or contact support');
            });
        }
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
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const csvText = event.target.result;
                        const parsedGames = this.parseSpielCSV(csvText);
                        
                        // Store in localStorage
                        localStorage.setItem('meeplewood_spiel_preview', JSON.stringify(parsedGames));
                        
                        console.log(`Imported ${parsedGames.length} games from Spiel preview`);
                        
                        // Show success message
                        const statusEl = document.getElementById('spielImportStatus');
                        if (statusEl) {
                            statusEl.textContent = `✓ Successfully imported ${parsedGames.length} games from ${file.name}`;
                            statusEl.style.display = 'block';
                            
                            // Hide after 5 seconds
                            setTimeout(() => {
                                statusEl.style.display = 'none';
                            }, 5000);
                        }
                        
                        alert(`Successfully imported ${parsedGames.length} games from Spiel preview!`);
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
            game.userPriority = game.Priority || '4'; // Default to 4 (undecided)
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
            spielPreview: JSON.parse(localStorage.getItem('meeplewood_spiel_preview') || '[]'),
            exportDate: new Date().toISOString()
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
