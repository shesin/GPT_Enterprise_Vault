import type { CapacitorConfig } from '@capacitor/cli';

// Android app = a Capacitor wrap that loads the hosted site (decision: server.url, 2026-10-03, Claude).
// Cookies, /api and /ws therefore stay on the site's own origin. webDir is only the offline fallback shell.
const config: CapacitorConfig = {
  appId: 'com.smartbeadchess.app',
  appName: 'Smart Bead Chess',
  webDir: 'PROJECTS/SmartBeads/android-shell',
  server: {
    url: process.env.SB_APP_URL ?? 'https://smartbeadchess.com',
    androidScheme: 'https',
    cleartext: (process.env.SB_APP_URL ?? '').startsWith('http://'), // dev builds against a LAN/emulator server only
    errorPath: 'offline.html',
  },
  android: { allowMixedContent: false },
};

export default config;
