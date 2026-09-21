// Settings Page Module
const SettingsPage = {
    settings: {
        userName: '',
        defaultPreviewPath: 'data/GeekPreview-ExampleData.json',
        defaultCollectionPath: 'data/collection-ExampleData.json',
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
    existingFileHandle: null,  // Store file handle for direct save access
    
    init: async function() {
        console.log('Settings page initialized');
        await SettingsData.initDB();
        this.loadSettings();
        this.setupHelpTooltips();
        this.setupIntroInfo();
        this.attachEventListeners();
        
        // Try to auto-load the default combined file
        await this.autoLoadDefaultCombinedFile();
    },
    
/// Setup functions

    // Setup help tooltips for settings items that have descriptions
    setupHelpTooltips: function() {
        const settingItems = document.querySelectorAll('.setting-item');

        settingItems.forEach((item) => {
            const helpDescriptions = Array.from(item.querySelectorAll('.setting-description')).filter((description) => !description.id);
            if (helpDescriptions.length === 0) return;

            item.classList.add('has-help');
            const tooltip = document.createElement('div');
            tooltip.className = 'setting-help-content';

            helpDescriptions.forEach((description) => {
                tooltip.appendChild(description);
            });
            item.appendChild(tooltip);
        });
    },
    
    // Show the data storage intro directly on the first visit, then keep it tucked behind an "i" button
    setupIntroInfo: function() {
        const intro = document.getElementById('dataStorageIntro');
        const toggle = document.getElementById('dataStorageIntroToggle');
        if (!intro || !toggle) return;

        const storageKey = 'meeplewood_settingsIntroSeen';
        const hasSeenIntro = localStorage.getItem(storageKey) === 'true';

        const setVisible = (visible) => {
            intro.classList.toggle('is-visible', visible);
            toggle.setAttribute('aria-expanded', visible ? 'true' : 'false');

            const section = intro.closest('.settings-section');
            if (section) {
                section.querySelectorAll('.setting-item.has-help').forEach((item) => {
                    item.classList.toggle('is-help-open', visible);
                });
            }
        };

        setVisible(!hasSeenIntro);

        if (!hasSeenIntro) {
            localStorage.setItem(storageKey, 'true');
        }

        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            setVisible(!intro.classList.contains('is-visible'));
        });
    },

    // Attempt to auto-load the default combined file, either from stored file handle or server path
    autoLoadDefaultCombinedFile: async function(promptOnFail = false) {
        const defaultPath = this.settings.defaultPreviewPath || 'data/GeekPreview-Combined.json';
        console.log(`Attempting to auto-load default combined file from path: ${defaultPath}`);
        // First, try to load from stored file handle (for local files)
        if (defaultPath.startsWith('local:')) {
            const stored = await SettingsData.getStoredFileHandle();
            if (stored && stored.handle) {
                try {
                    // Browsers reset this to 'prompt' after a restart/new session, even though
                    // the handle itself is still remembered - that's not a lost path, it's an
                    // expired permission grant that requires a user gesture to renew.
                    const permission = await stored.handle.queryPermission({ mode: 'readwrite' });
                    
                    if (permission === 'granted') {
                        const file = await stored.handle.getFile();
                        const content = await file.text();
                        const data = JSON.parse(content);
                        
                        SettingsData.processExistingCombinedData(data, file.name, stored.handle);
                        console.log(`Auto-loaded local file "${file.name}" from stored handle`);
                        return;
                    }
                    
                    // Permission needs to be re-granted with a user gesture - offer a one-click
                    // reconnect using the already-remembered handle instead of a full re-browse.
                    SettingsData.showReconnectPrompt(stored.handle, stored.fileName);
                    return;
                } catch (error) {
                    console.log('Could not load from stored handle:', error.message);
                }
            }
            
            // No stored handle at all, prompt user to select the file
            if (promptOnFail || confirm(`Could not auto-load your local file.\n\nWould you like to select it again?`)) {
                await SettingsData.loadDefaultFileWithPicker(defaultPath);
            }            
        }
        else { // Try to fetch (default) file from server
            try {
                const response = await fetch(defaultPath);
                if (!response.ok) {
                    throw new Error('Default file not found on server');
                }
                const data = await response.json();
                SettingsData.processExistingCombinedData(data, defaultPath.split('/').pop(), null);
                console.log(`Auto-loaded ${defaultPath} from server (read-only, no file handle)`);
                return;
            } catch (error) {
                console.log('Could not load default file from server:', error.message);
                
                // If called with promptOnFail (e.g., from settings change), offer to load via file picker
                if (promptOnFail && 'showOpenFilePicker' in window) {
                    const shouldLoad = confirm(
                        `Could not auto-load "${defaultPath}" from server.\n\n` +
                        `Would you like to select the file from your local system?\n` +
                        `(This will give the app write access for saving updates)`
                    );
                    
                    if (shouldLoad) {
                        await SettingsData.loadDefaultFileWithPicker(defaultPath);
                    }
                }
            }
        }
    },
    
    // Load settings from localStorage and populate the form
    loadSettings: function() {
        const savedSettings = localStorage.getItem('meeplewood_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        SettingsData.populateForm();
    },
    
    // Attach event listeners to the settings form
    attachEventListeners: function() {
        console.log('Attaching event listeners...');
        
        // Save username
        const saveUserNameBtn = document.getElementById('saveUserNameBtn');
        if (saveUserNameBtn) {
            saveUserNameBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // Import Spiel Preview
        const importSpielBtn = document.getElementById('importSpielBtn');
        console.log('importSpielBtn found:', !!importSpielBtn);
        if (importSpielBtn) {
            importSpielBtn.addEventListener('click', (e) => {
                console.log('importSpielBtn clicked!', e);
                SettingsData.importSpielPreview();
            });
            console.log('Click listener attached to importSpielBtn');
        } else {
            console.error('importSpielBtn not found in DOM!');
        }
        
        // Create new file
        const createNewPreviewFileBtn = document.getElementById('createNewPreviewFileBtn');
        if (createNewPreviewFileBtn) {
            createNewPreviewFileBtn.addEventListener('click', this.createNewPreviewFile.bind(this));
        }
        
        // Create new collection file
        const createNewCollectionFileBtn = document.getElementById('createNewCollectionFileBtn');
        if (createNewCollectionFileBtn) {
            createNewCollectionFileBtn.addEventListener('click', this.createNewCollectionFile.bind(this));
        }
        
        // Use example data
        const useExamplePreviewBtn = document.getElementById('useExamplePreviewBtn');
        if (useExamplePreviewBtn) {
            useExamplePreviewBtn.addEventListener('click', () => this.useExampleData('defaultPreviewPath', 'data/GeekPreview-ExampleData.json'));
        }
        
        const useExampleCollectionBtn = document.getElementById('useExampleCollectionBtn');
        if (useExampleCollectionBtn) {
            useExampleCollectionBtn.addEventListener('click', () => this.useExampleData('defaultCollectionPath', 'data/collection-ExampleData.json'));
        }
        
        // Import BGStats
        const importBGStatsBtn = document.getElementById('importBGStatsBtn');
        console.log('importBGStatsBtn found:', !!importBGStatsBtn);
        if (importBGStatsBtn) {
            importBGStatsBtn.addEventListener('click', this.importBGStats.bind(this));
        }
        
        // Import BGG Collection CSV
        const importCollectionBtn = document.getElementById('importCollectionBtn');
        if (importCollectionBtn) {
            importCollectionBtn.addEventListener('click', this.importCollection.bind(this));
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
                alert('Report issues on GitHub or contact Rianne Boumans');
            });
        }
        
        // Browse data path button
        const browsePreviewPathBtn = document.getElementById('browsePreviewPathBtn');
        if (browsePreviewPathBtn) {
            browsePreviewPathBtn.addEventListener('click', this.browsePreviewPath.bind(this));
        }
        
        // Browse collection path button
        const browseCollectionPathBtn = document.getElementById('browseCollectionPathBtn');
        if (browseCollectionPathBtn) {
            browseCollectionPathBtn.addEventListener('click', this.browseCollectionPath.bind(this));
        }
        
        // Spiel metadata modal buttons
        const saveSpielJsonBtn = document.getElementById('saveSpielJsonBtn');
        if (saveSpielJsonBtn) {
            saveSpielJsonBtn.addEventListener('click', () => SettingsData.saveSpielAsJson());
        }
        
        const cancelSpielImportBtn = document.getElementById('cancelSpielImportBtn');
        if (cancelSpielImportBtn) {
            cancelSpielImportBtn.addEventListener('click', this.cancelSpielImport.bind(this));
        }
        
        console.log('All event listeners attached successfully');
    },
    
    // Save settings to localStorage and handle any necessary reloads
    // This function is called when certain settings are changed
    saveSettings: function() {
        const userNameInput = document.getElementById('userName');
        const defaultPreviewPathInput = document.getElementById('defaultPreviewPath');
        const defaultCollectionPathInput = document.getElementById('defaultCollectionPath');
        const defaultViewSelect = document.getElementById('defaultView');
        const showWelcomeCheck = document.getElementById('showWelcome');
        const themeSelect = document.getElementById('theme');
        const cardSizeSelect = document.getElementById('cardSize');
        
        // Track old paths to detect changes
        const oldPath = this.settings.defaultPreviewPath;
        const oldCollectionPath = this.settings.defaultCollectionPath;
        
        this.settings = {
            userName: userNameInput?.value || '',
            defaultPreviewPath: defaultPreviewPathInput?.value || 'data/GeekPreview-Combined.json',
            defaultCollectionPath: defaultCollectionPathInput?.value || 'data/collection.json',
            defaultView: defaultViewSelect?.value || 'dashboard',
            showWelcome: showWelcomeCheck?.checked || false,
            theme: themeSelect?.value || 'light',
            cardSize: cardSizeSelect?.value || 'medium'
        };
        
        localStorage.setItem('meeplewood_settings', JSON.stringify(this.settings));
        console.log('Settings saved:', this.settings);
        
        // If default path changed, reload the file
        if (oldPath !== this.settings.defaultPreviewPath) {
            console.log(`Default path changed from ${oldPath} to ${this.settings.defaultPreviewPath}, reloading...`);
            this.autoLoadDefaultCombinedFile(true);  // Pass true to prompt user on failure
        }
        
        // If default collection path changed, refresh the cached collection data
        if (oldCollectionPath !== this.settings.defaultCollectionPath && window.CollectionData) {
            console.log(`Default collection path changed from ${oldCollectionPath} to ${this.settings.defaultCollectionPath}, reloading...`);
            window.CollectionData.init();
        }
        
        // Update the metadata modal's user field if it's open
        const userInput = document.getElementById('spielUser');
        if (userInput && this.settings.userName) {
            userInput.value = this.settings.userName;
        }
        
        SettingsData.updateAddDataButtonsState();
        console.log('Settings saved successfully.');
    },

    // ButtonClick: Point the given path input at the bundled example file and save/reload immediately
    // "Use Example Data" buttons for both preview and collection paths
    useExampleData: function(inputId, examplePath) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = examplePath;
        this.saveSettings();
    },

