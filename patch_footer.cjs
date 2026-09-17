const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const footerHtml = `
      {/* Footer */}
      <footer className="w-full text-center py-6 mt-auto border-t border-slate-800/60 flex flex-col gap-1 items-center justify-center relative z-10 bg-slate-950/50 backdrop-blur-sm">
        <p className="text-sm font-semibold text-slate-300 tracking-wide">
          Developed by Salale University Instructors &copy; 2026
        </p>
        <p className="text-xs text-slate-500 font-medium tracking-wider uppercase">
          Address: Fiche
        </p>
      </footer>

      {/* Floating Status Toast Notification */}
`;

code = code.replace("{/* Floating Status Toast Notification */}", footerHtml);

fs.writeFileSync('src/App.tsx', code);
