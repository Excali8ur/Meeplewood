// Games Page Module

const GamesPage = {
    gamesData: [],
    filteredGames: [],
    bgStatsPath: 'data/BGStatsExport.json',
    gameShelfPath: 'data/games_gameshelf_2026-10-18.csv',
    grovePageSize: 16,
    groveLimits: {},
    filters: {
        search: '',
        status: 'all',
        plays: 'all',
        playtime: 'all',
        mechanism: 'all',
        theme: 'all',
        sort: 'name-asc'
    },

    statusDefinitions: [
        { key: 'own', label: 'Owned', tree: 'The Great Game Oak', landmark: 'img/forest/treehouse.png' },
        { key: 'wantToPlay', label: 'Want to play', tree: 'The Curious Birch', landmark: 'img/forest/fairy.png' },
        { key: 'want', label: 'Wanted', tree: 'The Seeking Sycamore', landmark: 'img/forest/portal.png' },
        { key: 'wishlist', label: 'Wishlist', tree: 'The Wishing Willow', landmark: 'img/forest/mushroom-house.png' },
        { key: 'wantToBuy', label: 'Want to buy', tree: 'The Treasure Tree', landmark: 'img/forest/mushroom.png' },
        { key: 'preOrdered', label: 'Preordered', tree: 'The New-Growth Sapling', landmark: 'img/forest/leafy.png' },
        { key: 'forTrade', label: 'For trade', tree: 'The Trading Pine', landmark: 'img/forest/portal.png' },
        { key: 'prevOwned', label: 'Previously owned', tree: 'The Memory Tree', landmark: 'img/forest/mushroom.png' },
        { key: 'uncategorized', label: 'Other games', tree: 'The Wildwood', landmark: 'img/forest/leafy.png' }
    ],

    init: async function() {
        this.attachEventListeners();
        await this.loadCollection();
        this.populateTaxonomyFilters();
        this.applyFilters();
    },

    loadCollection: async function() {
        if (!window.CollectionData) {
            this.gamesData = [];
            return;
        }

        await window.CollectionData.init();
        const collectionGames = window.CollectionData.cache.games || [];

        try {
            const [bgStatsResponse, gameShelfResponse] = await Promise.all([
                fetch(this.bgStatsPath),
                fetch(this.gameShelfPath)
            ]);
            const bgStats = bgStatsResponse.ok
                ? await bgStatsResponse.json()
                : { games: [], plays: [], tags: [] };
            const taxonomy = gameShelfResponse.ok
                ? this.parseGameShelfTaxonomy(await gameShelfResponse.text())
                : new Map();
            this.gamesData = this.enrichGames(collectionGames, bgStats, taxonomy);
        } catch (error) {
            console.log('Could not enrich games with BGStats data:', error);
            this.gamesData = collectionGames.map(game => this.normalizeGame(game, null, {}, {}));
        }
    },

    parseGameShelfTaxonomy: function(csvText) {
        const lines = csvText.replace(/^\uFEFF/, '').split(/\r?\n/);
        const headerIndex = lines.findIndex(line => line.startsWith('Game ID,'));
        if (headerIndex < 0) return new Map();

        const headers = this.parseCSVLine(lines[headerIndex]);
        const taxonomy = new Map();
        for (let index = headerIndex + 1; index < lines.length; index++) {
            if (!lines[index].trim()) continue;
            const values = this.parseCSVLine(lines[index]);
            const row = Object.fromEntries(headers.map((header, column) => [header.trim(), values[column] || '']));
            if (!row['Game ID']) continue;
            taxonomy.set(String(row['Game ID']), {
                mechanisms: this.extractTerms(row, ['Mechanics']),
                themes: this.extractTerms(row, ['Categories'])
            });
        }
        return taxonomy;
    },

    parseCSVLine: function(line) {
        const values = [];
        let value = '';
        let inQuotes = false;
        for (let index = 0; index < line.length; index++) {
            const character = line[index];
            if (character === '"' && inQuotes && line[index + 1] === '"') {
                value += '"';
                index++;
            } else if (character === '"') {
                inQuotes = !inQuotes;
            } else if (character === ',' && !inQuotes) {
                values.push(value.trim());
                value = '';
            } else {
                value += character;
            }
        }
        values.push(value.trim());
        return values;
    },

    enrichGames: function(collectionGames, bgStats, taxonomy = new Map()) {
        const bgGames = Array.isArray(bgStats.games) ? bgStats.games : [];
        const plays = Array.isArray(bgStats.plays) ? bgStats.plays : [];
        const tagNames = new Map((bgStats.tags || []).map(tag => [String(tag.id), tag.name]));
        const gamesByBggId = new Map();
        const gamesByName = new Map();
        const playStats = {};

        bgGames.forEach(game => {
            if (game.bggId) gamesByBggId.set(String(game.bggId), game);
            [game.name, game.bggName].filter(Boolean).forEach(name => {
                gamesByName.set(String(name).trim().toLowerCase(), game);
            });
        });

        plays.forEach(play => {
            if (play.ignored || play.gameRefId === undefined || play.gameRefId === null) return;
            const key = String(play.gameRefId);
            const current = playStats[key] || { count: 0, lastPlayed: '' };
            current.count += 1;
            if (play.playDate && play.playDate > current.lastPlayed) current.lastPlayed = play.playDate;
            playStats[key] = current;
        });

        return collectionGames.map(game => {
            const source = (game.bggId && gamesByBggId.get(String(game.bggId))) ||
                (game.name && gamesByName.get(String(game.name).trim().toLowerCase())) ||
                null;
            const gameTaxonomy = taxonomy.get(String(game.bggId || (source && source.bggId))) || {};
            return this.normalizeGame(game, source, playStats, tagNames, gameTaxonomy);
        });
    },

    normalizeGame: function(game, source, playStats, tagNames, taxonomy = {}) {
        const imageSource = source || game;
        const sourceImageUrl = imageSource.urlThumb || imageSource.urlImage || '';
        const extensionMatch = sourceImageUrl.match(/\.(jpe?g|png|webp)(?:$|[?#])/i);
        const imageBggId = imageSource.bggId || game.bggId;
        const localImageUrl = imageBggId && extensionMatch
            ? `img/games/${encodeURIComponent(imageBggId)}.${extensionMatch[1].toLowerCase()}`
            : '';
        const sourcePlayStats = source && playStats[String(source.id)]
            ? playStats[String(source.id)]
            : null;
        const sourceTags = source && Array.isArray(source.tags)
            ? source.tags.map(tag => tagNames.get(String(tag.tagRefId))).filter(Boolean)
            : [];
        const mechanisms = this.extractTerms(game, ['mechanisms', 'mechanics', 'mechanism'])
            .concat(this.extractTerms(source, ['mechanisms', 'mechanics', 'mechanism']))
            .concat(taxonomy.mechanisms || []);
        const themes = this.extractTerms(game, ['themes', 'theme', 'categories', 'category'])
            .concat(this.extractTerms(source, ['themes', 'theme', 'categories', 'category']))
            .concat(taxonomy.themes || [])
            .concat(sourceTags);

        return {
            ...game,
            name: game.name || (source && (source.name || source.bggName)) || 'Untitled game',
            bggId: game.bggId || (source && source.bggId) || '',
            collectionStatus: this.getCollectionStatus(game, source),
            minPlayers: game.minPlayers || (source && source.minPlayerCount) || null,
            maxPlayers: game.maxPlayers || (source && source.maxPlayerCount) || null,
            playingTime: game.playingTime || (source && (source.maxPlayTime || source.minPlayTime)) || null,
            playCount: Number(game.numPlays ?? game.playCount ?? (sourcePlayStats && sourcePlayStats.count) ?? (source && source.previouslyPlayedAmount) ?? 0),
            lastPlayed: game.lastPlayed || (sourcePlayStats && sourcePlayStats.lastPlayed) || '',
            mechanisms: [...new Set(mechanisms.filter(Boolean))],
            themes: [...new Set(themes.filter(Boolean))],
            localImageUrl: game.localImageUrl || localImageUrl,
            urlThumb: game.urlThumb || (source && (source.urlThumb || source.urlImage)) || '',
            urlImage: game.urlImage || (source && (source.urlImage || source.urlThumb)) || ''
        };
    },

    extractTerms: function(record, keys) {
        if (!record) return [];
        return keys.flatMap(key => {
            const value = record[key];
            if (!value) return [];
            const values = Array.isArray(value) ? value : String(value).split(/[,;|]/);
            return values.map(item => {
                if (typeof item === 'string') return item.trim();
                return item.name || item.label || item.value || '';
            });
        });
    },

    getCollectionStatus: function(game, source) {
        const status = { ...(game.collectionStatus || {}) };
        const copies = source && Array.isArray(source.copies) ? source.copies : [];
        const mappings = {
            own: 'statusOwned',
            wishlist: 'statusWishlist',
            wantToPlay: 'statusWantToPlay',
            want: 'statusWantInTrade',
            forTrade: 'statusForTrade',
            prevOwned: 'statusPrevOwned',
            preOrdered: 'statusPreordered',
            wantToBuy: 'statusWantToBuy'
        };

        Object.entries(mappings).forEach(([key, sourceKey]) => {
            if (status[key] === undefined) {
                status[key] = Boolean(game[key]) || copies.some(copy => Boolean(copy[sourceKey]));
            }
        });

        return status;
    },

    attachEventListeners: function() {
        const controls = {
            gameSearch: event => { this.filters.search = event.target.value.trim().toLowerCase(); },
            statusFilter: event => { this.filters.status = event.target.value; },
            playsFilter: event => { this.filters.plays = event.target.value; },
            playtimeFilter: event => { this.filters.playtime = event.target.value; },
            mechanismFilter: event => { this.filters.mechanism = event.target.value; },
            themeFilter: event => { this.filters.theme = event.target.value; },
            gameSort: event => { this.filters.sort = event.target.value; }
        };

        Object.entries(controls).forEach(([id, update]) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.addEventListener(id === 'gameSearch' ? 'input' : 'change', event => {
                update(event);
                this.applyFilters();
            });
        });

        document.getElementById('clearGameFilters')?.addEventListener('click', () => this.clearFilters());
        document.getElementById('gameDetailsOverlay')?.addEventListener('click', () => this.hideGameDetails());
        document.addEventListener('keydown', this.handleEscapeKey);
    },

    handleEscapeKey: function(event) {
        if (event.key === 'Escape') GamesPage.hideGameDetails();
    },

    populateTaxonomyFilters: function() {
        this.populateSelect('mechanismFilter', this.gamesData.flatMap(game => game.mechanisms));
        this.populateSelect('themeFilter', this.gamesData.flatMap(game => game.themes));
    },

    populateSelect: function(id, values) {
        const select = document.getElementById(id);
        if (!select) return;
        const firstOption = select.options[0];
        const uniqueValues = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
        select.replaceChildren(firstOption);
        uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        select.disabled = uniqueValues.length === 0;
        select.title = uniqueValues.length === 0 ? 'No mechanism or theme data is available in the current files.' : '';
    },

    clearFilters: function() {
        this.filters = {
            search: '',
            status: 'all',
            plays: 'all',
            playtime: 'all',
            mechanism: 'all',
            theme: 'all',
            sort: 'name-asc'
        };

        const values = {
            gameSearch: '',
            statusFilter: 'all',
            playsFilter: 'all',
            playtimeFilter: 'all',
            mechanismFilter: 'all',
            themeFilter: 'all',
            gameSort: 'name-asc'
        };
        Object.entries(values).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });
        this.applyFilters();
    },

    applyFilters: function() {
        const filtered = this.gamesData.filter(game => {
            const searchable = [game.name, ...game.mechanisms, ...game.themes].join(' ').toLowerCase();
            const matchesSearch = !this.filters.search || searchable.includes(this.filters.search);
            const matchesStatus = this.filters.status === 'all' || Boolean(game.collectionStatus[this.filters.status]);
            const matchesPlays = this.matchesPlayCount(game.playCount);
            const matchesPlaytime = this.matchesPlaytime(game.playingTime);
            const matchesMechanism = this.filters.mechanism === 'all' || game.mechanisms.includes(this.filters.mechanism);
            const matchesTheme = this.filters.theme === 'all' || game.themes.includes(this.filters.theme);
            return matchesSearch && matchesStatus && matchesPlays && matchesPlaytime && matchesMechanism && matchesTheme;
        });

        this.filteredGames = this.sortGames(filtered);
        this.renderForest();
        this.updateSummary();
    },

    matchesPlayCount: function(count) {
        if (this.filters.plays === 'unplayed') return count === 0;
        if (this.filters.plays === 'one') return count === 1;
        if (this.filters.plays === 'few') return count >= 2 && count <= 4;
        if (this.filters.plays === 'many') return count >= 5;
        return true;
    },

    matchesPlaytime: function(time) {
        if (this.filters.playtime === 'all') return true;
        const minutes = Number(time) || 0;
        if (this.filters.playtime === '121') return minutes > 120;
        return minutes > 0 && minutes <= Number(this.filters.playtime);
    },

    sortGames: function(games) {
        const sorted = [...games];
        const byName = (a, b) => a.name.localeCompare(b.name);
        const sorters = {
            'name-asc': byName,
            'plays-desc': (a, b) => b.playCount - a.playCount || byName(a, b),
            'plays-asc': (a, b) => a.playCount - b.playCount || byName(a, b),
            'time-asc': (a, b) => (a.playingTime || Infinity) - (b.playingTime || Infinity) || byName(a, b),
            'time-desc': (a, b) => (b.playingTime || 0) - (a.playingTime || 0) || byName(a, b),
            recent: (a, b) => String(b.lastPlayed).localeCompare(String(a.lastPlayed)) || byName(a, b)
        };
        return sorted.sort(sorters[this.filters.sort] || byName);
    },

    getPrimaryStatus: function(game) {
        const match = this.statusDefinitions.find(definition => definition.key !== 'uncategorized' && game.collectionStatus[definition.key]);
        return match ? match.key : 'uncategorized';
    },

    renderForest: function() {
        const forest = document.getElementById('gamesForest');
        if (!forest) return;

        if (this.gamesData.length === 0) {
            forest.innerHTML = '<div class="forest-empty"><div><h2>No leaves yet</h2><p>Import a collection file in Settings to grow your game forest.</p></div></div>';
            return;
        }

        if (this.filteredGames.length === 0) {
            forest.innerHTML = '<div class="forest-empty"><div><h2>No leaves found</h2><p>Try clearing a filter or searching for another game.</p></div></div>';
            return;
        }

        const groups = new Map(this.statusDefinitions.map(definition => [definition.key, []]));
        this.filteredGames.forEach((game, index) => {
            groups.get(this.getPrimaryStatus(game)).push({ game, index });
        });

        forest.innerHTML = this.statusDefinitions
            .filter(definition => groups.get(definition.key).length > 0)
            .map(definition => this.renderGrove(definition, groups.get(definition.key)))
            .join('');

        forest.querySelectorAll('.game-leaf').forEach(button => {
            button.addEventListener('click', () => {
                const game = this.filteredGames[Number(button.dataset.gameIndex)];
                if (game) this.showGameDetails(game);
            });
        });
        forest.querySelectorAll('.grove-show-more').forEach(button => {
            button.addEventListener('click', () => {
                const groveKey = button.dataset.grove;
                this.groveLimits[groveKey] = (this.groveLimits[groveKey] || this.grovePageSize) + this.grovePageSize;
                this.renderForest();
            });
        });
        this.attachImageFallbacks(forest);
    },

    renderGrove: function(definition, entries) {
        const visibleLimit = this.groveLimits[definition.key] || this.grovePageSize;
        const visibleEntries = entries.slice(0, visibleLimit);
        const remainingCount = entries.length - visibleEntries.length;
        return `
            <section class="forest-grove grove-${definition.key}" aria-labelledby="grove-${definition.key}">
                <img class="grove-landmark" src="${definition.landmark}" alt="" aria-hidden="true">
                <header class="grove-header">
                    <div class="grove-title">
                        <p>${definition.label}</p>
                        <h2 id="grove-${definition.key}">${definition.tree}</h2>
                    </div>
                    <span class="grove-count">${entries.length} ${entries.length === 1 ? 'leaf' : 'leaves'}</span>
                </header>
                <div class="grove-canopy">
                    <div class="grove-leaves">
                        ${visibleEntries.map(entry => this.renderGameLeaf(entry.game, entry.index)).join('')}
                    </div>
                    ${remainingCount > 0 ? `
                        <button type="button" class="grove-show-more" data-grove="${definition.key}">
                            Show ${Math.min(this.grovePageSize, remainingCount)} more leaves
                            <span>${remainingCount} still hidden</span>
                        </button>
                    ` : ''}
                </div>
            </section>
        `;
    },

    renderGameLeaf: function(game, index) {
        const imageUrl = this.getGameImageUrl(game);
        const playtime = game.playingTime ? `${game.playingTime} min` : 'Time unknown';
        const plays = `${game.playCount} ${game.playCount === 1 ? 'play' : 'plays'}`;
        return `
            <button type="button" class="game-leaf" data-game-index="${index}" aria-label="Open ${this.escapeHtml(game.name)} details">
                <span class="game-leaf-image">
                    ${imageUrl ? `<img src="${this.escapeHtml(imageUrl)}" alt="" loading="lazy" decoding="async">` : ''}
                    <span class="game-leaf-playcount">${plays}</span>
                </span>
                <span class="game-leaf-copy">
                    <span class="game-leaf-title" title="${this.escapeHtml(game.name)}">${this.escapeHtml(game.name)}</span>
                    <span class="game-leaf-meta">${playtime}</span>
                </span>
            </button>
        `;
    },

    updateSummary: function() {
        const owned = this.gamesData.filter(game => game.collectionStatus.own).length;
        const unplayed = this.gamesData.filter(game => game.playCount === 0).length;
        this.setText('forestVisibleCount', this.filteredGames.length);
        this.setText('forestOwnedCount', owned);
        this.setText('forestUnplayedCount', unplayed);
        this.setText('forestResultText', `Showing ${this.filteredGames.length} of ${this.gamesData.length} games across ${this.countVisibleGroves()} collection trees.`);
    },

    countVisibleGroves: function() {
        return new Set(this.filteredGames.map(game => this.getPrimaryStatus(game))).size;
    },

    setText: function(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    },

    getGameImageUrl: function(game) {
        return [
            game.localImageUrl,
            game.localImage,
            game.imagePath,
            game.urlThumb,
            game.thumbnail,
            game.thumbnailUrl,
            game.urlImage,
            game.image,
            game.imageUrl
        ].find(value => typeof value === 'string' && value.trim()) || '';
    },

    attachImageFallbacks: function(container) {
        container.querySelectorAll('.game-leaf-image img, .game-details-image img').forEach(image => {
            image.addEventListener('error', () => image.remove(), { once: true });
        });
    },

    showGameDetails: function(game) {
        const details = document.getElementById('gameDetails');
        const overlay = document.getElementById('gameDetailsOverlay');
        if (!details) return;

        const statusLabels = this.statusDefinitions
            .filter(definition => definition.key !== 'uncategorized' && game.collectionStatus[definition.key])
            .map(definition => definition.label);
        const players = game.minPlayers && game.maxPlayers
            ? (game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`)
            : 'Unknown';
        const imageUrl = this.getGameImageUrl(game);
        const tags = [...game.mechanisms, ...game.themes];

        details.innerHTML = `
            <button type="button" class="game-details-close" aria-label="Close game details">&times;</button>
            <h2>${this.escapeHtml(game.name)}</h2>
            <div class="game-details-image">
                <span class="game-leaf-fallback" aria-hidden="true">${this.escapeHtml(game.name.charAt(0).toUpperCase())}</span>
                ${imageUrl ? `<img src="${this.escapeHtml(imageUrl)}" alt="${this.escapeHtml(game.name)}">` : ''}
            </div>
            <div class="game-details-stats">
                <div><strong>${game.playCount}</strong><span>Times played</span></div>
                <div><strong>${game.playingTime || '?'}</strong><span>Minutes</span></div>
                <div><strong>${players}</strong><span>Players</span></div>
            </div>
            <p class="game-details-label">Collection status</p>
            <div class="game-details-tags">
                ${(statusLabels.length ? statusLabels : ['Other game']).map(label => `<span>${this.escapeHtml(label)}</span>`).join('')}
            </div>
            ${tags.length ? `
                <p class="game-details-label">Mechanisms, themes, and tags</p>
                <div class="game-details-tags">${tags.map(tag => `<span>${this.escapeHtml(tag)}</span>`).join('')}</div>
            ` : ''}
            ${game.lastPlayed ? `<p><strong>Last played:</strong> ${this.escapeHtml(game.lastPlayed.split(' ')[0])}</p>` : ''}
        `;

        details.querySelector('.game-details-close').addEventListener('click', () => this.hideGameDetails());
        this.attachImageFallbacks(details);
        details.classList.add('open');
        details.setAttribute('aria-hidden', 'false');
        overlay?.classList.add('open');
    },

    hideGameDetails: function() {
        const details = document.getElementById('gameDetails');
        const overlay = document.getElementById('gameDetailsOverlay');
        details?.classList.remove('open');
        details?.setAttribute('aria-hidden', 'true');
        overlay?.classList.remove('open');
    },

    escapeHtml: function(value) {
        return String(value ?? '').replace(/[&<>"']/g, character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[character]);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GamesPage;
}
