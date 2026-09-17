const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const shareFunction = `  const copyPublicLink = () => {
    const publicLink = 'https://ais-pre-llrc2cqk2snjfwztipirfq-825295273549.europe-west2.run.app';
    navigator.clipboard.writeText(publicLink).then(() => {
      showToast('Public link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };

`;

if (!content.includes('copyPublicLink')) {
  content = content.replace('  const handleSourceLanguageChange', shareFunction + '  const handleSourceLanguageChange');
}
if (!content.includes('Share2')) {
  content = content.replace('LogOut,', 'LogOut,\\n  Share2,');
}

if (!content.includes('btn-share-link')) {
  content = content.replace(/<button\\s+id="btn-logout"/, 
    '<button id="btn-share-link" onClick={copyPublicLink} className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all flex items-center gap-1.5 ml-2" title="Share Public Link"><Share2 className="w-3.5 h-3.5" /><span className="hidden md:inline">Share App</span></button><button id="btn-logout"'
  );
}

fs.writeFileSync('src/App.tsx', content);
