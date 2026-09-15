const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(
  "    },\n  };\n});",
  "    },\n    build: {\n      chunkSizeWarningLimit: 2000,\n    },\n  };\n});"
);

fs.writeFileSync('vite.config.ts', code);