/// Collection Functions

    // ButtonClick: Browse for a Meeplewood`collection file and load it, storing the handle for future direct saves
    browseCollectionPath: async function() {
        console.log('Browse for collection file');
        
        if (!window.CollectionData) {
            alert('Collection module not loaded.');
            return;
        }        
        const result = await SettingsData.browseFilePath((handle, fileName) => window.CollectionData.storeFileHandle(handle, fileName));
        if (!result) {
            console.log('No file selected or operation cancelled.');
            return;
        }
        
        const defaultCollectionPathInput = document.getElementById('defaultCollectionPath');
        if (defaultCollectionPathInput) {
            defaultCollectionPathInput.value = result.localPath;
        }
        
        this.saveSettings();
        console.log(`Browsed and loaded collection file: ${result.fileName}, path: ${result.localPath}`);
    },   
    
    // ButtonClick: Create a new collection file
    createNewCollectionFile: async function() {
        console.log('Create new collection file');
        
        const result = await SettingsData.createNewFile('MeepleWood-Collection.json');
        if (!result) return;  // User cancelled
        
        const path = result.localPath || result.path;
        if (result.fileHandle && window.CollectionData) {
            await window.CollectionData.storeFileHandle(result.fileHandle, result.file.name);
        }
        
        const defaultCollectionPathInput = document.getElementById('defaultCollectionPath');
        if (defaultCollectionPathInput) {
            defaultCollectionPathInput.value = path;
        }
        this.saveSettings();
        console.log(`New empty collection file created: ${path}`);
    },

    // ButtonClick: Import BGG Collection CSV file and parse it into the app's data structure
    importCollection: async function() {
        console.log('Import BGG Collection CSV');

        if (!window.CollectionData) {
            alert('Collection module not loaded.');
            return;
        }

        // Load current collection.json (if any) up front, so no extra async work
        // happens later, right before the save button's click (preserves user gesture).
        await window.CollectionData.init();

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/csv,.csv,text/plain';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const csvText = event.target.result;
                    const importedGames = window.CollectionData.parseCSV(csvText);

                    console.log(`Parsed ${importedGames.length} games from collection CSV`);
                    const missingIdCount = importedGames.filter(g => !g.bggId).length;
                    if (missingIdCount > 0) {
                        console.warn(`${missingIdCount} of ${importedGames.length} parsed games are missing a bggId (check the CSV has an "objectid" column)`);
                    }

                    const mergedGames = window.CollectionData.mergeGames(window.CollectionData.cache.games, importedGames);
                    const exportData = window.CollectionData.buildExportData(mergedGames, file.name);

                    await SettingsData.saveCollectionAsJson(exportData, importedGames.length);
                } catch (error) {
                    console.error('Error parsing collection CSV:', error);
                    alert('Error parsing CSV file: ' + error.message);
                }
            };
            reader.readAsText(file);
        };

        input.click();
    },
   

