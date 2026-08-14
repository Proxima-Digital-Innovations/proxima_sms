const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('_school_backup')) {
                results = results.concat(walk(file));
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(file, 'utf8');
            if (content.includes('params.school') || content.includes('schoolSlug') || content.match(/params.*:.*school:/)) {
                results.push(file);
            }
        }
    });
    return results;
}

const offending = walk('src/app');
console.log("Files with params.school or school param types:");
console.log(offending.join('\n'));
