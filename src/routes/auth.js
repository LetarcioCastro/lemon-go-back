const { Router } = require('express');
const jwt = require('../jwt');
const { sellers } = require('../data');
const { errors } = require('../http');
const { JWT_EXPIRES_IN, FALLBACK_SELLER_CODE } = require('../config');

const router = Router();

// Localiza o vendedor a partir do firebase_token:
//  1) código único do piloto (ex.: test-victoria-611)
//  2) ID token do Firebase (JWT): casa pelo uid; se o uid não existir na base mock,
//     usa o vendedor de FALLBACK_SELLER_CODE (facilita testar com qualquer conta do app)
function findSeller(firebaseToken) {
  const byCode = sellers.find((s) => s.code === firebaseToken);
  if (byCode) return byCode;

  const decoded = jwt.decodeUnsafe(firebaseToken);
  if (!decoded) return null;

  const uid = decoded.user_id || decoded.sub;
  const byUid = sellers.find((s) => s.firebase_uid === uid);
  if (byUid) return byUid;

  console.log(`[auth] uid ${uid} não cadastrado — usando vendedor ${FALLBACK_SELLER_CODE}`);
  return sellers.find((s) => s.code === FALLBACK_SELLER_CODE) || null;
}

router.post('/firebase', (req, res) => {
  const firebaseToken = req.body?.firebase_token;
  if (!firebaseToken || typeof firebaseToken !== 'string') {
    return errors.badRequest(res, 'firebase_token is required');
  }

  const seller = findSeller(firebaseToken.trim());
  if (!seller) {
    return res.status(403).json({ error: 'USER_INVALID', message: 'Vendedor não encontrado' });
  }
  if (!seller.approved) {
    return res.status(403).json({ error: 'WAITING_APPROVAL', message: 'Cadastro aguardando aprovação do gestor' });
  }

  const token = jwt.sign({
    firebase_uid: seller.firebase_uid,
    id_company: seller.id_company,
    cod_vendedor: seller.cod_vendedor,
    cod_loja: seller.cod_loja,
    access_level: seller.access_level,
  }, JWT_EXPIRES_IN);

  // Formato da v2: sem envelope
  res.json({ token, type: 'Bearer', expires_in: JWT_EXPIRES_IN });
});

module.exports = router;
