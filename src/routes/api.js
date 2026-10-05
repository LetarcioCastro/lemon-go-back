const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Router } = require('express');
const multer = require('multer');
const data = require('../data');
const { ok, errors, toInt, paginate } = require('../http');
const { PUBLIC_URL } = require('../config');

const router = Router();

// ------------------------------------------------------------ helpers
const sellerContacts = (seller) => data.contacts.filter((c) => c.cod_vendedor === seller.cod_vendedor);

const pageParams = (q, defPerPage, maxPerPage = 100) => {
  const page = toInt(q.page, 1);
  let perPage = toInt(q.per_page, defPerPage);
  if (Number.isNaN(page) || Number.isNaN(perPage) || page < 1 || perPage < 1) return null;
  return { page, perPage: Math.min(perPage, maxPerPage) };
};

function campaignSummary(campaign, seller) {
  const list = sellerContacts(seller).filter((c) => c.campaign_id === campaign.id && c.status !== 'suspenso');
  return {
    id: campaign.id,
    id_client: seller.cod_vendedor,
    id_store: seller.cod_loja,
    id_company: seller.id_company,
    status: campaign.status,
    title: campaign.title,
    assigned: list.length,
    contacted: list.filter((c) => c.status === 'contatado' || c.status === 'convertido').length,
    end_date: campaign.end_date,
  };
}

const contactListItem = (c) => ({
  id: c.id,
  campaign_id: c.campaign_id,
  client_id: c.client_id,
  id_store: c.id_store,
  id_company: c.id_company,
  profile: c.profile,
  name: c.name,
  tkm: c.tkm,
  last_contact: c.last_contact,
  status: c.status,
  client_type: c.client_type,
  whats: c.whats,
});

// Mês/dia corrente em America/Sao_Paulo
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

// ------------------------------------------------------------ GET /api/home/results
router.get('/home/results', (req, res) => {
  const campaignId = toInt(req.query.campaign_id);
  if (!campaignId) return errors.badRequest(res);

  const campaign = data.campaigns.find((c) => c.id === campaignId);
  const contacts = sellerContacts(req.seller).filter((c) => c.campaign_id === campaignId && c.status !== 'suspenso');
  if (!campaign || !contacts.length) return errors.notFound(res);

  const sales = data.sales[req.seller.cod_vendedor];
  if (!sales) return errors.notFound(res);

  const [current, ...previous] = sales.series;
  const converted = contacts.filter((c) => c.status === 'convertido');
  const campaignSales = Math.round(converted.reduce((s, c) => s + c.tkm, 0) * 100) / 100;
  const daySales = data.money(0, sales.day_goal * 1.2);
  const avgOf = (key) => Math.round((previous.slice(0, 3).reduce((s, m) => s + m[key], 0) / 3) * 100) / 100;

  const kpis = { day_sales: daySales, day_goal: sales.day_goal, ppa: current.ppa, tkm: current.tkm, pu: current.pu };

  ok(res, {
    id_client: req.seller.cod_vendedor,
    id_store: req.seller.cod_loja,
    id_company: req.seller.id_company,
    campaign_id: campaignId,
    reference_data: {
      reference_month: current.reference_month,
      contacts_made: contacts.filter((c) => c.status !== 'pendente').length,
      contacts_assigned: contacts.length,
      active_campaigns: data.campaigns.filter((c) =>
        c.status === 'ativa' && sellerContacts(req.seller).some((x) => x.campaign_id === c.id)).length,
      campaign_sales: campaignSales,
      remaining_to_goal: Math.max(0, Math.round((sales.goal - current.month_sales) * 100) / 100),
      converted: converted.length,
      recovered: converted.filter((c) => c.profile === 'Hibernando' || c.profile === 'Quase Hibernando').length,
      month_sales: current.month_sales,
      month_goal: sales.goal,
      attendance: current.attendance,
      ...kpis,
    },
    comparative_avg: {
      amount: 3,
      month_sales: avgOf('month_sales'),
      attendance: Math.round(avgOf('attendance')),
      tkm: avgOf('tkm'),
      ppa: avgOf('ppa'),
      pu: avgOf('pu'),
    },
    comparative_monthly: sales.series,
    ...kpis,
  });
});

