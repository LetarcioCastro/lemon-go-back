// Envelope padrão: { status, response, message }
const ok = (res, response, message = 'Success') => res.status(200).json({ status: true, response, message });
const fail = (res, code, message, response = {}) => res.status(code).json({ status: false, response, message });

const errors = {
  badRequest: (res, msg = 'Invalid query parameters') => fail(res, 400, msg),
  unauthorized: (res) => fail(res, 401, 'Authentication required'),
  notFound: (res, msg = 'No results found for this client') => fail(res, 404, msg),
  unprocessable: (res, msg) => fail(res, 422, msg),
};

const toInt = (v, def) => {
  if (v === undefined || v === null || v === '') return def;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

function paginate(list, page = 1, perPage = 10) {
  const start = (page - 1) * perPage;
  return { current_page: page, total: list.length, data: list.slice(start, start + perPage) };
}

module.exports = { ok, fail, errors, toInt, paginate };
