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

const SIGNED_URL_TTL_MS = 15 * 60 * 1000; // 15 minutes

module.exports = async (req, res) => {
  const token = getCookie(req, 'vault_token');
  if (!verify(token, process.env.VAULT_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const videos = await Promise.all(
      VIDEOS.map(async (v) => {
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
