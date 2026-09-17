const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

code = code.replace(
  "email: string;",
  "email: string;\n  fullName?: string;"
);

code = code.replace(
  "email: data.email,",
  "email: data.email,\n            fullName: data.fullName,"
);

code = code.replace(
  '<th className="px-4 py-3 font-semibold rounded-tl-lg">Email / Username</th>',
  '<th className="px-4 py-3 font-semibold rounded-tl-lg">User</th>'
);

code = code.replace(
  '<td className="px-4 py-3 text-slate-200 font-medium">{user.email}</td>',
  '<td className="px-4 py-3">\n                    <div className="font-medium text-slate-200">{user.fullName || "N/A"}</div>\n                    <div className="text-xs text-slate-500">{user.email}</div>\n                  </td>'
);

fs.writeFileSync('src/components/AdminDashboard.tsx', code);
