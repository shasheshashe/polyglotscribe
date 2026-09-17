const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

const importPWA = "import { VitePWA } from 'vite-plugin-pwa';\n";
if (!code.includes('VitePWA')) {
  code = importPWA + code;
  code = code.replace('plugins: [react(), tailwindcss()],', `plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: { enabled: true },
        manifest: {
          name: 'Multilingual Scribe',
          short_name: 'Scribe',
          description: 'Horn of Africa Speech Dictator & Voice Synthesis',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],`);
  fs.writeFileSync('vite.config.ts', code);
}