// ------------------------------------------------------------ GET /api/campaign
router.get('/campaign', (req, res) => {
  const pg = pageParams(req.query, 10);
  if (!pg) return errors.badRequest(res);

  const ids = new Set(sellerContacts(req.seller).map((c) => c.campaign_id));
  const list = data.campaigns.filter((c) => ids.has(c.id)).map((c) => campaignSummary(c, req.seller));
  if (!list.length) return errors.notFound(res);

  const { current_page, data: items } = paginate(list, pg.page, pg.perPage);
  ok(res, {
    available_campaigns: list.filter((c) => c.status === 'ativa').length,
    finished_campaigns: list.filter((c) => c.status === 'finalizada').length,
    completed_campaigns: list.filter((c) => c.status === 'concluida').length,
    current_page,
    data: items,
  });
});

// ------------------------------------------------------------ GET /api/campaign/contacts
router.get('/campaign/contacts', (req, res) => {
  const campaignId = toInt(req.query.campaign_id);
  const pg = pageParams(req.query, 10, 10);
  if (!campaignId || !pg) return errors.badRequest(res);

  const campaign = data.campaigns.find((c) => c.id === campaignId);
  const list = sellerContacts(req.seller).filter((c) => c.campaign_id === campaignId && c.status !== 'suspenso');
  if (!campaign || !list.length) return errors.notFound(res);

  const summary = campaignSummary(campaign, req.seller);
  const page = paginate(list.map(contactListItem), pg.page, pg.perPage);
  ok(res, {
    campaign_id: campaign.id,
    status: campaign.status,
    title: campaign.title,
    assigned: summary.assigned,
    contacted: summary.contacted,
    end_date: campaign.end_date,
    attachment: campaign.attachment,
    current_page: page.current_page,
    total: page.total,
    data: page.data,
  });
});

// ------------------------------------------------------------ GET /api/campaign/contacts/details
router.get('/campaign/contacts/details', (req, res) => {
  const idContato = toInt(req.query.id_contato);
  const campaignId = toInt(req.query.campaign_id);
  const clientId = req.query.client_id ? String(req.query.client_id) : null;
  const pageContatos = toInt(req.query.page_contatos, 1);
  const pageCompras = toInt(req.query.page_compras, 1);

  if (Number.isNaN(idContato) || Number.isNaN(pageContatos) || Number.isNaN(pageCompras)) return errors.badRequest(res);
  if (!idContato && !(campaignId && clientId)) return errors.badRequest(res);

  const mine = sellerContacts(req.seller);
  const c = idContato
    ? mine.find((x) => x.id === idContato)
    : mine.find((x) => x.campaign_id === campaignId && x.client_id === clientId);
  if (!c) return errors.notFound(res);

  const { recent_contacts, purchase_history, cod_vendedor, status, ...rest } = c;
  ok(res, {
    ...rest,
    recent_contacts: paginate(recent_contacts, pageContatos, 5),
    purchase_history: paginate(purchase_history, pageCompras, 5),
  });
});

// ------------------------------------------------------------ POST /api/contact/mark
router.post('/contact/mark', (req, res) => {
  const idCampanha = toInt(req.body?.id_campanha);
  const idContato = toInt(req.body?.id_contato);
  if (!idCampanha || !idContato) return errors.badRequest(res, 'Invalid body parameters');

  const c = sellerContacts(req.seller).find((x) => x.id === idContato && x.campaign_id === idCampanha);
  if (!c) return errors.notFound(res);

  const convertido = req.body.convertido === true || req.body.convertido === 'true';
  c.status = convertido ? 'convertido' : 'contatado';
  c.last_contact = today();
  if (req.body.observacao !== undefined) c.observacao = String(req.body.observacao);
  c.recent_contacts.unshift({
    last_contact: c.last_contact,
    converted: convertido,
    campaign: data.campaigns.find((x) => x.id === c.campaign_id)?.title ?? null,
    observacao: c.observacao,
    status: c.status,
  });

  ok(res, { msg: 'contact updated', status: c.status });
});

