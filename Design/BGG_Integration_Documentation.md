# BGG Integration & Game Database Documentation

## Overview
The Game Database system provides caching for BoardGameGeek (BGG) game information. When importing GeekPreview lists, the system automatically fetches detailed game data from BGG and stores it locally to avoid repeated API calls.

## Architecture

### Files
- `scripts/game-database.js` - Main GameDatabase module with BGG API integration
- `data/game-database.json` - Cached game information (created after first import)

### Key Components

#### GameDatabase Module
The `GameDatabase` object is available globally and provides:

- **Caching**: Stores fetched game data in memory and in JSON file
- **BGG API Integration**: Fetches game details using BoardGameGeek XML API v2
- **Rate Limiting**: Respects BGG's rate limits (1 request per second)
- **Batch Fetching**: Can fetch multiple games with progress tracking
- **Error Handling**: Retries failed requests and stores minimal data on failure

## Data Structure

### Game Database Cache Format
```json
{
  "metadata": {
    "lastUpdated": "ISO timestamp",
    "totalGames": 0,
    "version": "1.0"
  },
  "games": {
    "BGGId": {
      "bggId": "123456",
      "name": "Game Name",
      "alternateNames": [],
      "yearPublished": "2024",
      "minPlayers": 2,
      "maxPlayers": 4,
      "playingTime": 60,
      "minAge": 12,
      "rating": {
        "average": 7.5,
        "bayesAverage": 7.2,
        "numRatings": 1234
      },
      "weight": 2.5,
      "categories": [],
      "mechanics": [],
      "designers": [],
      "description": "...",
      "image": "url",
      "thumbnail": "url",
      "lastUpdated": "ISO timestamp",
      "fetchedFromBGG": true
    }
  }
}
```

## Usage

### During Import (Settings Page)
1. User imports a GeekPreview CSV file
2. In the metadata modal, they can check "Fetch detailed game information from BGG"
3. When saving:
   - System identifies games without cached BGG data
   - Fetches data for new games (with progress indicator)
   - Saves updated cache automatically
   - Continues with normal file save

### On Preview Page
- When displaying game cards, system checks if BGG data exists for each game
- If available, displays additional info:
  - ⭐ BGG Rating
  - 🧩 Complexity/Weight
  - 👥 Player Count
  - ⏱️ Play Time

### Manual Cache Management (Settings)
Users can:
- View cache statistics (total games, ratings, etc.)
- Load a previously saved cache file
- Save current cache to file
- Refresh statistics display

## API Details

### BGG XML API v2
- **Endpoint**: `https://boardgamegeek.com/xmlapi2/thing?id={bggId}&stats=1`
- **Rate Limit**: ~1 request per second (enforced by our code)
- **Format**: XML response
- **Documentation**: https://boardgamegeek.com/wiki/page/BGG_XML_API2

### CORS Proxy Requirement
⚠️ **Important**: The BGG API does not set CORS headers, which prevents direct browser access. To work around this, the system uses a CORS proxy service with automatic fallback.

**Proxy Configuration** (in `game-database.js`):
The system automatically tries multiple proxies in order:

1. **AllOrigins** (`https://api.allorigins.win/get?url=`)
   - Returns JSON response with `contents` field
   - Reliable, free service
   - No registration required
   - Tried first

2. **CorsProxy.io** (`https://corsproxy.io/?`)
   - Returns raw XML directly
   - Automatic fallback if AllOrigins fails
   - Also free and reliable

**How it works**:
```javascript
// System tries AllOrigins first
fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(bggUrl))

// If that fails, automatically tries CorsProxy.io
fetch('https://corsproxy.io/?' + encodeURIComponent(bggUrl))

// If both fail, retries up to 3 times with 2-second delays
```

**Request Flow**:
```
Browser → CORS Proxy → BGG API → CORS Proxy → Browser
```

The proxy wraps the BGG request and adds the necessary CORS headers, allowing browser-based access.

**Privacy Note**: Your BGG API requests are routed through third-party proxy services. No personal data is sent (only game IDs like "174430").

**Customizing Proxies**:
To add, remove, or reorder proxies, edit `scripts/game-database.js`:
```javascript
corsProxies: [
    { 
        url: 'https://api.allorigins.win/get?url=',
        type: 'allorigins',  // 'allorigins' returns JSON with contents field
        name: 'AllOrigins'
    },
    {
        url: 'https://corsproxy.io/?',
        type: 'direct',  // 'direct' returns raw XML
        name: 'CorsProxy.io'
    }
    // Add more proxies here
]
```

