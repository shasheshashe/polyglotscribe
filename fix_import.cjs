const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace("  LogOut,\\n  Share2,\\n  Share2,\\n  Share2,", "  LogOut,\n  Share2,");

fs.writeFileSync('src/App.tsx', code);
