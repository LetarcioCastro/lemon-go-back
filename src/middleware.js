const jwt = require('./jwt');
const { sellers } = require('./data');
const { errors } = require('./http');

// Exige Authorization: Bearer <jwt>. O escopo (vendedor/loja/empresa) vem SEMPRE do token;
// id_client / id_store / id_company enviados na query são aceitos e ignorados.
function requireAuth(req, res, next) {
  const [type, token] = String(req.headers.authorization || '').split(' ');
  if (type !== 'Bearer' || !token) return errors.unauthorized(res);

  const payload = jwt.verify(token);
  if (!payload) return errors.unauthorized(res);

  const seller = sellers.find((s) => s.cod_vendedor === payload.cod_vendedor);
  if (!seller) return errors.unauthorized(res);

  req.auth = payload;
  req.seller = seller;
  next();
}

function cors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}

function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`));
  next();
}

module.exports = { requireAuth, cors, logger };
