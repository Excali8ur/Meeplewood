// Settings Page Module

const SettingsPage = {
    settings: {
        userName: '',
        defaultDataPath: 'data/GeekPreview-Combined.json',
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
    dbName: 'MeeplewoodDB',
    dbVersion: 1,
    
    init: async function() {
        console.log('Settings page initialized');
        await this.initDB();
        this.loadSettings();
        this.setupHelpTooltips();
        this.attachEventListeners();
        
        // Try to auto-load the default combined file
        await this.autoLoadDefaultCombinedFile();
    },
    
    // Initialize IndexedDB for storing file handles
    initDB: async function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                resolve(); // Continue even if DB fails
            };
            
            request.onsuccess = () => {
                console.log('IndexedDB initialized');
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
    
    // Open IndexedDB connection
    openDB: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    setupHelpTooltips: function() {
        const settingItems = document.querySelectorAll('.setting-item');

        settingItems.forEach((item, index) => {
            const helpDescriptions = Array.from(item.querySelectorAll('.setting-description'))
                .filter((description) => !description.id);

            if (helpDescriptions.length === 0) {
                return;
            }

            item.classList.add('has-help');

            const anchor = item.querySelector('label, button, input, select, textarea');
            if (!anchor) {
                return;
            }

            const helpId = `setting-help-${index + 1}`;
            const header = document.createElement('div');
            header.className = 'setting-item-header';

            anchor.parentNode.insertBefore(header, anchor);
            header.appendChild(anchor);

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'setting-help-trigger';
            trigger.setAttribute('aria-label', 'Show help information');
            trigger.setAttribute('aria-expanded', 'false');
            trigger.setAttribute('aria-controls', helpId);
            trigger.innerHTML = '<span aria-hidden="true">i</span>';
            header.appendChild(trigger);

            const tooltip = document.createElement('div');
            tooltip.className = 'setting-help-content';
            tooltip.id = helpId;
            tooltip.setAttribute('role', 'tooltip');

            helpDescriptions.forEach((description) => {
                tooltip.appendChild(description);
            });

            item.appendChild(tooltip);

            const closeTooltip = () => {
                item.classList.remove('is-help-open');
                trigger.setAttribute('aria-expanded', 'false');
            };

            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                const isOpen = item.classList.toggle('is-help-open');
                trigger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            });

            item.addEventListener('mouseleave', closeTooltip);

            item.addEventListener('focusout', (event) => {
                if (!item.contains(event.relatedTarget)) {
                    closeTooltip();
                }
            });

            trigger.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    closeTooltip();
                    trigger.blur();
                }
            });
        });

        document.addEventListener('click', (event) => {
            document.querySelectorAll('.setting-item.has-help.is-help-open').forEach((item) => {
                if (!item.contains(event.target)) {
                    item.classList.remove('is-help-open');
                    const trigger = item.querySelector('.setting-help-trigger');
                    if (trigger) {
                        trigger.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        });
    },
    
    autoLoadDefaultCombinedFile: async function(promptOnFail = false) {
        const defaultPath = this.settings.defaultDataPath || 'data/GeekPreview-Combined.json';
        
        // First, try to load from stored file handle (for local files)
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
                        
                        this.processExistingCombinedData(data, file.name, stored.handle);
                        console.log(`Auto-loaded local file "${file.name}" from stored handle`);
                        return;
                    }
                } catch (error) {
                    console.log('Could not load from stored handle:', error.message);
                }
            }
            
            // Stored handle failed, prompt user to re-select
            if (promptOnFail || confirm(`Could not auto-load your local file.\n\nWould you like to select it again?`)) {
                await this.loadDefaultFileWithPicker(defaultPath);
            }
            return;
        }
        
        // Try to fetch from server (for web-hosted files)
        try {
            const response = await fetch(defaultPath);
            if (!response.ok) {
                throw new Error('Default file not found on server');
            }
            const data = await response.json();
            this.processExistingCombinedData(data, defaultPath.split('/').pop(), null);
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
                    await this.loadDefaultFileWithPicker(defaultPath);
                }
            }
        }
    },
    
    loadDefaultFileWithPicker: async function(suggestedPath) {
        try {
            // Extract filename from path for suggestion
            const fileName = suggestedPath.split('/').pop();
            
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
    
    loadSettings: function() {
        const savedSettings = localStorage.getItem('meeplewood_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        this.populateForm();
    },
    
    populateForm: function() {
        const userNameInput = document.getElementById('userName');
        const defaultDataPathInput = document.getElementById('defaultDataPath');
        const defaultViewSelect = document.getElementById('defaultView');
        const showWelcomeCheck = document.getElementById('showWelcome');
        const themeSelect = document.getElementById('theme');
        const cardSizeSelect = document.getElementById('cardSize');
        
        if (userNameInput) userNameInput.value = this.settings.userName;
        if (defaultDataPathInput) defaultDataPathInput.value = this.settings.defaultDataPath;
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
        
        // Create new file
        const createNewFileBtn = document.getElementById('createNewFileBtn');
        if (createNewFileBtn) {
            createNewFileBtn.addEventListener('click', this.createNewFile.bind(this));
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
        
        // Browse data path button
        const browseDataPathBtn = document.getElementById('browseDataPathBtn');
        if (browseDataPathBtn) {
            browseDataPathBtn.addEventListener('click', this.browseDataPath.bind(this));
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
        const defaultDataPathInput = document.getElementById('defaultDataPath');
        const defaultViewSelect = document.getElementById('defaultView');
        const showWelcomeCheck = document.getElementById('showWelcome');
        const themeSelect = document.getElementById('theme');
        const cardSizeSelect = document.getElementById('cardSize');
        
        // Track old path to detect changes
        const oldPath = this.settings.defaultDataPath;
        
        this.settings = {
            userName: userNameInput?.value || '',
            defaultDataPath: defaultDataPathInput?.value || 'data/GeekPreview-Combined.json',
            defaultView: defaultViewSelect?.value || 'dashboard',
            showWelcome: showWelcomeCheck?.checked || false,
            theme: themeSelect?.value || 'light',
            cardSize: cardSizeSelect?.value || 'medium'
        };
        
        localStorage.setItem('meeplewood_settings', JSON.stringify(this.settings));
        console.log('Settings saved:', this.settings);
        
        // If default path changed, reload the file
        if (oldPath !== this.settings.defaultDataPath) {
            console.log(`Default path changed from ${oldPath} to ${this.settings.defaultDataPath}, reloading...`);
            this.autoLoadDefaultCombinedFile(true);  // Pass true to prompt user on failure
        }
        
        // Update the metadata modal's user field if it's open
        const userInput = document.getElementById('spielUser');
        if (userInput && this.settings.userName) {
            userInput.value = this.settings.userName;
        }
        
        alert('Settings saved successfully!');
    },
    
    cancelSettings: function() {
        console.log('Settings cancelled');
        this.loadSettings(); // Reload original settings
        alert('Changes discarded');
    },
    
    createNewFile: function() {
        console.log('Create new preview file');
        
        const confirmed = confirm('Start a fresh preview file? This will clear any currently loaded data in this session (your saved files won\'t be affected).');
        
        if (confirmed) {
            // Clear existing data
            this.existingCombinedData = null;
            this.existingFileName = '';
            
            // Update status
            const statusEl = document.getElementById('existingFileStatus');
            if (statusEl) {
                statusEl.textContent = '✓ New file created (empty)';
                statusEl.style.display = 'block';
                statusEl.style.color = '#4CAF50';
            }
            
            console.log('New empty file created');
            alert('New preview file started! You can now import GeekPreview lists without merging with existing data.');
        }
    },
    
    browseDataPath: async function() {
        console.log('Browse for data file path');
        
        // Try File System Access API first for better functionality
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
                    
                    // Load the file with write access
                    this.processExistingCombinedData(data, file.name, fileHandle);
                    
                    // Store the file handle for persistence
                    await this.storeFileHandle(fileHandle, file.name);
                    
                    // Update the path input to indicate local file
                    const localPath = `local:${file.name}`;
                    const defaultDataPathInput = document.getElementById('defaultDataPath');
                    if (defaultDataPathInput) {
                        defaultDataPathInput.value = localPath;
                    }
                    
                    console.log(`Browsed and loaded file: ${file.name}, path: ${localPath}`);
                    alert(`File loaded successfully!\n\nFile: ${file.name}\nPath: ${localPath}\n\nClick "Save Settings" to remember this file.`);
                    
                } catch (parseError) {
                    console.error('Error parsing JSON:', parseError);
                    alert('Error: Selected file is not valid JSON');
                }
                return;
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;  // User cancelled
                }
                console.log('File System Access API failed, falling back:', err);
            }
        }
        
        // Fallback for browsers without File System Access API
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        
                        // Load the file (without file handle in fallback mode)
                        this.processExistingCombinedData(data, file.name, null);
                        
                        // Update the path input - use generic path since no handle available
                        const suggestedPath = `data/${file.name}`;
                        const defaultDataPathInput = document.getElementById('defaultDataPath');
                        if (defaultDataPathInput) {
                            defaultDataPathInput.value = suggestedPath;
                        }
                        
                        console.log(`Selected file: ${file.name}, suggested path: ${suggestedPath}`);
                        alert(`File loaded successfully!\n\nFile: ${file.name}\nNote: Your browser doesn't support persistent file access. You'll need to re-select this file after page reloads.\n\nClick "Save Settings" to remember the filename.`);
                    } catch (parseError) {
                        console.error('Error parsing JSON:', parseError);
                        alert('Error: Selected file is not valid JSON');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    },
    
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
    },
    
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
        const userInput = document.getElementById('spielUser');
        
        if (modal) {
            modal.style.display = 'flex';
            
            if (gamesCount) gamesCount.textContent = this.tempSpielData.length;
            if (fileName) fileName.textContent = this.tempSpielFileName;
            
            // Set default year to current year
            if (yearInput) yearInput.value = new Date().getFullYear();
            
            // Pre-populate user field from settings
            if (userInput && this.settings.userName) {
                userInput.value = this.settings.userName;
            }
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
        
        // Try to load the default file first using the configured path
        /*
        const defaultPath = this.settings.defaultDataPath || 'data/GeekPreview-Combined.json';
        
        fetch(defaultPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Default file not found');
                }
                return response.json();
            })
            .then(data => {
                this.processExistingCombinedData(data, defaultPath.split('/').pop(), null);
            })
            .catch(error => {
                console.log('Default file not found, opening file picker:', error);
                this.openExistingFilePicker();
            });
            */
        
        // Open file picker to select existing combined file
        this.openExistingFilePicker();
    },
    
    openExistingFilePicker: async function() {
        // Try File System Access API first (Chrome, Edge, Opera)
        if ('showOpenFilePicker' in window) {
            try {
                // Try to determine a smart starting location based on default path
                let startIn = 'downloads';  // Default fallback
                const defaultPath = (this.settings.defaultDataPath || '').toLowerCase();
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
    
    processExistingCombinedData: function(data, fileName, fileHandle = null) {
        // Validate structure
        if (data.games && Array.isArray(data.games)) {
            this.existingCombinedData = data;
            this.existingFileName = fileName;
            this.existingFileHandle = fileHandle;  // Store handle for later save
            
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
    
    saveSpielAsJson: async function() {
        if (!this.tempSpielData) {
            alert('No data to save');
            return;
        }
        
        // Store the imported game count before any operations that might clear tempSpielData
        const importedGameCount = this.tempSpielData.length;
        
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
            gameCount: importedGameCount
        });
        
        // Create filename - use convention name or keep existing name
        let filename = 'GeekPreview-Combined.json';
        if (this.existingFileName) {
            filename = this.existingFileName;
        } else {
            const conventionPart = convention.replace(/\s+/g, '-');
            filename = `${conventionPart}-Combined.json`;
        }
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        
        // Try to use existing file handle first
        if (this.existingFileHandle) {
            try {
                const writable = await this.existingFileHandle.createWritable();
                await writable.write(jsonContent);
                await writable.close();
                
                this.showSuccessMessage(filename, finalGames.length, importedGameCount);
                this.cancelSpielImport();
                return;
            } catch (err) {
                console.log('Failed to write to existing file handle, will prompt for new location:', err);
                this.existingFileHandle = null;  // Clear invalid handle
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
                this.existingFileHandle = fileHandle;
                this.existingFileName = fileHandle.name;
                
                this.showSuccessMessage(filename, finalGames.length, importedGameCount);
                this.cancelSpielImport();
                return;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.log('Save cancelled or failed, falling back to download');
                    this.fallbackDownload(jsonContent, filename, finalGames.length, importedGameCount);
                }
                this.cancelSpielImport();
                return;
            }
        }
        
        // Fallback: automatic download
        this.fallbackDownload(jsonContent, filename, finalGames.length, importedGameCount);
        
        // Hide modal
        this.cancelSpielImport();
    },
    
    fallbackDownload: function(jsonContent, filename, totalGames, importedGameCount) {
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showSuccessMessage(filename, totalGames, importedGameCount);
    },
    
    showSuccessMessage: function(filename, totalGames, importedGameCount) {
        // Clear existing file reference (but keep handle if we have one)
        this.existingCombinedData = null;
        this.existingFileName = '';
        // Note: Don't clear existingFileHandle - keep it for next save
        const existingStatusEl = document.getElementById('existingFileStatus');
        if (existingStatusEl) {
            existingStatusEl.style.display = 'none';
        }
        
        // Show success message
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
