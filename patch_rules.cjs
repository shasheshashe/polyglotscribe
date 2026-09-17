const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

// Update isValidUser to allow fullName
code = code.replace(
  "return data.keys().hasAll(['email', 'role', 'createdAt'])",
  "return data.keys().hasAll(['email', 'role', 'createdAt'])"
);

code = code.replace(
  "&& data.keys().size() == 3",
  "&& (data.keys().size() == 3 || (data.keys().hasAll(['fullName']) && data.keys().size() == 4 && data.fullName is string))"
);

fs.writeFileSync('firestore.rules', code);