The system tries each proxy in order until one succeeds.

### Fetched Data Includes
- Game names (primary + alternates)
- Publication year
- Player count (min/max)
- Play time (min/max/average)
- Minimum age
- Ratings (average, Bayes average, count, std dev, median)
- Rankings (overall, subcategories)
- Complexity weight (1-5 scale)
- Ownership stats (owned, wanting, wishing, trading)
- Categories (top 5)
- Mechanics (top 5)
- Designers (top 3)
- Artists (top 3)
- Description text
- Images (full, thumbnail)

## Rate Limiting & Performance

### Considerations
- BGG limits API calls to ~1 per second
- Large imports (100+ new games) can take 2+ minutes
- Progress indicator shows current fetch status
- User can continue after save (no need to wait)

### Best Practices
1. **Initial Import**: Let first import fetch all BGG data (takes time but worth it)
2. **Subsequent Imports**: Only new games will be fetched (faster)
3. **Cache Sharing**: Share your game-database.json file with others to save time
4. **Regular Updates**: Re-fetch games periodically to get updated ratings

## Error Handling

### What Happens on Error
- System retries up to 3 times per game
- If all retries fail, stores minimal info:
  ```json
  {
    "bggId": "123456",
    "name": "Unknown",
    "fetchError": "Error message",
    "lastFetchAttempt": "ISO timestamp"
  }
  ```
- Import continues even if some games fail
- Failed games can be re-fetched later

### Common Issues
- **CORS Errors**: If seeing CORS errors, verify the CORS proxy is configured in `game-database.js`
- **Rate Limiting**: If seeing many errors, system may be making requests too fast
- **Invalid BGG ID**: Some preview lists have incorrect BGG IDs
- **Network Issues**: Check internet connection
- **BGG Downtime**: BGG API occasionally goes offline
- **Proxy Service Down**: If allorigins.win is down, switch to alternative proxy (corsproxy.io)

## Future Enhancements

### Planned Features
1. **Automatic Refresh**: Option to refresh old cache entries (>30 days)
2. **Image Caching**: Download and store game images locally
3. **Version-Specific Data**: Fetch data for BGGVersionId (language editions)
4. **BGG Collection Sync**: Import from user's BGG collection
5. **Enhanced Stats**: More detailed statistics and analytics
6. **Export to Excel**: Export combined preview + BGG data

### Integration Points
- Can be used in future Game Stats page
- Data available for filtering/sorting
- Can power recommendations engine
- Supports offline mode (once cached)

## Troubleshooting

### Cache Not Working
1. Check browser console for errors
2. Verify game-database.js is loaded in index.html
3. Check GameDatabase is initialized (`window.GameDatabase`)

### Slow Imports
- Normal for first import of large lists (100+ games)
- Check progress indicator in metadata modal
- Don't close modal while fetching

### Missing Data on Cards
- Ensure GameDatabase is initialized in spiel-preview.js
- Check if BGG IDs are present in imported data
- Verify cache file exists and is loaded

### Fetch Failures
- Check network connection
- Verify BGG.com is accessible
- Review error count in cache statistics
- Try manual refresh for failed games

## Code Examples

### Manual Fetch
```javascript
// Fetch a single game
const gameInfo = await GameDatabase.getGameInfo('174430');

// Batch fetch
const gameIds = ['174430', '266192', '31260'];
const results = await GameDatabase.batchFetch(gameIds, (current, total) => {
  console.log(`Fetched ${current} of ${total}`);
});

// Check cache
const cached = GameDatabase.cache['174430'];
if (cached) {
  console.log(`Rating: ${cached.rating.average}`);
}

// Save cache
await GameDatabase.saveCache();
```

### Using in Display Code
```javascript
// In game card rendering
const bggData = game.BGGId && window.GameDatabase 
  ? window.GameDatabase.cache[game.BGGId] 
  : null;

if (bggData && bggData.rating) {
  const rating = bggData.rating.average.toFixed(1);
  // Display rating...
}
```

## Notes
- Cache is stored in browser memory (lost on page refresh unless saved to file)
- File operations require user interaction (browser security)
- BGG data is copyrighted by BoardGameGeek LLC
- This tool is for personal use only
