const { getObjectJson, putObjectJson } = require('./storage');

// One manifest file per vault, storing videos uploaded via the admin panel.
// Shape: [{ id, label, path, addedAt }]
const MANIFEST_KEYS = {
  kids: 'manifest-kids.json',
  games: 'manifest-games.json',
};

async function getManifest(vaultKey) {
  const key = MANIFEST_KEYS[vaultKey];
  if (!key) return [];
  return getObjectJson(key, []);
}

async function addToManifest(vaultKey, entry) {
  const key = MANIFEST_KEYS[vaultKey];
  if (!key) throw new Error('Unknown vault');
  const current = await getObjectJson(key, []);
  const next = [...current, entry];
  await putObjectJson(key, next);
  return next;
}

async function removeFromManifest(vaultKey, id) {
  const key = MANIFEST_KEYS[vaultKey];
  if (!key) throw new Error('Unknown vault');
  const current = await getObjectJson(key, []);
  const next = current.filter((v) => v.id !== id);
  await putObjectJson(key, next);
  return next;
}

module.exports = { MANIFEST_KEYS, getManifest, addToManifest, removeFromManifest };
