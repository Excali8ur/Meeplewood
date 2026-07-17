// Script to normalize priority values in SPIEL-Combined.json
// Converts 'N/A' and '0' to '' (empty string) for consistency

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/SPIEL-Combined.json');

// Read the file
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading file:', err);
        return;
    }
    
    try {
        const jsonData = JSON.parse(data);
        let changesCount = 0;
        
        // Process each game
        jsonData.games.forEach(game => {
            if (game.entries && Array.isArray(game.entries)) {
                game.entries.forEach(entry => {
                    if (entry.priority === 'N/A' || entry.priority === '0') {
                        console.log(`Normalizing priority for ${game.Title} (${entry.year} ${entry.convention}): "${entry.priority}" -> ""`);
                        entry.priority = '';
                        changesCount++;
                    }
                });
            }
        });
        
        if (changesCount > 0) {
            // Create backup
            const backupPath = filePath.replace('.json', `-backup-${Date.now()}.json`);
            fs.writeFileSync(backupPath, data);
            console.log(`\nBackup created: ${backupPath}`);
            
            // Write normalized data
            const normalizedData = JSON.stringify(jsonData, null, 2);
            fs.writeFileSync(filePath, normalizedData);
            
            console.log(`\n✅ Successfully normalized ${changesCount} priority values!`);
            console.log(`📄 Updated file: ${filePath}`);
        } else {
            console.log('\nNo changes needed - all priorities are already normalized.');
        }
        
    } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
    }
});
