/**
 * Entry point. Development: `npm run server` (runs the TypeScript directly).
 * Hosting: `npm run build` (site -> dist/), `npm run build:server` (-> server-dist/main.js), then `npm start`.
 * Environment: PORT (default 3000), STATIC_DIR (default: the dist/ folder next to the server),
 * DATA_DIR (default ./data) holds accounts.json; PUBLIC_URL (default http://localhost:5173) is the site address used in login links;
 * SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM send the login e-mails (without SMTP_HOST, production disables e-mail sign-in).
 * GOOGLE_CLIENT_ID switches Google sign-in on; FACEBOOK_APP_ID + FACEBOOK_APP_SECRET switch Facebook sign-in on.
 * RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET + AD_REMOVAL_PRICE_PAISE switch the ad-removal payment on (RAZORPAY_WEBHOOK_SECRET for the webhook).
 * ADMIN_EMAILS (comma separated) may create and run tournaments.
 * TRUST_PROXY=1 when a reverse proxy sits in front (rate limits then use the X-Forwarded-For client address).
 */
import { existsSync } from 'fs';
import path from 'path';
import { startApp } from './app';
import { AccountStore } from './accounts/AccountStore';
import { AuthService } from './accounts/AuthService';
import { mailerFromEnv } from './accounts/Mailer';
import { GoogleSignIn } from './accounts/GoogleSignIn';
import { FacebookOAuth } from './accounts/FacebookOAuth';
import { Payments } from './accounts/Payments';
import { Ratings } from './accounts/Ratings';
import { TournamentService } from './tournaments/TournamentService';
import { RoomManager } from './RoomManager';

function findStaticDir(): string | undefined {
  const candidates = [
    process.env.STATIC_DIR,
    path.resolve(__dirname, '../dist'), // bundled: server-dist/main.js
    path.resolve(__dirname, '../../../dist'), // tsx: PROJECTS/SmartBeads/server/main.ts
  ];
  for (const c of candidates) if (c && existsSync(path.join(c, 'index.html'))) return c;
  return undefined;
}

// One bad request must never end every running game: log the fault and keep serving.
process.on('uncaughtException', (err) => console.error('[server] uncaught exception', err));
process.on('unhandledRejection', (err) => console.error('[server] unhandled rejection', err));

const staticDir = findStaticDir();
const port = Number(process.env.PORT ?? 3000);

const publicUrl = (process.env.PUBLIC_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const store = new AccountStore(path.resolve(process.env.DATA_DIR ?? 'data', 'accounts.json'));
const manager = new RoomManager();
const ratings = new Ratings(store, () => Date.now());
const tournaments = new TournamentService(store, manager, ratings, () => Date.now());
const price = Number(process.env.AD_REMOVAL_PRICE_PAISE);
const payments =
  process.env.RAZORPAY_KEY_ID &&
  process.env.RAZORPAY_KEY_SECRET &&
  Number.isInteger(price) &&
  price >= 100
    ? new Payments(
        store,
        process.env.RAZORPAY_KEY_ID,
        process.env.RAZORPAY_KEY_SECRET,
        price,
        process.env.RAZORPAY_WEBHOOK_SECRET,
        () => Date.now(),
      )
    : undefined;
const auth = new AuthService(store, mailerFromEnv(process.env), publicUrl, () => Date.now());

void startApp({
  port,
  staticDir,
  trustProxy: process.env.TRUST_PROXY === '1',
  auth,
  manager,
  ratings,
  tournaments,
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  payments,
  google: process.env.GOOGLE_CLIENT_ID ? new GoogleSignIn(process.env.GOOGLE_CLIENT_ID) : undefined,
  facebook:
    process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET
      ? new FacebookOAuth(
          process.env.FACEBOOK_APP_ID,
          process.env.FACEBOOK_APP_SECRET,
          `${publicUrl}/api/auth/facebook/callback`,
        )
      : undefined,
  publicOrigin: new URL(publicUrl).origin,
  secureCookies: publicUrl.startsWith('https://'),
}).then((app) => {
  console.log(`Smart Bead Chess server on port ${app.port} (site: ${staticDir ?? 'API only'})`);
});
