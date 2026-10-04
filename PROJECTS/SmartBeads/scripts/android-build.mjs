// Android build driver (B3). Usage: node PROJECTS/SmartBeads/scripts/android-build.mjs <debug|release>
//   debug   -> android/app/build/outputs/apk/debug/app-debug.apk (SB_APP_URL may point at a dev server, e.g. http://10.0.2.2:3001)
//   release -> signed .aab (needs android/keystore.properties or SB_KEYSTORE_* env vars; URL must be https; SB_VERSION_CODE must rise every upload)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mode = process.argv[2];
if (mode !== 'debug' && mode !== 'release') {
  console.error('usage: android-build.mjs <debug|release>');
  process.exit(2);
}
const root = path.resolve(import.meta.dirname, '..', '..', '..');
const androidDir = path.join(root, 'android');
const url = process.env.SB_APP_URL ?? 'https://smartbeadchess.com';

if (mode === 'release') {
  if (!url.startsWith('https://')) {
    console.error(`Release builds must use https (SB_APP_URL=${url}).`);
    process.exit(1);
  }
  const hasProps = fs.existsSync(path.join(androidDir, 'keystore.properties'));
  if (!hasProps && !process.env.SB_KEYSTORE_FILE) {
    console.error('No signing details: create android/keystore.properties (gitignored) or set SB_KEYSTORE_FILE/_PASSWORD/SB_KEY_ALIAS/SB_KEY_PASSWORD.');
    process.exit(1);
  }
}

function findJdk21() {
  if (process.env.JAVA_HOME && /(17|21)/.test(path.basename(process.env.JAVA_HOME))) return process.env.JAVA_HOME;
  const base = 'C:/Program Files/Eclipse Adoptium';
  if (fs.existsSync(base)) {
    const d = fs.readdirSync(base).find((n) => n.startsWith('jdk-21') || n.startsWith('jdk-17'));
    if (d) return path.join(base, d);
  }
  return null;
}
const jdk = findJdk21();
if (!jdk) {
  console.error('No JDK 17/21 found. Install one (Android Studio\'s bundled JDK 25 is too new for this Gradle) or set JAVA_HOME.');
  process.exit(1);
}
const sdk = process.env.ANDROID_HOME ?? path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'Android', 'Sdk');
fs.writeFileSync(path.join(androidDir, 'local.properties'), `sdk.dir=${sdk.split(path.sep).join('/')}\n`);

// Offline page (shown when the site cannot load). Capacitor serves only this one file from https://localhost, so it must be self-contained:
// the site URL for the Try again button is written into it here.
const shell = path.join(root, 'PROJECTS', 'SmartBeads', 'android-shell');
const page = fs.readFileSync(path.join(shell, 'offline.template.html'), 'utf8').replace('__APP_URL__', JSON.stringify(url));
fs.mkdirSync(path.join(shell, 'www'), { recursive: true });
fs.writeFileSync(path.join(shell, 'www', 'offline.html'), page);
fs.writeFileSync(path.join(shell, 'www', 'index.html'), page);

const env = { ...process.env, JAVA_HOME: jdk, SB_APP_URL: url };
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('npx', ['cap', 'sync', 'android'], root);
run(`"${path.join(androidDir, os.platform() === 'win32' ? 'gradlew.bat' : 'gradlew')}"`,[mode === 'debug' ? 'assembleDebug' : 'bundleRelease'], androidDir);
console.log(mode === 'debug' ? 'APK: android/app/build/outputs/apk/debug/app-debug.apk' : 'AAB: android/app/build/outputs/bundle/release/app-release.aab');
