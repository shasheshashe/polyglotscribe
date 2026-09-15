const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  "function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }",
  "function isAdmin() { return isSignedIn() && (request.auth.token.email == 'negeseshambel@gmail.com' || (exists(/databases/$(database)/documents/users/$(request.auth.uid)) && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')); }"
);

fs.writeFileSync('firestore.rules', code);
