const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('Share2')) {
  code = code.replace('LogOut,', 'LogOut,\\n  Share2,');
}

const copyLinkFunction = `
  const copyPublicLink = () => {
    const publicLink = 'https://ais-pre-llrc2cqk2snjfwztipirfq-825295273549.europe-west2.run.app';
    navigator.clipboard.writeText(publicLink).then(() => {
      showToast('Public link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };
`;
if (!code.includes('copyPublicLink')) {
  code = code.replace('const handleSourceLanguageChange = (lang: SupportedLanguage) => {', copyLinkFunction + '\\n  const handleSourceLanguageChange = (lang: SupportedLanguage) => {');
}

const shareButton = `
            <button
              id="btn-share-link"
              onClick={copyPublicLink}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all flex items-center gap-1.5 ml-2"
              title="Share Public Link"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Share App</span>
            </button>
            <button
              id="btn-logout"
`;

code = code.replace(/<button\\n\\s+id="btn-logout"/g, shareButton.trim());

fs.writeFileSync('src/App.tsx', code);
