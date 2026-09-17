const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const shareButton = `            <button
              id="btn-share-link"
              onClick={copyPublicLink}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all flex items-center gap-1.5 ml-2"
              title="Share Public Link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Share App</span>
            </button>
            <button
              id="btn-logout"`;

code = code.replace(/\\s+<button\\s+id="btn-logout"/, "\\n" + shareButton);
fs.writeFileSync('src/App.tsx', code);
