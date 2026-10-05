module.exports = {
  PORT: Number(process.env.PORT) || 3001,
  PUBLIC_URL: process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 3001}`,
  JWT_SECRET: process.env.JWT_SECRET || 'lemon-go-mock-secret',
  JWT_EXPIRES_IN: 3600,
  // Vendedor usado quando chega um ID token do Firebase cujo uid não está na base mock
  FALLBACK_SELLER_CODE: process.env.FALLBACK_SELLER_CODE || 'test-victoria-611',
};
