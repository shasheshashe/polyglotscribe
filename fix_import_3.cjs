const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.split("  LogOut,\\n  Share2,\\n  Share2,\\n  Share2,").join("  LogOut,\\n  Share2,");
code = code.split("LogOut,\\n  Share2,\\n  Share2,\\n  Share2,").join("LogOut,\\n  Share2,");
code = code.replace("  LogOut,\\n  Share2,\\n  Share2,\\n  Share2,", "  LogOut,\\n  Share2,");

// Let's just hard replace the exact string that is there
const brokenString = "  LogOut,\\n  Share2,\\n  Share2,\\n  Share2,";
code = code.replace(brokenString, "  LogOut,\\n  Share2,");

fs.writeFileSync('src/App.tsx', code);
