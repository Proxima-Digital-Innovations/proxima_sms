const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function convertToNaira(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace $ followed by a space or a number with ₦
  // This avoids replacing template literals like ${variable}
  // Be careful with jQuery-like $ usage, but there shouldn't be any in Next.js
  
  // Replace: $ 100 -> ₦ 100
  content = content.replace(/\$ /g, '₦ ');
  // Replace: $100 -> ₦100
  content = content.replace(/\$([0-9])/g, '₦$1');
  // Replace: \$ (escaped dollar in strings) -> ₦
  content = content.replace(/\\\$/g, '₦');
  
  // Also we saw `?` used in earlier grep results for some reason, 
  // maybe the terminal didn't render it, but I'll make sure we explicitly check `$`
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Converted NGN in:', filePath);
  }
}

const targetDirs = [
  path.join(__dirname, '..', 'src', 'app', 'dashboard'),
  path.join(__dirname, '..', 'src', 'components'),
];

targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    walkDir(dir, convertToNaira);
  }
});

console.log('Currency conversion to NGN complete.');