// ------------------------------------------------------------ POST /api/contact/suspend
router.post('/contact/suspend', (req, res) => {
  const idCampanha = toInt(req.body?.id_campanha);
  const idContato = toInt(req.body?.id_contato);
  const idMotivo = toInt(req.body?.id_motivo);
  if (!idCampanha || !idContato || !idMotivo) return errors.badRequest(res, 'Invalid body parameters');
  if (!data.suspendReasons.some((r) => r.id === idMotivo)) return errors.badRequest(res, 'Invalid id_motivo');

  const c = sellerContacts(req.seller).find((x) => x.id === idContato && x.campaign_id === idCampanha);
  if (!c) return errors.notFound(res);

  c.status = 'suspenso';
  c.id_motivo = idMotivo;
  ok(res, { msg: 'contact removed' });
});

// ------------------------------------------------------------ GET /api/profiles
router.get('/profiles', (req, res) => ok(res, data.profiles));

// ------------------------------------------------------------ POST /api/support
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(8).toString('hex') + path.extname(file.originalname || '')),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});

const REASONS = ['bug', 'duvida', 'dúvida', 'sugestao', 'sugestão'];

router.post('/support', (req, res, next) => {
  upload.array('attachments', 5)(req, res, (err) => {
    if (err) return errors.badRequest(res, `Upload error: ${err.message}`);
    next();
  });
}, (req, res) => {
  const b = req.body || {};
  const campaignId = toInt(b.campaign_id);
  const reason = String(b.reason || '').trim().toLowerCase();
  const title = String(b.title || '').trim();
  const message = String(b.message || '').trim();

  if (!campaignId || !REASONS.includes(reason) || !title || title.length > 100 || !message || message.length > 2000) {
    return errors.badRequest(res, 'Invalid body parameters');
  }

  const ticket = {
    ticket_id: String(data.newTicketId()),
    campaign_id: campaignId,
    id_client: req.seller.cod_vendedor,
    id_store: req.seller.cod_loja,
    id_company: req.seller.id_company,
    reason,
    title,
    message,
    created_at: new Date().toISOString().slice(0, 19),
    attachments: (req.files || []).map((f) => `${PUBLIC_URL}/uploads/${f.filename}`),
  };
  data.tickets.unshift(ticket);

  ok(res, { ticket_id: Number(ticket.ticket_id), created_at: ticket.created_at });
});

// ------------------------------------------------------------ GET /api/support
router.get('/support', (req, res) => {
  const campaignId = toInt(req.query.campaign_id);
  const pg = pageParams(req.query, 10);
  if (Number.isNaN(campaignId) || !pg) return errors.badRequest(res);

  const list = data.tickets.filter((t) =>
    t.id_client === req.seller.cod_vendedor && (!campaignId || t.campaign_id === campaignId));
  if (!list.length) return errors.notFound(res);

  const { current_page, data: items } = paginate(list, pg.page, pg.perPage);
  ok(res, { current_page, data: items });
});

// ------------------------------------------------------------ POST /api/user/validate
router.post('/user/validate', (req, res) => {
  const phone = String(req.body?.phone || '').replace(/\D/g, '');
  const pg = pageParams(req.body || {}, 10);
  if (!req.body?.phone || !pg) return errors.badRequest(res, 'Invalid body parameters');
  if (phone.length < 12 || phone.length > 13) return errors.unprocessable(res, 'Invalid phone format');

  const list = data.sellers
    .filter((s) => s.id_company === req.seller.id_company && s.phone === phone)
    .map((s) => ({
      firebase_uid: s.firebase_uid,
      id_client: s.cod_vendedor,
      id_store: s.cod_loja,
      id_company: s.id_company,
      access_level: s.access_level,
      approved: s.approved,
    }));
  if (!list.length) return errors.notFound(res);

  const page = paginate(list, pg.page, pg.perPage);
  ok(res, { current_page: page.current_page, data: page.data, total: page.total });
});

module.exports = router;
