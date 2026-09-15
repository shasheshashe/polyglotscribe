const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const renderCode = `
        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && userRole === 'admin' && (
          <AdminDashboard />
        )}
`;
if (!code.includes('TAB 3: ADMIN DASHBOARD')) {
  code = code.replace(
    "      </main>",
    renderCode + "      </main>"
  );
}

fs.writeFileSync('src/App.tsx', code);
