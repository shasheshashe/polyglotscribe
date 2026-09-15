const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Update the user role check
const searchStr = `
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
`;

const replaceStr = `
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          setUserRole(currentUser.email === 'negeseshambel@gmail.com' ? 'admin' : fetchedRole);
        }
`;

code = code.replace(searchStr, replaceStr);

fs.writeFileSync('src/App.tsx', code);
