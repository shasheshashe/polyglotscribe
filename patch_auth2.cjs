const fs = require('fs');
let code = fs.readFileSync('src/components/Auth.tsx', 'utf8');

code = code.replace(
  "const [username, setUsername] = useState('');",
  "const [username, setUsername] = useState('');\n  const [fullName, setFullName] = useState('');"
);

code = code.replace(
  "email: userCredential.user.email,",
  "email: userCredential.user.email,\n          fullName: fullName,"
);

code = code.replace(
  '<form onSubmit={handleAuth} className="space-y-4">',
  `<form onSubmit={handleAuth} className="space-y-4">\n          {!isLogin && (\n            <div className="space-y-1.5">\n              <label className="text-xs font-bold text-slate-300 uppercase tracking-wide">Full Name</label>\n              <div className="relative">\n                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">\n                  <User className="h-4 w-4 text-slate-500" />\n                </div>\n                <input\n                  type="text"\n                  required={!isLogin}\n                  value={fullName}\n                  onChange={(e) => setFullName(e.target.value)}\n                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"\n                  placeholder="John Doe"\n                />\n              </div>\n            </div>\n          )}`
);

code = code.replace(
  '<User className="h-4 w-4 text-slate-500" />',
  '<Mail className="h-4 w-4 text-slate-500" />'
);

fs.writeFileSync('src/components/Auth.tsx', code);
