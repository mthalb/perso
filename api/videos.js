const { verify, getCookie } = require('../lib/auth');
const { getSignedReadUrl } = require('../lib/storage');
const { getManifest } = require('../lib/manifest');

// Add your videos here. `path` is the object's key inside your B2 bucket
// (e.g. upload to a "vault/" folder to match the default below).
// Videos added through the admin panel don't need to be listed here — they
// live in a manifest file in B2 and get merged in automatically below.
const VIDEOS = [
  { id: 'clip1', label: 'phonk', path: 'vault/MONTAGEM OSCURIDA - RVNGE (360p, h264).mp4' },
  { id: 'clip2', label: 'jack', path: 'vault/jack.mp4' },
  { id: 'clip2', label: '', path: 'vault/mbapeer.mp4' },
  { id: 'clip2', label: '', path: 'vault/no sig alc (online-video-cutter.com).mp4' },
  { id: 'clip2', label: '', path: 'vault/jack.mp4' },
];

// Second, 18+-gated gallery — gameplay clips etc).
// Upload these into a separate "vault2/" folder and list them here.
const VIDEOS_2 = [
   { id: 'pubg1', label: 'PUBG clip', path: 'vault/1412.mp4' },
   { id: 'pubg1', label: 'PUBG clip', path: 'vault/43.mp4' },
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/45.mp4' },
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/1709327-720p_Trim.mp4' },
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/4464fef0-763e-4843-be6c-1ec2f7549a23.mp4' }, 
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/grabnwatch.com_video.mp4' }, 
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/aagmal69clg.mp4' }, 
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/viqa.mp4' },
  { id: 'pubg1', label: 'PUBG clip', path: 'vault/alyx.mp4' },
   { id: 'pubg1', label: 'PUBG clip', path: 'vault/comt.mp4' },
];

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

const VAULTS = {
  kids: { cookieName: 'vault_token', videos: VIDEOS },
  games: { cookieName: 'vault_token_2', videos: VIDEOS_2 },
};

module.exports = async (req, res) => {
  const vaultKey = (req.query && req.query.vault) || 'kids';
  const vault = VAULTS[vaultKey];
  if (!vault) {
    return res.status(400).json({ error: 'Unknown vault' });
  }

  const token = getCookie(req, vault.cookieName);
  if (!verify(token, process.env.VAULT_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const uploaded = await getManifest(vaultKey);
    const allEntries = [...vault.videos, ...uploaded];

    const videos = await Promise.all(
      allEntries.map(async (v) => {
        const url = await getSignedReadUrl(v.path, SIGNED_URL_TTL_MS);
        return { id: v.id, label: v.label, src: url };
      })
    );

    return res.status(200).json({ videos });
  } catch (err) {
    console.error('Failed to sign video URLs:', err);
    return res.status(500).json({ error: 'Could not load videos' });
  }
};
