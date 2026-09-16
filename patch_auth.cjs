const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

code = code.replace(
  "const email = username.includes('@') ? username : (username.toLowerCase() === 'shambel121419' ? 'negeseshambel@gmail.com' : `${username}@polyglotscribe.com`);",
  "const email = username;"
);

code = code.replace(
  "negeseshambel@gmail.com or username",
  "Email address"
);

code = code.replace(
  '<label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Username or Email</label>',
  '<label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Email</label>'
);

code = code.replace(
  /type="text"/g,
  'type="email"'
);

fs.writeFileSync('src/components/Auth.tsx', code);
