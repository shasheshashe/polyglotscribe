const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          setUserRole(currentUser.email === 'negeseshambel@gmail.com' ? 'admin' : fetchedRole);
        }
      } else {`;

const replaceStr = `      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const fetchedRole = userDoc.data().role;
          setUserRole(currentUser.email === 'negeseshambel@gmail.com' ? 'admin' : fetchedRole);
        } else if (currentUser.email === 'negeseshambel@gmail.com') {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      } else {`;

code = code.replace(targetStr, replaceStr);

fs.writeFileSync('src/App.tsx', code);
