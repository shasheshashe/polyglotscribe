const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(/LogOut,(?:\\s*|\\\\n\\s*)*Share2,(?:\\s*|\\\\n\\s*)*Share2,(?:\\s*|\\\\n\\s*)*Share2,/g, "LogOut,\n  Share2,");

fs.writeFileSync('src/App.tsx', code);
