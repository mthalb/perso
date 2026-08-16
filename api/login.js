const { sign } = require('../lib/auth');

const TOKEN_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

// Two independent vaults, each with its own password/cookie:
//  - "kids": the original gallery (VAULT_PASSWORD / vault_token)
//  - "games": the second, 18+ gated gallery (VAULT_PASSWORD_2 / vault_token_2)
const VAULTS = {
  kids: { passwordEnv: 'VAULT_PASSWORD', cookieName: 'vault_token' },
  games: { passwordEnv: 'VAULT_PASSWORD_2', cookieName: 'vault_token_2' },
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const vaultKey = (body && body.vault) || 'kids';
  const vault = VAULTS[vaultKey];
  if (!vault) {
    return res.status(400).json({ error: 'Unknown vault' });
  }

  const correctPassword = process.env[vault.passwordEnv];
  const secret = process.env.VAULT_SECRET;
  if (!correctPassword || !secret) {
    return res.status(500).json({ error: `Server not configured. Set ${vault.passwordEnv} and VAULT_SECRET.` });
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
    `${vault.cookieName}=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    `Max-Age=${TOKEN_TTL_MS / 1000}`,
    ...(isProd ? ['Secure'] : []),
  ].join('; '));

  return res.status(200).json({ ok: true });
};
