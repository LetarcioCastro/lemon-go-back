const path = require('path');
const express = require('express');
const { PORT } = require('./config');
const { requireAuth, cors, logger } = require('./middleware');
const { errors, fail } = require('./http');

const app = express();

app.use(cors);
app.use(logger);
app.use(express.json());

app.get('/', (req, res) => res.json({ name: 'API Contato Inteligente (mock)', version: '2.0.0' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/auth', require('./routes/auth'));
app.use('/api', requireAuth, require('./routes/api'));

// 404 de rota
app.use((req, res) => fail(res, 404, 'Route not found'));

// Erros não tratados (JSON inválido, exceções)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return errors.badRequest(res, 'Invalid JSON body');
  console.error(err);
  fail(res, 500, 'Internal error');
});

app.listen(PORT, () => {
  console.log(`API mock rodando em http://localhost:${PORT}`);
  console.log('Login de teste: POST /auth/firebase { "firebase_token": "test-victoria-611" }');
});
