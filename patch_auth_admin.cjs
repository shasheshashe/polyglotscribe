const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

// Change the email extraction
code = code.replace(
  "const email = username;",
  "const email = username.toLowerCase() === 'shambel121419' ? 'negeseshambel@gmail.com' : username;"
);

// Change the input type from email to text so the browser doesn't block "Shambel121419"
code = code.replace(
  /type="email"/g,
  'type="text"'
);

// Add a placeholder to indicate they can use email or username
code = code.replace(
  'placeholder="Email address"',
  'placeholder="Email address (or admin username)"'
);

// Add a placeholder to indicate they can use email or username
code = code.replace(
  '<label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Email</label>',
  '<label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Email / Admin Username</label>'
);


fs.writeFileSync('src/components/Auth.tsx', code);
