/**
 * Guards for the Android wrap (Part B): package ID, hosted-site URL, signing material never in the repo,
 * and the release build refusing unsafe inputs.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('Android wrap', () => {
  it('uses the agreed package ID in the Capacitor config and the Gradle project', () => {
    expect(read('capacitor.config.ts')).toContain("appId: 'com.smartbeadchess.app'");
    expect(read('android/app/build.gradle')).toContain('applicationId "com.smartbeadchess.app"');
  });

  it('loads the hosted https site by default and only allows cleartext for an http dev URL', () => {
    const cfg = read('capacitor.config.ts');
    expect(cfg).toContain("process.env.SB_APP_URL ?? 'https://smartbeadchess.com'");
    expect(cfg).toContain("cleartext: (process.env.SB_APP_URL ?? '').startsWith('http://')");
    expect(cfg).toContain("errorPath: 'offline.html'");
    expect(fs.existsSync(path.join(ROOT, 'PROJECTS/SmartBeads/android-shell/offline.html'))).toBe(
      true,
    );
  });

  it('ignores keystores, build outputs and signing properties', () => {
    const ignore = read('.gitignore');
    for (const entry of [
      '*.jks',
      '*.keystore',
      '*.aab',
      '*.apk',
      'android/keystore.properties',
      'android/local.properties',
      'android/app/build/',
    ]) {
      expect(ignore).toContain(entry);
    }
  });

  it('keeps no keystore, password or build output tracked by git', () => {
    const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
    expect(
      tracked.filter(
        (f) => /\.(jks|keystore|aab|apk)$/i.test(f) || /keystore\.properties$/.test(f),
      ),
    ).toEqual([]);
    expect(tracked.some((f) => f.startsWith('android/app/build/'))).toBe(false);
  });

  it('reads release signing only from keystore.properties or env, never literals', () => {
    const gradle = read('android/app/build.gradle');
    expect(gradle).toContain("rootProject.file('keystore.properties')");
    expect(gradle).toContain("'SB_KEYSTORE_PASSWORD'");
    expect(gradle).not.toMatch(/storePassword\s+["'][^"']+["']/);
    expect(gradle).not.toMatch(/keyPassword\s+["'][^"']+["']/);
  });

  const build = (env: Record<string, string>) =>
    spawnSync(process.execPath, ['PROJECTS/SmartBeads/scripts/android-build.mjs', 'release'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, SB_KEYSTORE_FILE: '', ...env },
    });

  it('refuses a release build against a non-https URL', () => {
    const r = build({ SB_APP_URL: 'http://10.0.2.2:3001' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('must use https');
  });

  it('refuses a release build without signing details', () => {
    if (fs.existsSync(path.join(ROOT, 'android/keystore.properties'))) return; // owner machine with a real keystore file
    const r = build({ SB_APP_URL: 'https://smartbeadchess.com' });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('No signing details');
  });
});
