const { verify, getCookie } = require('../lib/auth');
const { addToManifest } = require('../lib/manifest');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = getCookie(req, 'admin_token');
  if (!verify(token, process.env.VAULT_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const vaultKey = body && body.vault;
  const path = body && body.path;
  const label = (body && body.label) || '';

  if (!['kids', 'games'].includes(vaultKey) || !path) {
    return res.status(400).json({ error: 'Missing vault or path' });
  }

  const entry = {
    id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    path,
    addedAt: new Date().toISOString(),
  };

  try {
    const list = await addToManifest(vaultKey, entry);
    return res.status(200).json({ ok: true, entry, count: list.length });
  } catch (err) {
    console.error('Failed to update manifest:', err);
    return res.status(500).json({ error: 'Could not save video entry' });
  }
};
