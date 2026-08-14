const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'app', '[school]');
const destDir = path.join(__dirname, 'src', 'app');

if (fs.existsSync(srcDir)) {
    const items = fs.readdirSync(srcDir);
    for (const item of items) {
        const srcPath = path.join(srcDir, item);
        const destPath = path.join(destDir, item);
        
        if (fs.existsSync(destPath)) {
            console.log(`Conflict: ${destPath} already exists. Renaming existing to .old`);
            try {
                fs.renameSync(destPath, destPath + '.old');
            } catch (e) {
                console.log("Could not rename existing", e);
            }
        }
        
        console.log(`Copying ${srcPath} to ${destPath}`);
        try {
            fs.cpSync(srcPath, destPath, { recursive: true });
        } catch (e) {
            console.log("Could not copy", e);
        }
    }
} else {
    console.log("Directory does not exist.");
}
