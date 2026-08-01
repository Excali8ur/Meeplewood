// Game Database Module - Manages cached game information from BGG

const GameDatabase = {
    cache: {},
    dbPath: 'data/game-database.json',
    fetchQueue: [],
    isFetching: false,
    
    // BGG API settings
    bggApiDelay: 1000, // 1 second between requests to respect BGG rate limits
    maxRetries: 3,
    
    // CORS proxy configuration with fallback options
    corsProxies: [
        { 
            url: 'https://api.allorigins.win/get?url=',
            type: 'allorigins',
            name: 'AllOrigins'
        },
        {
            url: 'https://corsproxy.io/?',
            type: 'direct',
            name: 'CorsProxy.io'
        }
    ],
    currentProxyIndex: 0,
    
    // Get current CORS proxy
    get corsProxy() {
        return this.corsProxies[this.currentProxyIndex].url;
    },
    
    get corsProxyType() {
        return this.corsProxies[this.currentProxyIndex].type;
    },
    
    get corsProxyName() {
        return this.corsProxies[this.currentProxyIndex].name;
    },
    
    // Try next proxy in the list
    tryNextProxy: function() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
        console.log(`Switching to ${this.corsProxyName} proxy`);
    },
    
    /**
     * Initialize the game database by loading cached data
     */
    init: async function() {
        console.log('Initializing Game Database...');
        try {
            const response = await fetch(this.dbPath);
            if (response.ok) {
                const data = await response.json();
                this.cache = data.games || {};
                console.log(`Loaded ${Object.keys(this.cache).length} games from cache`);
            } else {
                console.log('No existing game database found, starting fresh');
                this.cache = {};
            }
        } catch (error) {
            console.log('Could not load game database, starting fresh:', error);
            this.cache = {};
        }
        return this.cache;
    },
    
    /**
     * Get game info from cache or fetch from BGG if not cached
     * @param {string} bggId - The BGG game ID
     * @param {boolean} forceRefresh - Force fetch from BGG even if cached
     */
    getGameInfo: async function(bggId, forceRefresh = false) {
        if (!bggId) return null;
        
        // Check cache first
        if (!forceRefresh && this.cache[bggId]) {
            console.log(`Game ${bggId} found in cache`);
            return this.cache[bggId];
        }
        
        // Fetch from BGG
        console.log(`Fetching game ${bggId} from BGG...`);
        return await this.fetchFromBGG(bggId);
    },
    
    /**
     * Fetch game information from BGG API
     * @param {string} bggId - The BGG game ID
     */
    fetchFromBGG: async function(bggId, retryCount = 0, proxyAttempt = 0) {
        try {
            // BGG XML API endpoint with CORS proxy
            const bggUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;
            const url = this.corsProxy ? `${this.corsProxy}${encodeURIComponent(bggUrl)}` : bggUrl;
            
            console.log(`Fetching game ${bggId} using ${this.corsProxyName}...`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`${this.corsProxyName} returned ${response.status}: ${response.statusText}`);
            }
            
            let xmlText;
            
            // Handle different CORS proxy response formats
            if (this.corsProxyType === 'allorigins') {
                // allorigins.win returns JSON with contents field
                const jsonData = await response.json();
                xmlText = jsonData.contents;
            } else {
                // Direct or other proxies return raw XML
                xmlText = await response.text();
            }
            
            // Check if we got an error response from the CORS proxy
            if (xmlText.includes('<!DOCTYPE html>') || xmlText.includes('<html')) {
                throw new Error('Received HTML instead of XML (possible CORS proxy error)');
            }
            
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Check for API errors
            const errorNode = xmlDoc.querySelector('error');
            if (errorNode) {
                throw new Error(`BGG API error: ${errorNode.textContent}`);
            }
            
            // Parse the XML response
            const item = xmlDoc.querySelector('item');
            if (!item) {
                throw new Error('No game data found in BGG response');
            }
            
            const gameInfo = this.parseGameXML(item, bggId);
            
            // Cache the result
            this.cache[bggId] = gameInfo;
            console.log(`✓ Successfully fetched game ${bggId}: ${gameInfo.name}`);
            
            return gameInfo;
            
        } catch (error) {
            console.error(`✗ Error with ${this.corsProxyName} for game ${bggId}:`, error.message);
            
            // Try next proxy if this is the first attempt
            if (proxyAttempt < this.corsProxies.length - 1) {
                console.log(`Trying alternative proxy...`);
                this.tryNextProxy();
                return await this.fetchFromBGG(bggId, retryCount, proxyAttempt + 1);
            }
            
            // Retry logic with same proxy after trying all proxies
            if (retryCount < this.maxRetries) {
                console.log(`Retrying... (${retryCount + 1}/${this.maxRetries})`);
                await this.delay(2000); // Wait 2 seconds before retry
                // Reset to first proxy for retry
                this.currentProxyIndex = 0;
                return await this.fetchFromBGG(bggId, retryCount + 1, 0);
            }
            
            // Cache the failed result to avoid retrying on next import
            const failedResult = {
                bggId: bggId,
                name: 'Unknown',
                fetchError: error.message,
                lastFetchAttempt: new Date().toISOString()
            };
            
            this.cache[bggId] = failedResult;
            
            // Return minimal info if all retries failed
            return failedResult;
        }
    },
    
    /**
     * Parse BGG XML response into game object
     */
    parseGameXML: function(item, bggId) {
        const getName = (selector, attr = null) => {
            const elem = item.querySelector(selector);
            return elem ? (attr ? elem.getAttribute(attr) : elem.textContent) : '';
        };
        
        const getNumber = (selector, attr = null) => {
            const value = getName(selector, attr);
            return value ? parseFloat(value) : null;
        };
        
        // Get primary name
        const primaryName = item.querySelector('name[type="primary"]');
        const name = primaryName ? primaryName.getAttribute('value') : getName('name', 'value');
        
        // Get all alternate names
        const alternateNames = [];
        item.querySelectorAll('name[type="alternate"]').forEach(nameElem => {
            alternateNames.push(nameElem.getAttribute('value'));
        });
        
        return {
            bggId: bggId,
            name: name,
            alternateNames: alternateNames,
            yearPublished: getName('yearpublished', 'value'),
            minPlayers: getNumber('minplayers', 'value'),
            maxPlayers: getNumber('maxplayers', 'value'),
            playingTime: getNumber('playingtime', 'value'),
            minPlayTime: getNumber('minplaytime', 'value'),
            maxPlayTime: getNumber('maxplaytime', 'value'),
            minAge: getNumber('minage', 'value'),
            
            // Ratings and stats
            rating: {
                average: getNumber('statistics ratings average', 'value'),
                bayesAverage: getNumber('statistics ratings bayesaverage', 'value'),
                numRatings: getNumber('statistics ratings usersrated', 'value'),
                stdDev: getNumber('statistics ratings stddev', 'value'),
                median: getNumber('statistics ratings median', 'value')
            },
            
            ranks: this.parseRanks(item),
            
            // Complexity weight
            weight: getNumber('statistics ratings averageweight', 'value'),
            
            // Ownership stats
            owned: getNumber('statistics ratings owned', 'value'),
            trading: getNumber('statistics ratings trading', 'value'),
            wanting: getNumber('statistics ratings wanting', 'value'),
            wishing: getNumber('statistics ratings wishing', 'value'),
            
            // Categories and mechanics (first 5 of each to keep data manageable)
            categories: this.getLinks(item, 'boardgamecategory', 5),
            mechanics: this.getLinks(item, 'boardgamemechanic', 5),
            designers: this.getLinks(item, 'boardgamedesigner', 3),
            artists: this.getLinks(item, 'boardgameartist', 3),
            
            description: getName('description'),
            image: getName('image'),
            thumbnail: getName('thumbnail'),
            
            // Metadata
            lastUpdated: new Date().toISOString(),
            fetchedFromBGG: true
        };
    },
    
    /**
     * Parse rank information
     */
    parseRanks: function(item) {
        const ranks = [];
        item.querySelectorAll('rank').forEach(rankElem => {
            const rankValue = rankElem.getAttribute('value');
            if (rankValue && rankValue !== 'Not Ranked') {
                ranks.push({
                    type: rankElem.getAttribute('type'),
                    name: rankElem.getAttribute('name'),
                    friendlyName: rankElem.getAttribute('friendlyname'),
                    value: parseInt(rankValue)
                });
            }
        });
        return ranks;
    },
    
    /**
     * Get linked items (categories, mechanics, etc.)
     */
    getLinks: function(item, type, limit = 5) {
        const links = [];
        const elements = item.querySelectorAll(`link[type="${type}"]`);
        
        for (let i = 0; i < Math.min(elements.length, limit); i++) {
            links.push({
                id: elements[i].getAttribute('id'),
                value: elements[i].getAttribute('value')
            });
        }
        
        return links;
    },
    
    /**
     * Batch fetch multiple games with rate limiting
     * @param {Array} bggIds - Array of BGG IDs to fetch
     * @param {Function} progressCallback - Called after each fetch with (current, total)
     */
    batchFetch: async function(bggIds, progressCallback = null) {
        const uniqueIds = [...new Set(bggIds)].filter(id => id);
        const results = {};
        
        console.log(`Batch fetching ${uniqueIds.length} games from BGG...`);
        
        for (let i = 0; i < uniqueIds.length; i++) {
            const bggId = uniqueIds[i];
            
            // Check cache first
            if (this.cache[bggId]) {
                results[bggId] = this.cache[bggId];
            } else {
                // Fetch from BGG with delay
                results[bggId] = await this.fetchFromBGG(bggId);
                
                // Rate limiting - wait between requests
                if (i < uniqueIds.length - 1) {
                    await this.delay(this.bggApiDelay);
                }
            }
            
            // Progress callback
            if (progressCallback) {
                progressCallback(i + 1, uniqueIds.length);
            }
        }
        
        return results;
    },
    
    /**
     * Save the current cache to a JSON file
     */
    saveCache: async function() {
        const exportData = {
            metadata: {
                lastUpdated: new Date().toISOString(),
                totalGames: Object.keys(this.cache).length,
                version: '1.0'
            },
            games: this.cache
        };
        
        const jsonContent = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'game-database.json';
        a.click();
        
        URL.revokeObjectURL(url);
        console.log(`Saved ${Object.keys(this.cache).length} games to cache file`);
    },
    
    /**
     * Load cache from a file
     */
    loadCacheFromFile: async function(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.games) {
                this.cache = data.games;
                console.log(`Loaded ${Object.keys(this.cache).length} games from file`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error loading cache from file:', error);
            return false;
        }
    },
    
    /**
     * Utility delay function
     */
    delay: function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Get statistics about the cache
     */
    getCacheStats: function() {
        const games = Object.values(this.cache);
        return {
            totalGames: games.length,
            gamesWithErrors: games.filter(g => g.fetchError).length,
            gamesWithRatings: games.filter(g => g.rating && g.rating.average).length,
            averageRating: games.reduce((sum, g) => sum + (g.rating?.average || 0), 0) / games.length || 0,
            oldestFetch: games.reduce((oldest, g) => 
                !oldest || (g.lastUpdated && g.lastUpdated < oldest) ? g.lastUpdated : oldest, null)
        };
    }
};

// Make it available globally
window.GameDatabase = GameDatabase;
