const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add showAuth state
code = code.replace(
  "const [user, setUser] = useState<any>(null);",
  "const [user, setUser] = useState<any>(null);\n  const [showAuth, setShowAuth] = useState(false);"
);

// 2. Change the if (!user) to if (showAuth)
code = code.replace(
  "  if (!user) {\n    return <Auth onAuthSuccess={() => {}} />;\n  }",
  "  if (showAuth) {\n    return <Auth onAuthSuccess={() => setShowAuth(false)} />;\n  }"
);

// 3. Fix the user email display to handle null user
code = code.replace(
  "{user.email?.split('@')[0]} • Afaan Oromoo • Amharic • English",
  "{user?.email?.split('@')[0] || 'Guest Mode'} • Afaan Oromoo • Amharic • English"
);

// 4. Change all the buttons in the header to be smaller
code = code.replace(
  /className={`px-3\.5 py-2 rounded-xl text-xs/g,
  "className={`px-2.5 py-1.5 rounded-lg text-[11px]"
);
code = code.replace(
  /className="px-3 py-2 rounded-xl text-xs/g,
  'className="px-2.5 py-1.5 rounded-lg text-[11px]'
);
// Shrink icons in header
code = code.replace(/<Mic className="w-3\.5 h-3\.5" \/>/g, '<Mic className="w-3 h-3" />');
code = code.replace(/<FileAudio className="w-3\.5 h-3\.5" \/>/g, '<FileAudio className="w-3 h-3" />');
code = code.replace(/<Activity className="w-3\.5 h-3\.5" \/>/g, '<Activity className="w-3 h-3" />');
code = code.replace(/<RefreshCw className="w-3\.5 h-3\.5" \/>/g, '<RefreshCw className="w-3 h-3" />');
code = code.replace(/<Share2 className="w-3\.5 h-3\.5" \/>/g, '<Share2 className="w-3 h-3" />');
code = code.replace(/<LogOut className="w-3\.5 h-3\.5" \/>/g, '<LogOut className="w-3 h-3" />');

// 5. Replace logout button with conditional login/logout
const logoutStr = `            <button
              id="btn-logout"
              onClick={() => signOut(auth)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center gap-1.5 ml-2"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden md:inline">Sign Out</span>
            </button>`;

const newAuthButtons = `            {!user ? (
              <button
                onClick={() => setShowAuth(true)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-1.5 ml-2 shadow-sm shadow-indigo-600/30"
                title="Sign In / Sign Up"
              >
                <LogIn className="w-3 h-3" />
                <span className="hidden md:inline">Sign In / Sign Up</span>
              </button>
            ) : (
              <button
                id="btn-logout"
                onClick={() => signOut(auth)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/60 transition-all flex items-center gap-1.5 ml-2"
                title="Sign Out"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}`;

code = code.replace(logoutStr, newAuthButtons);

// 6. Add LogIn to imports if missing
if (!code.includes('LogIn,')) {
  code = code.replace('LogOut,', 'LogOut,\n  LogIn,');
}

fs.writeFileSync('src/App.tsx', code);
