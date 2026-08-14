const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

fs.writeFileSync(path.join(__dirname, 'private.key'), privateKey);

const libPath = path.join(__dirname, '../src/lib/license-keys.ts');
const libContent = `// THIS PUBLIC KEY IS USED TO VERIFY LICENSES. 
// IT IS SAFE TO INCLUDE IN THE CODEBASE.
export const PUBLIC_KEY = \`${publicKey.trim()}\`;
`;

fs.writeFileSync(libPath, libContent);

console.log("Keys generated successfully!");
console.log("Private key saved to scratch/private.key (KEEP THIS SECRET!)");
console.log("Public key saved to src/lib/license-keys.ts");
