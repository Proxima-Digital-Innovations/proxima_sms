const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.next')) {
                results = results.concat(walk(file));
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(file, 'utf8');
            if (!content.includes('use client') && !content.includes('use server')) {
                // If it's a server component and uses hooks
                if (content.includes('useState(') || content.includes('useEffect(') || content.includes('useContext(') || content.includes('useRef(')) {
                    results.push(file);
                }
            }
        }
    });
    return results;
}

const offending = walk('src');
console.log("Files missing use client:");
console.log(offending.join('\n'));
