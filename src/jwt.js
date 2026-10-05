// JWT HS256 mínimo, sem dependências
const crypto = require('crypto');
const { JWT_SECRET } = require('./config');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function sign(payload, expiresIn) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresIn }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verify(token) {
  const [header, body, sig] = String(token).split('.');
  if (!header || !body || !sig) return null;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// Lê o payload de um JWT sem validar assinatura (usado para o ID token do Firebase no modo mock)
function decodeUnsafe(token) {
  try {
    const body = String(token).split('.')[1];
    return body ? JSON.parse(Buffer.from(body, 'base64url').toString()) : null;
  } catch {
    return null;
  }
}

module.exports = { sign, verify, decodeUnsafe };
