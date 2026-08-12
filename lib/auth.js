const crypto = require('crypto');

// Signs a payload (e.g. { exp: <timestamp> }) into a compact token:
//   base64url(payload) + "." + hmac-sha256(base64url(payload), secret)
function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

// Verifies a token's signature and expiry. Returns true/false.
function verify(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [data, sig] = parts;

  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  // Constant-time comparison to avoid timing attacks
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    return typeof payload.exp === 'number' && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function getCookie(req, name) {
  const header = req.headers.cookie || '';
  const found = header
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + '='));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

module.exports = { sign, verify, getCookie };
