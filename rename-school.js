const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, 'src', 'app', '[school]');
const newTarget = path.join(__dirname, 'src', 'app', '_school_backup');

try {
    fs.renameSync(target, newTarget);
    console.log("Renamed successfully to _school_backup");
} catch (e) {
    console.error("Failed to rename:", e);
}
