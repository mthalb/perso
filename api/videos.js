const { verify, getCookie } = require('../lib/auth');
const { getSignedReadUrl } = require('../lib/storage');

// Add your videos here. `path` is the object's key inside your B2 bucket
// (e.g. upload to a "vault/" folder to match the default below).
const VIDEOS = [
  { id: 'clip1', label: 'phonk', path: 'vault/MONTAGEM OSCURIDA - RVNGE (360p, h264).mp4' },
  { id: 'clip2', label: 'jack', path: 'vault/jack.mp4' },
  { id: 'clip2', label: '', path: 'vault/mbapeer.mp4' },
  { id: 'clip2', label: '', path: 'vault/no sig alc (online-video-cutter.com).mp4' },
  { id: 'clip2', label: '', path: 'vault/jack.mp4' },
];

// Second, 18+-gated gallery — gameplay clips (PUBG, Clash of Clans, etc).
// Upload these into a separate "vault2/" folder and list them here.
const VIDEOS_2 = [
  // { id: 'pubg1', label: 'PUBG clip', path: 'vault/grabnwatch.com_video.mp4' },
  // { id: 'coc1', label: 'Clash of Clans', path: 'vault2/coc1.mp4' },
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
    const videos = await Promise.all(
      vault.videos.map(async (v) => {
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
