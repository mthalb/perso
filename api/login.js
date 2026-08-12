const { sign } = require('../lib/auth');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const correctPassword = process.env.VAULT_PASSWORD;
  const secret = process.env.VAULT_SECRET;
  if (!correctPassword || !secret) {
    return res.status(500).json({ error: 'Server not configured. Set VAULT_PASSWORD and VAULT_SECRET.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const password = body && body.password;

  if (password !== correctPassword) {
    // Small delay to blunt naive brute-force attempts
    await new Promise((r) => setTimeout(r, 400));
    return res.status(401).json({ error: 'Incorrect password' });
  }

  const token = sign({ exp: Date.now() + TOKEN_TTL_MS }, secret);
  const isProd = process.env.NODE_ENV === 'production';

  res.setHeader('Set-Cookie', [
    `vault_token=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${TOKEN_TTL_MS / 1000}`,
    ...(isProd ? ['Secure'] : []),
  ].join('; '));

  return res.status(200).json({ ok: true });
};
