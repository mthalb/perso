const { verify, getCookie } = require('../lib/auth');
const { getManifest, removeFromManifest } = require('../lib/manifest');

module.exports = async (req, res) => {
  const token = getCookie(req, 'admin_token');
  if (!verify(token, process.env.VAULT_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const vaultKey = req.query && req.query.vault;
    if (!['kids', 'games'].includes(vaultKey)) {
      return res.status(400).json({ error: 'Unknown vault' });
    }
    const list = await getManifest(vaultKey);
    return res.status(200).json({ videos: list });
  }

  if (req.method === 'DELETE') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const vaultKey = body && body.vault;
    const id = body && body.id;
    if (!['kids', 'games'].includes(vaultKey) || !id) {
      return res.status(400).json({ error: 'Missing vault or id' });
    }
    const list = await removeFromManifest(vaultKey, id);
    // Note: this only removes the entry from the list — the file itself
    // stays in B2. Delete it manually there if you want to reclaim space.
    return res.status(200).json({ ok: true, videos: list });
  }

  res.setHeader('Allow', 'GET, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
