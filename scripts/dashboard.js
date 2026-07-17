// Dashboard Page Module

const DashboardPage = {
    stats: {
        totalGames: 0,
        recentPlays: 0,
        favoriteGame: '-'
    },
    
    activities: [],
    
    init: function() {
        console.log('Dashboard page initialized');
        this.loadStats();
        this.loadRecentActivity();
    },
    
    loadStats: function() {
        // Load stats from local storage or data source
        const savedStats = localStorage.getItem('meeplewood_stats');
        if (savedStats) {
            this.stats = JSON.parse(savedStats);
        }
        
        this.updateStatsDisplay();
    },
    
    updateStatsDisplay: function() {
        const totalGamesEl = document.getElementById('totalGames');
        const recentPlaysEl = document.getElementById('recentPlays');
        const favoriteGameEl = document.getElementById('favoriteGame');
        
        if (totalGamesEl) totalGamesEl.textContent = this.stats.totalGames;
        if (recentPlaysEl) recentPlaysEl.textContent = this.stats.recentPlays;
        if (favoriteGameEl) favoriteGameEl.textContent = this.stats.favoriteGame;
    },
    
    loadRecentActivity: function() {
        // Load recent activity from local storage
        const savedActivity = localStorage.getItem('meeplewood_activity');
        if (savedActivity) {
            this.activities = JSON.parse(savedActivity);
            this.renderActivity();
        }
    },
    
    renderActivity: function() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;
        
        if (this.activities.length === 0) {
            activityList.innerHTML = '<p class="empty-state">No recent activity. Start logging your game plays!</p>';
            return;
        }
        
        activityList.innerHTML = this.activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-details">
                    <h3>${activity.title}</h3>
                    <p>${activity.description}</p>
                </div>
            </div>
        `).join('');
    },
    
    addActivity: function(icon, title, description) {
        this.activities.unshift({ icon, title, description, timestamp: Date.now() });
        
        // Keep only last 10 activities
        if (this.activities.length > 10) {
            this.activities = this.activities.slice(0, 10);
        }
        
        // Save to local storage
        localStorage.setItem('meeplewood_activity', JSON.stringify(this.activities));
        this.renderActivity();
    },
    
    updateStats: function(newStats) {
        this.stats = { ...this.stats, ...newStats };
        localStorage.setItem('meeplewood_stats', JSON.stringify(this.stats));
        this.updateStatsDisplay();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardPage;
}
