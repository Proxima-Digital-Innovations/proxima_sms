const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFile = path.join(logDir, `app-dev.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

logStream.write(`\n\n--- SERVER START: ${new Date().toISOString()} ---\n\n`);
console.log(`Starting Next.js dev server... Logs are being captured to logs/app-dev.log`);

// Spawn next dev process
const child = spawn('npm', ['run', 'dev-raw'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
});

child.stdout.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
});

child.stderr.on('data', (data) => {
    process.stderr.write(data);
    logStream.write(data);
});

child.on('close', (code) => {
    console.log(`\nChild process exited with code ${code}`);
    logStream.end();
});
