const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  "export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true }, firebaseConfig.firestoreDatabaseId);",
  "export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);"
);

fs.writeFileSync('src/lib/firebase.ts', code);
