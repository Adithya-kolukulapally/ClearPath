const mongoose = require('mongoose');
const Account = require('../models/Account');
const { verifyAccessToken } = require('../services/authService');

module.exports = async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const tokenPayload = match && verifyAccessToken(match[1]);
  if (!tokenPayload) return res.status(401).json({ error: 'Please log in to continue.', code: 'AUTH_REQUIRED' });
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'Account services are unavailable. Check the database connection and try again.', code: 'AUTH_UNAVAILABLE' });
  }

  try {
    const account = await Account.findById(tokenPayload.sub).select('fullName email');
    if (!account) return res.status(401).json({ error: 'This account is no longer available. Please log in again.', code: 'ACCOUNT_NOT_FOUND' });
    req.account = account;
    next();
  } catch (error) {
    console.error('Account authorization failed:', error.message);
    return res.status(503).json({ error: 'Account services are temporarily unavailable.', code: 'AUTH_UNAVAILABLE' });
  }
};
