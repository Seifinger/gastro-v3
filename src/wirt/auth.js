// Betrieb-specific authentication: scrypt password hashes, signed session
// cookies, and CSRF tokens. No third-party auth dependency — node:crypto
// covers everything needed here.
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

let credentialsPath = path.join(process.cwd(), 'data', 'runtime', 'wirt-credentials.json');

export function setCredentialsPath(p) {
  credentialsPath = p;
}

function loadCredentials() {
  try {
    return JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function saveCredentials(creds) {
  mkdirSync(path.dirname(credentialsPath), { recursive: true });
  writeFileSync(credentialsPath, `${JSON.stringify(creds, null, 2)}\n`, 'utf-8');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored ?? '').split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// Called by the dashboard (agency side, DASHBOARD_TOKEN-protected) when a
// lead's site goes live, so the betrieb gets its own wirt-portal login.
export function setzeBetriebPasswort(slug, password) {
  if (!password || password.length < 10) throw new Error('Das Passwort muss mindestens 10 Zeichen haben.');
  const creds = loadCredentials();
  creds[slug] = hashPassword(password);
  saveCredentials(creds);
}

export function pruefeBetriebLogin(slug, password) {
  const creds = loadCredentials();
  const stored = creds[slug];
  if (!stored) return false;
  return verifyPassword(password, stored);
}

function sessionSecret() {
  const secret = process.env.WIRT_SESSION_SECRET;
  if (!secret) throw new Error('WIRT_SESSION_SECRET ist nicht gesetzt.');
  return secret;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function signSession(slug) {
  const payload = `${slug}.${Date.now() + SESSION_TTL_MS}`;
  const sig = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySession(token) {
  if (!token) return null;
  const parts = String(token).split('.');
  if (parts.length !== 3) return null;
  const [slug, expiry, sig] = parts;
  const payload = `${slug}.${expiry}`;
  const expected = createHmac('sha256', sessionSecret()).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const sigBuf = Buffer.from(sig, 'hex');
  if (expectedBuf.length !== sigBuf.length || !timingSafeEqual(expectedBuf, sigBuf)) return null;
  if (Date.now() > Number(expiry)) return null;
  return slug;
}

export function newCsrfToken() {
  return randomBytes(24).toString('hex');
}
