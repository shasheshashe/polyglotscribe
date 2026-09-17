const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const shareFunction = `  const copyPublicLink = () => {
    const publicLink = 'https://ais-pre-llrc2cqk2snjfwztipirfq-825295273549.europe-west2.run.app';
    navigator.clipboard.writeText(publicLink).then(() => {
      showToast('Public link copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy link', 'error');
    });
  };`;

// Remove all occurrences
let parts = code.split(shareFunction);
if (parts.length > 2) {
  // Join the first and second with the function, but leave the rest without it
  code = parts[0] + shareFunction + parts.slice(1).join("");
}

fs.writeFileSync('src/App.tsx', code);
