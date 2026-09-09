// Games Page Module

const GamesPage = {
    gamesData: [],
    filteredGames: [],
    searchTerm: '',
    statusFilters: {
        own: false,
        wantToPlay: false,
        wantToBuy: false,
        want: false,
        wishlist: false,
        forTrade: false,
        preOrdered: false,
        prevOwned: false
    },

    init: async function() {
        console.log('Games page initialized');
        this.attachEventListeners();
        await this.loadCollection();
        this.renderGamesGrid();
    },

    /**
     * Load the collection data (produced via Settings > Import BGG Collection List).
     */
    loadCollection: async function() {
        if (window.CollectionData) {
            await window.CollectionData.init();
            this.gamesData = window.CollectionData.cache.games || [];
        } else {
            console.log('CollectionData module not available');
            this.gamesData = [];
        }
        this.filteredGames = [...this.gamesData];
        console.log('Loaded collection data:', this.filteredGames, 'games');
    },
    
    attachEventListeners: function() {
        // Add Game button
        const addGameBtn = document.getElementById('addGameBtn');
        if (addGameBtn) {
            addGameBtn.addEventListener('click', this.handleAddGame.bind(this));
        }
        
        // Search input
        const gameSearch = document.getElementById('gameSearch');
        if (gameSearch) {
            gameSearch.addEventListener('input', this.handleSearch.bind(this));
        }
        
        // Collection status filter checkboxes
        const filterIds = {
            filterOwn: 'own',
            filterWantToPlay: 'wantToPlay',
            filterWantToBuy: 'wantToBuy',
            filterWant: 'want',
            filterWishlist: 'wishlist',
            filterForTrade: 'forTrade',
            filterPreOrdered: 'preOrdered',
            filterPrevOwned: 'prevOwned'
        };
        Object.entries(filterIds).forEach(([elementId, statusKey]) => {
            const checkbox = document.getElementById(elementId);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    this.statusFilters[statusKey] = checkbox.checked;
                    this.applyFilters();
                });
            }
        });
        
        // Clicking the overlay closes the details panel
        const gameDetailsOverlay = document.getElementById('gameDetailsOverlay');
        if (gameDetailsOverlay) {
            gameDetailsOverlay.addEventListener('click', this.hideGameDetails.bind(this));
        }
    },
    
    handleAddGame: function() {
        console.log('Add game clicked');
        alert('Add game functionality will be implemented here.\n\nFeatures to add:\n- Import from BGG\n- Manual entry\n- Scan barcode\n- Import from BGStats');
    },
    
    handleSearch: function(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.applyFilters();
    },
    
    /**
     * Apply the current search term and collection status filters to gamesData.
     */
    applyFilters: function() {
        const activeStatusKeys = Object.keys(this.statusFilters).filter(key => this.statusFilters[key]);
        
        this.filteredGames = this.gamesData.filter(game => {
            const matchesSearch = !this.searchTerm || game.name.toLowerCase().includes(this.searchTerm);
            const matchesStatus = activeStatusKeys.length === 0 ||
                activeStatusKeys.some(key => game.collectionStatus && game.collectionStatus[key]);
            return matchesSearch && matchesStatus;
        });
        
        this.renderGamesGrid();
    },
    
    handleGameCardClick: function(index) {
        const game = this.filteredGames[index];
        if (game) {
            console.log('Game card clicked:', game.name);
            this.showGameDetails(game);
        }
    },
    
    renderGamesGrid: function() {
        const gamesGrid = document.getElementById('gamesGrid');
        if (!gamesGrid) return;
        
        if (this.gamesData.length === 0) {
            gamesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No games in your collection yet. Import your BGG collection from Settings &gt; Data &amp; Import.</p>';
            return;
        }

        if (this.filteredGames.length === 0) {
            gamesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No games found</p>';
            return;
        }
        
        gamesGrid.innerHTML = this.filteredGames.map(game => {
            const icon = game.itemType === 'expansion' ? '📦' : '🎲';
            const players = (game.minPlayers && game.maxPlayers)
                ? (game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}-${game.maxPlayers}`)
                : '?';
            const time = game.playingTime ? `${game.playingTime} min` : '?';
            return `
                <div class="game-card">
                    <div class="game-card-image">${icon}</div>
                    <h3>${game.name}</h3>
                    <p class="game-info">Players: ${players} | Time: ${time}</p>
                </div>
            `;
        }).join('');
        
        // Re-attach event listeners to new cards
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach((card, index) => {
            card.addEventListener('click', () => this.handleGameCardClick(index));
        });
    },
    
    showGameDetails: function(game) {
        const gameDetails = document.getElementById('gameDetails');
        const gameDetailsOverlay = document.getElementById('gameDetailsOverlay');
        if (!gameDetails) return;

        const icon = game.itemType === 'expansion' ? '📦' : '🎲';
        const players = (game.minPlayers && game.maxPlayers)
            ? (game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}-${game.maxPlayers}`)
            : 'Unknown';
        const time = game.playingTime ? `${game.playingTime} min` : 'Unknown';

        const statusLabels = {
            own: 'Own',
            forTrade: 'For Trade',
            want: 'Want',
            wantToBuy: 'Want to Buy',
            wantToPlay: 'Want to Play',
            prevOwned: 'Previously Owned',
            preOrdered: 'Preordered',
            wishlist: 'Wishlist'
        };
        const status = game.collectionStatus || {};
        const activeStatuses = Object.keys(statusLabels).filter(key => status[key]);
        const statusText = activeStatuses.length > 0
            ? activeStatuses.map(key => statusLabels[key]).join(', ') + (status.wishlist && status.wishlistPriority ? ` (Priority: ${status.wishlistPriority})` : '')
            : 'None';
        
        gameDetails.innerHTML = `
            <button class="game-details-close" onclick="GamesPage.hideGameDetails()" aria-label="Close">&times;</button>
            <h2>${game.name}</h2>
            <div style="display: flex; gap: 20px; margin: 20px 0;">
                <div style="font-size: 80px;">${icon}</div>
                <div>
                    <p><strong>Players:</strong> ${players}</p>
                    <p><strong>Play Time:</strong> ${time}</p>
                    <p><strong>Collection Status:</strong> ${statusText}</p>
                    ${game.rating ? `<p><strong>Your Rating:</strong> ${game.rating}</p>` : ''}
                </div>
            </div>
        `;
        
        gameDetails.classList.add('open');
        if (gameDetailsOverlay) gameDetailsOverlay.classList.add('open');
    },
    
    hideGameDetails: function() {
        const gameDetails = document.getElementById('gameDetails');
        const gameDetailsOverlay = document.getElementById('gameDetailsOverlay');
        if (gameDetails) gameDetails.classList.remove('open');
        if (gameDetailsOverlay) gameDetailsOverlay.classList.remove('open');
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamesPage;
}
