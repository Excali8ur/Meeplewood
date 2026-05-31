// Spiel Preview Page Module

const SpielPreviewPage = {
    games: [],
    filteredGames: [],
    currentFilter: 'all',
    searchTerm: '',
    
    init: function() {
        console.log('Spiel Preview page initialized');
        this.loadGames();
        this.attachEventListeners();
        this.renderGames();
    },
    
    loadGames: function() {
        const savedGames = localStorage.getItem('meeplewood_spiel_preview');
        if (savedGames) {
            this.games = JSON.parse(savedGames);
        } else {
            this.games = [];
        }
        this.filteredGames = [...this.games];
        this.updateCounts();
    },
    
    attachEventListeners: function() {
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
        this.renderGames();
    },
    
    handleSearch: function(term) {
        this.searchTerm = term.toLowerCase();
        this.applyFilters();
        this.renderGames();
    },
    
    applyFilters: function() {
        this.filteredGames = this.games.filter(game => {
            // Priority filter
            const priorityMatch = this.currentFilter === 'all' || 
                                  game.userPriority === this.currentFilter || 
                                  game.Priority === this.currentFilter;
            
            // Search filter
            const searchMatch = this.searchTerm === '' ||
                               (game.Title && game.Title.toLowerCase().includes(this.searchTerm)) ||
                               (game.Publisher && game.Publisher.toLowerCase().includes(this.searchTerm)) ||
                               (game.Location && game.Location.toLowerCase().includes(this.searchTerm));
            
            return priorityMatch && searchMatch;
        });
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
                const gameIndex = parseInt(e.target.dataset.index);
                this.updateGamePriority(gameIndex, e.target.value);
            });
        });
        
        // Attach event listeners to notes
        document.querySelectorAll('.notes-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                const gameIndex = parseInt(e.target.dataset.index);
                this.updateGameNotes(gameIndex, e.target.value);
            });
        });
    },
    
    createGameCard: function(game) {
        const priorityClass = `priority-${game.userPriority || game.Priority || '4'}`;
        const priorityLabel = this.getPriorityLabel(game.userPriority || game.Priority);
        const bggLink = game.BGGId ? `https://boardgamegeek.com/boardgame/${game.BGGId}` : '';
        
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
                        <label>Your Priority:</label>
                        <select class="priority-select" data-index="${this.games.indexOf(game)}">
                            <option value="2" ${(game.userPriority || game.Priority) === '2' ? 'selected' : ''}>Must Buy</option>
                            <option value="3" ${(game.userPriority || game.Priority) === '3' ? 'selected' : ''}>Want</option>
                            <option value="4" ${(game.userPriority || game.Priority) === '4' ? 'selected' : ''}>Maybe</option>
                        </select>
                    </div>
                    
                    <div class="notes-control">
                        <label>Notes:</label>
                        <textarea class="notes-input" data-index="${this.games.indexOf(game)}" 
                                  placeholder="Add personal notes...">${this.escapeHtml(game.userNotes || '')}</textarea>
                    </div>
                </div>
            </div>
        `;
    },
    
    getPriorityLabel: function(priority) {
        const labels = {
            '2': 'Must Buy',
            '3': 'Want',
            '4': 'Maybe'
        };
        return labels[priority] || 'Maybe';
    },
    
    updateGamePriority: function(index, priority) {
        if (index >= 0 && index < this.games.length) {
            this.games[index].userPriority = priority;
            this.saveGames();
            this.updateCounts();
            this.applyFilters();
            this.renderGames();
        }
    },
    
    updateGameNotes: function(index, notes) {
        if (index >= 0 && index < this.games.length) {
            this.games[index].userNotes = notes;
            this.saveGames();
        }
    },
    
    saveGames: function() {
        localStorage.setItem('meeplewood_spiel_preview', JSON.stringify(this.games));
    },
    
    updateCounts: function() {
        const counts = {
            all: this.games.length,
            '2': 0,
            '3': 0,
            '4': 0
        };
        
        this.games.forEach(game => {
            const priority = game.userPriority || game.Priority || '4';
            if (counts[priority] !== undefined) {
                counts[priority]++;
            }
        });
        
        const countAll = document.getElementById('countAll');
        const count2 = document.getElementById('count2');
        const count3 = document.getElementById('count3');
        const count4 = document.getElementById('count4');
        
        if (countAll) countAll.textContent = counts.all;
        if (count2) count2.textContent = counts['2'];
        if (count3) count3.textContent = counts['3'];
        if (count4) count4.textContent = counts['4'];
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
