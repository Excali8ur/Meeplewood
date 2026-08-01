# BGG Data Fetching - Troubleshooting Guide

## Quick Start
When importing GeekPreview CSV files, you can optionally fetch detailed game information from BoardGameGeek. This feature requires a CORS proxy service to work in web browsers.

✅ **Good News**: The app is pre-configured to work automatically with a free CORS proxy!

## How It Works

1. **Import a CSV** → Settings → Import BGG GeekPreview List
2. **Check the box**: "Fetch detailed game information from BGG" ✓
3. **Fill in metadata** (Year, Convention, User)
4. **Click Save** → The app automatically tries multiple CORS proxies to fetch data
5. **Wait for progress bar** to complete (shows success/error count and which proxy is being used)
6. **File is saved** with enriched data

### Automatic Proxy Fallback

The app tries multiple CORS proxies automatically:
1. **AllOrigins** (api.allorigins.win) - Tried first
2. **CorsProxy.io** (corsproxy.io) - Automatic fallback
3. If both fail, retries up to 3 times

You'll see messages like "Fetching game X using AllOrigins..." in the console.

## Common Issues

### 🔴 CORS Errors
**Symptoms**: Console shows errors like "blocked by CORS policy" or "net::ERR_FAILED 522"

**Cause**: CORS proxies might be down or overloaded

**Solution**:
The app now tries multiple proxies automatically! If you still see errors:
1. Check browser console to see which proxies were tried
2. Wait a few minutes and try again (proxies can be temporarily overloaded)
3. Try with fewer games first (test import)
4. Check if BGG.com itself is accessible in your browser

**Manual proxy configuration** (advanced):
- Edit `scripts/game-database.js`
- Modify the `corsProxies` array to add/remove/reorder proxies
- Available options:
  ```javascript
  { url: 'https://api.allorigins.win/get?url=', type: 'allorigins', name: 'AllOrigins' }
  { url: 'https://corsproxy.io/?', type: 'direct', name: 'CorsProxy.io' }
  ```

### ⚠️ Some Games Fail to Fetch
**Symptoms**: Progress shows "X ok, Y errors"

**This is normal** - some games might have:
- Invalid BGG IDs in the source CSV
- BGG rate limiting
- Temporary BGG API issues

**What happens**:
- Failed games are cached with "Unknown" name
- Your import continues successfully
- Preview page still works, just missing some BGG data
- You can manually retry failed games later

### 🐌 Very Slow Fetching
**This is expected** for first-time imports:
- BGG rate limit: 1 request per second
- 100 games = ~2 minutes
- 500 games = ~8-10 minutes
- 1000+ games = 15-20 minutes

**Speed improvements**:
- Only new games are fetched (subsequent imports are faster)
- Share your `game-database.json` file with others
- Load existing cache before importing

### 📊 No BGG Data Shows on Preview Page
**Check**:
1. Did fetching complete successfully?
2. Is `game-database.js` loaded in `index.html`?
3. Open browser console - any errors?
4. Check Settings → Game Database Cache stats

**Fix**:
- Reload the preview page
- Check if games have valid BGG IDs
- Verify cache was saved (Settings → Save Game Database)

## Advanced: Disabling BGG Fetching

If you don't want to use BGG data fetching:

1. **During Import**: Uncheck "Fetch detailed game information from BGG"
2. **Permanent**: Edit `scripts/game-database.js`:
   ```javascript
   corsProxy: '', // Empty string disables proxy
   ```

## Alternative: Manual BGG Fetch

You can manually trigger fetches after import:

1. Go to **Settings → Game Database Cache**
2. Click **Refresh Cache Stats** to see current state
3. Games with `fetchError` can be manually re-fetched by:
   - Re-importing the same CSV (only failed games retry)
   - Using browser console: `await GameDatabase.getGameInfo('123456', true)`

## Privacy & Security

**What data is sent**:
- Only BGG game IDs (numbers like "174430")
- No personal information
- No usernames or passwords

**Where it goes**:
- Through CORS proxy (allorigins.win or corsproxy.io)
- To BoardGameGeek API
- Response cached locally in your browser

**Can I trust the CORS proxy?**
- allorigins.win is a well-known, open-source service
- It only adds CORS headers, doesn't store data
- If concerned, you can:
  - Use your own CORS proxy
  - Disable BGG fetching
  - Use a browser extension to disable CORS (dev only)

## For Developers

### Testing CORS Proxy
```javascript
// In browser console
const testUrl = 'https://api.allorigins.win/raw?url=' + 
  encodeURIComponent('https://boardgamegeek.com/xmlapi2/thing?id=174430&stats=1');
const response = await fetch(testUrl);
const text = await response.text();
console.log(text); // Should show BGG XML data
```

### Running Without CORS Issues
- Use a local server with CORS headers
- Deploy to a domain with backend proxy
- Use browser extension like "CORS Unblock" (dev only)
- Run Chrome with `--disable-web-security` flag (VERY insecure, dev only)

### Custom CORS Proxy
If you have your own proxy:
```javascript
// In game-database.js
corsProxy: 'https://your-proxy.com/proxy?url=',
```

Your proxy should:
- Accept URL as query parameter
- Fetch from BGG
- Add CORS headers to response
- Return raw BGG XML

## Support

**Still having issues?**
1. Check browser console for detailed errors
2. Try in a different browser
3. Verify internet connection
4. Check if BGG.com is accessible
5. Report issue with console error log

## Quick FAQ

**Q: Do I need to fetch BGG data?**
A: No, it's optional. Preview lists work fine without it.

**Q: Will my imports break if fetching fails?**
A: No, imports continue even if all BGG fetches fail.

**Q: Can I fetch data later?**
A: Yes, re-import the same CSV with fetch enabled.

**Q: How much data does it download?**
A: ~2-5KB per game (XML data with ratings, mechanics, etc.)

**Q: Is the cache permanent?**
A: Only if you save it (Settings → Save Game Database). Otherwise it's lost on page refresh.

**Q: Can I share my cache?**
A: Yes! Save your `game-database.json` and share with others.
