const { verify, getCookie } = require('../lib/auth');
const { getSignedUploadUrl } = require('../lib/storage');

const UPLOAD_URL_TTL_MS = 10 * 60 * 1000; // 10 minutes — plenty for a video PUT

const FOLDERS = { kids: 'vault', games: 'vault2' };

function sanitizeFilename(name) {
  return String(name || 'video.mp4')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-120); // keep it short and B2-safe
}

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
  const folder = FOLDERS[vaultKey];
  if (!folder) {
    return res.status(400).json({ error: 'Unknown vault' });
  }

  const filename = sanitizeFilename(body && body.filename);
  const contentType = (body && body.contentType) || 'video/mp4';
  const key = `${folder}/${Date.now()}-${filename}`;

  try {
    const uploadUrl = await getSignedUploadUrl(key, contentType, UPLOAD_URL_TTL_MS);
    return res.status(200).json({ uploadUrl, key });
  } catch (err) {
    console.error('Failed to create upload URL:', err);
    return res.status(500).json({ error: 'Could not create upload URL' });
  }
};