/// GeekPreview Functions

    // ButtonClick: Browse for a Meeplewood preview file and load it, storing the handle for future direct saves
    browsePreviewPath: async function() {
        console.log('Browse for preview file');
        
        const result = await SettingsData.browseFilePath((handle, fileName) => SettingsData.storeFileHandle(handle, fileName));
        if (!result) {
            console.log('No file selected or operation cancelled.');
            return;
        }
        
        SettingsData.processExistingCombinedData(result.data, result.fileName, result.fileHandle);
        
        const defaultPreviewPathInput = document.getElementById('defaultPreviewPath');
        if (defaultPreviewPathInput) {
            defaultPreviewPathInput.value = result.localPath;
        }
        
        this.saveSettings();
        console.log(`Browsed and loaded file: ${result.fileName}, path: ${result.localPath}`);
    },

    // ButtonClick: Create a new preview file
    createNewPreviewFile: async function() {
        console.log('Create new preview file');
        
        const result = await SettingsData.createNewFile('MeepleWood-GeekPreview.json');
        if (!result) return;  // User cancelled
        
        const path = result.localPath || result.path;
        if (result.fileHandle) {
            SettingsData.processExistingCombinedData(result.emptyData, result.file.name, result.fileHandle);
            await SettingsData.storeFileHandle(result.fileHandle, result.file.name);
        } else {
            SettingsData.processExistingCombinedData(result.emptyData, result.fileName, null);
        }
        
        const defaultPreviewPathInput = document.getElementById('defaultPreviewPath');
        if (defaultPreviewPathInput) {
            defaultPreviewPathInput.value = path;
        }
        this.saveSettings();
        console.log(`New empty preview file created: ${path}`);
    }, 
    
    // ButtonClick: Cancel the Spiel import process and close the modal
    cancelSpielImport: function() {
        const modal = document.getElementById('spielMetadataModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.tempSpielData = null;
        this.tempSpielFileName = '';
    },    

    // ButtonClick: Import BGStats JSON file and parse it into the app's data structure
    // Not implemented yet, just a placeholder for now
    importBGStats: function() {
        console.log('Import from BGStats');
        
        // Create file input
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
    }    

};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SettingsPage;
}
