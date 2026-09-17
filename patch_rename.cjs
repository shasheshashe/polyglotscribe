const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  '<h1 className="text-xl font-black tracking-tight text-white">Salale Polyglot</h1>',
  '<h1 className="text-xl font-black tracking-tight text-white">Multilingual Scribe</h1>'
);
fs.writeFileSync('src/App.tsx', appCode);

// Patch Auth.tsx
let authCode = fs.readFileSync('src/components/Auth.tsx', 'utf8');
authCode = authCode.replace(
  '<h1 className="text-2xl font-black tracking-tight text-white">PolyglotScribe</h1>',
  '<h1 className="text-2xl font-black tracking-tight text-white">Multilingual Scribe</h1>'
);
authCode = authCode.replace(
  '<div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md shadow-indigo-500/20 text-white mb-4">\n            <Languages className="w-8 h-8" />\n          </div>',
  '<div className="mb-4">\n            <img \n              src="/logo.jpg" \n              alt="Logo" \n              className="h-16 w-auto object-contain bg-white rounded-2xl p-1.5 shadow-lg shadow-indigo-500/10"\n              onError={(e) => {\n                e.currentTarget.src = \'https://placehold.co/100x100/1e293b/ffffff?text=MS\';\n              }}\n            />\n          </div>'
);
fs.writeFileSync('src/components/Auth.tsx', authCode);

// Patch index.html
let htmlCode = fs.readFileSync('index.html', 'utf8');
htmlCode = htmlCode.replace(/PolyglotScribe/g, 'Multilingual Scribe');
fs.writeFileSync('index.html', htmlCode);

// Patch metadata.json
let metaCode = fs.readFileSync('metadata.json', 'utf8');
metaCode = metaCode.replace(/"name": "PolyglotScribe"/g, '"name": "Multilingual Scribe"');
fs.writeFileSync('metadata.json', metaCode);

