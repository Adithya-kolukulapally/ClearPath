const express = require('express');
const mongoose = require('mongoose');
const Account = require('../models/Account');
const authenticate = require('../middleware/authenticate');
const { hashPassword, verifyPassword, createAccessToken } = require('../services/authService');

const router = express.Router();
const attempts = new Map();
const attemptWindowMs = 15 * 60 * 1000;
const maxAttempts = 15;

function limitAuthAttempts(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter(timestamp => now - timestamp < attemptWindowMs);
  if (recent.length >= maxAttempts) {
    res.set('Retry-After', String(Math.ceil((attemptWindowMs - (now - recent[0])) / 1000)));
    return res.status(429).json({ error: 'Too many sign-in attempts. Please wait a little and try again.', code: 'AUTH_RATE_LIMITED' });
  }
  recent.push(now);
  attempts.set(key, recent);
  next();
}

function accountResponse(account) {
  return {
    token: createAccessToken(account._id),
    user: { id: String(account._id), name: account.fullName, email: account.email }
  };
}

router.post('/signup', limitAuthAttempts, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Sign-up is unavailable until the database connects. Please try again shortly.', code: 'AUTH_UNAVAILABLE' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Enter your name (2–80 characters).', code: 'INVALID_NAME' });
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.', code: 'INVALID_EMAIL' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Your password must be between 8 and 128 characters.', code: 'INVALID_PASSWORD' });

  try {
    if (await Account.exists({ email })) return res.status(409).json({ error: 'An account already exists for this email. Log in instead.', code: 'ACCOUNT_EXISTS' });
    const { salt, hash } = await hashPassword(password);
    const account = await Account.create({ fullName: name, email, passwordSalt: salt, passwordHash: hash });
    return res.status(201).json(accountResponse(account));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account already exists for this email. Log in instead.', code: 'ACCOUNT_EXISTS' });
    console.error('Account creation failed:', error.message);
    return res.status(500).json({ error: 'We couldn’t create your account. Please try again.', code: 'SIGNUP_FAILED' });
  }
});

router.post('/login', limitAuthAttempts, async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Log-in is unavailable until the database connects. Please try again shortly.', code: 'AUTH_UNAVAILABLE' });
  }
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password || email.length > 254 || password.length > 128) {
    return res.status(400).json({ error: 'Enter your email and password.', code: 'INVALID_CREDENTIALS' });
  }

  try {
    const account = await Account.findOne({ email }).select('+passwordHash +passwordSalt');
    const passwordMatches = account && await verifyPassword(password, account.passwordSalt, account.passwordHash);
    if (!passwordMatches) return res.status(401).json({ error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' });
    return res.json(accountResponse(account));
  } catch (error) {
    console.error('Account login failed:', error.message);
    return res.status(500).json({ error: 'We couldn’t log you in. Please try again.', code: 'LOGIN_FAILED' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: { id: String(req.account._id), name: req.account.fullName, email: req.account.email } });
});

module.exports = router;
