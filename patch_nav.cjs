const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// We need to find the navigation area where "Live Dictation" and "Audio Upload" are rendered and add the Admin Dashboard button if the user is an admin.
// Let's find the header navigation buttons.
const searchStr = `          {/* File Upload Tab Button */}`;
const replaceStr = `          {/* File Upload Tab Button */}
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={\`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer \${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 border border-transparent hover:border-slate-700'
              }\`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin
            </button>
          )}`;

if (!code.includes('LayoutDashboard className=')) {
  code = code.replace(searchStr, replaceStr);
  code = code.replace("import { Mic, FileAudio, Settings, Settings2, Share2, Sparkles", "import { Mic, FileAudio, Settings, Settings2, Share2, Sparkles, LayoutDashboard");
  fs.writeFileSync('src/App.tsx', code);
}
