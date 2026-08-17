// Clears vault session cookies. Called:
//  - when the visitor answers "No" to the 18+ check (kick them out of "games")
//  - when the tab is closed/navigated away from (via navigator.sendBeacon),
//    so a returning visitor has to re-enter the password instead of the
//    session silently staying valid for the full 2-hour token lifetime.
//
// Body: { vault: 'kids' | 'games' | 'all' } — defaults to 'all'.

const COOKIE_NAMES = {
  kids: 'vault_token',
  games: 'vault_token_2',
  admin: 'admin_token',
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
  // sendBeacon sends a Blob with no Content-Type header set reliably across
  // browsers, so also handle a raw text body containing the vault name.
  const vaultKey = (body && body.vault) || 'all';

  const isProd = process.env.NODE_ENV === 'production';
  const names = vaultKey === 'all' ? Object.values(COOKIE_NAMES) : [COOKIE_NAMES[vaultKey]].filter(Boolean);

  const cookies = names.map((name) => [
    `${name}=`,
    'HttpOnly',
    'SameSite=Strict',
    'Path=/',
    'Max-Age=0',
    ...(isProd ? ['Secure'] : []),
  ].join('; '));

  res.setHeader('Set-Cookie', cookies);
  return res.status(200).json({ ok: true });
};
