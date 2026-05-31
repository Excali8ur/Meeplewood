// Games Page Module

const GamesPage = {
    // Sample game data (will be replaced with actual data later)
    gamesData: [
        { id: 1, name: 'Sample Game 1', icon: '🎲', players: '2-4', time: '60 min' },
        { id: 2, name: 'Sample Game 2', icon: '🎯', players: '3-6', time: '45 min' },
        { id: 3, name: 'Sample Game 3', icon: '🃏', players: '2-5', time: '90 min' }
    ],
    
    filteredGames: [],
    
    init: function() {
        console.log('Games page initialized');
        this.filteredGames = [...this.gamesData];
        this.attachEventListeners();
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
        
        // Game cards
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach((card, index) => {
            card.addEventListener('click', () => this.handleGameCardClick(index));
        });
    },
    
    handleAddGame: function() {
        console.log('Add game clicked');
        alert('Add game functionality will be implemented here.\n\nFeatures to add:\n- Import from BGG\n- Manual entry\n- Scan barcode\n- Import from BGStats');
    },
    
    handleSearch: function(event) {
        const searchTerm = event.target.value.toLowerCase();
        console.log('Searching for:', searchTerm);
        
        // Filter games
        this.filteredGames = this.gamesData.filter(game => 
            game.name.toLowerCase().includes(searchTerm)
        );
        
        // Re-render games grid
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
        
        if (this.filteredGames.length === 0) {
            gamesGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No games found</p>';
            return;
        }
        
        gamesGrid.innerHTML = this.filteredGames.map(game => `
            <div class="game-card">
                <div class="game-card-image">${game.icon}</div>
                <h3>${game.name}</h3>
                <p class="game-info">Players: ${game.players} | Time: ${game.time}</p>
            </div>
        `).join('');
        
        // Re-attach event listeners to new cards
        const gameCards = document.querySelectorAll('.game-card');
        gameCards.forEach((card, index) => {
            card.addEventListener('click', () => this.handleGameCardClick(index));
        });
    },
    
    showGameDetails: function(game) {
        const gameDetails = document.getElementById('gameDetails');
        if (!gameDetails) return;
        
        gameDetails.style.display = 'block';
        gameDetails.innerHTML = `
            <h2>${game.name}</h2>
            <div style="display: flex; gap: 20px; margin: 20px 0;">
                <div style="font-size: 80px;">${game.icon}</div>
                <div>
                    <p><strong>Players:</strong> ${game.players}</p>
                    <p><strong>Play Time:</strong> ${game.time}</p>
                    <p><strong>Last Played:</strong> Never</p>
                    <p><strong>Total Plays:</strong> 0</p>
                </div>
            </div>
            <button class="primary-button" onclick="GamesPage.hideGameDetails()">Close</button>
            <button class="primary-button" style="margin-left: 10px;">Log Play</button>
        `;
        
        // Scroll to details
        gameDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },
    
    hideGameDetails: function() {
        const gameDetails = document.getElementById('gameDetails');
        if (gameDetails) {
            gameDetails.style.display = 'none';
        }
    },
    
    // Load games from data source (e.g., BGStats export)
    loadGamesFromData: async function(dataPath) {
        try {
            const response = await fetch(dataPath);
            const data = await response.json();
            // Process and load games
            console.log('Games data loaded:', data);
            // TODO: Parse BGStats format and populate gamesData
        } catch (error) {
            console.error('Error loading games data:', error);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamesPage;
}
