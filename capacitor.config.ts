import type { CapacitorConfig } from '@capacitor/cli';

// Android app = a Capacitor wrap that loads the hosted site (decision: server.url, 2026-10-03, Claude).
// Cookies, /api and /ws therefore stay on the site's own origin. webDir is only the offline fallback shell.
const appUrl = process.env.SB_APP_URL ?? 'https://smartbeadchess.com';

const config: CapacitorConfig = {
  appId: 'com.smartbeadchess.app',
  appName: 'Smart Bead Chess',
  webDir: 'PROJECTS/SmartBeads/android-shell/www',
  server: {
    url: appUrl,
    allowNavigation: [new URL(appUrl).host], // the offline page (served from https://localhost) must be able to send the player back to the site
    androidScheme: 'https',
    cleartext: appUrl.startsWith('http://'), // dev builds against a LAN/emulator server only
    errorPath: 'offline.html',
  },
  android: { allowMixedContent: false },
};

export default config;
