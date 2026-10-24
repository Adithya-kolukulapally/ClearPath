const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET must be configured in production.');
}
const signingSecret = process.env.AUTH_SECRET || crypto.randomBytes(48).toString('hex');
const tokenLifetimeSeconds = 60 * 60 * 24 * 7;

async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = await scrypt(password, salt, 64);
  return { salt, hash: derivedKey.toString('hex') };
}

async function verifyPassword(password, salt, storedHash) {
  const { hash } = await hashPassword(password, salt);
  const attempted = Buffer.from(hash, 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return attempted.length === expected.length && crypto.timingSafeEqual(attempted, expected);
}

function createAccessToken(accountId) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: String(accountId), iat: issuedAt, exp: issuedAt + tokenLifetimeSeconds });
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', signingSecret).update(unsignedToken).digest('base64url');
  return `${unsignedToken}.${signature}`;
}

function verifyAccessToken(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const unsignedToken = `${parts[0]}.${parts[1]}`;
  const expectedSignature = crypto.createHmac('sha256', signingSecret).update(unsignedToken).digest();
  let suppliedSignature;
  let payload;
  try {
    suppliedSignature = Buffer.from(parts[2], 'base64url');
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) return null;
  if (!payload.sub || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

module.exports = { hashPassword, verifyPassword, createAccessToken, verifyAccessToken };
