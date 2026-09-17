const fs = require('fs');

// Update App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');

appCode = appCode.replace(
  'className="h-10 w-auto object-contain bg-white rounded-lg p-1"',
  'className="h-7 w-auto object-contain bg-white rounded-md p-0.5"'
);

appCode = appCode.replace(
  '<h1 className="text-xl font-black tracking-tight text-white">Multilingual Scribe</h1>',
  '<h1 className="text-base font-black tracking-tight text-white">Multilingual Scribe</h1>'
);

appCode = appCode.replace(
  '<p className="text-slate-400 text-xs font-normal">',
  '<p className="text-slate-400 text-[10px] font-medium">'
);

fs.writeFileSync('src/App.tsx', appCode);

// Update Auth.tsx
let authCode = fs.readFileSync('src/components/Auth.tsx', 'utf8');

authCode = authCode.replace(
  'className="h-16 w-auto object-contain bg-white rounded-2xl p-1.5 shadow-lg shadow-indigo-500/10"',
  'className="h-10 w-auto object-contain bg-white rounded-xl p-1 shadow-md shadow-indigo-500/10"'
);

authCode = authCode.replace(
  '<h1 className="text-2xl font-black tracking-tight text-white">Multilingual Scribe</h1>',
  '<h1 className="text-lg font-black tracking-tight text-white mt-2">Multilingual Scribe</h1>'
);

fs.writeFileSync('src/components/Auth.tsx', authCode);
