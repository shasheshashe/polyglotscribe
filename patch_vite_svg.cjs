const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');
code = code.replace(/\/pwa-192x192\.png/g, '/icon.svg');
code = code.replace(/\/pwa-512x512\.png/g, '/icon.svg');
code = code.replace(/sizes: '192x192'/g, "sizes: 'any'");
code = code.replace(/sizes: '512x512'/g, "sizes: 'any'");
code = code.replace(/type: 'image\/png'/g, "type: 'image/svg+xml'");
fs.writeFileSync('vite.config.ts', code);

// Create icon.svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#4f46e5"/>
  <path d="M256 128C211.8 128 176 163.8 176 208v96c0 44.2 35.8 80 80 80s80-35.8 80-80v-96c0-44.2-35.8-80-80-80zM384 256c0 70.7-57.3 128-128 128s-128-57.3-128-128H96c0 82.5 62.4 150.3 142.1 159.2V448h35.8v-32.8C353.6 406.3 416 338.5 416 256h-32z" fill="white"/>
</svg>`;
fs.mkdirSync('public', {recursive: true});
fs.writeFileSync('public/icon.svg', svg);
