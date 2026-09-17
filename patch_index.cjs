const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');
const headAdditions = `
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon.svg" />
`;
code = code.replace('</head>', headAdditions + '</head>');
fs.writeFileSync('index.html', code);
