// Dados mockados em memória (reiniciar o servidor restaura o estado inicial)

// Gerador pseudo-aleatório determinístico: os dados são sempre os mesmos a cada start
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const money = (min, max) => Math.round(between(min, max) * 100) / 100;
const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => isoDate(new Date(Date.now() - n * 86400000));

// ---------------------------------------------------------------- Vendedores
// code = "código único" enviado em firebase_token no modo piloto
const sellers = [
  {
    code: 'test-victoria-611', firebase_uid: 'test-victoria-611', name: 'VICTORIA VANASSI',
    phone: '5511999900011', cod_vendedor: '611', cod_loja: '901', id_company: 1, access_level: 1, approved: true,
  },
  {
    code: 'test-vendedor-603', firebase_uid: 'Yl0k3pQo8Re8UoYM11kG7mVU5zK2', name: 'VENDEDOR 603',
    phone: '5588996900054', cod_vendedor: '603', cod_loja: '901', id_company: 1, access_level: 1, approved: true,
  },
  {
    code: 'test-pendente-700', firebase_uid: 'test-pendente-700', name: 'VENDEDOR PENDENTE',
    phone: '5511988887777', cod_vendedor: '700', cod_loja: '902', id_company: 1, access_level: 1, approved: false,
  },
];

// ---------------------------------------------------------------- Perfis RFM
const profiles = [
  { id: 1, profile: 'Campeões', abrev_perfil: 'CMP' },
  { id: 2, profile: 'Clientes Fidelizados', abrev_perfil: 'FID' },
  { id: 3, profile: 'Potencial para ser Fidelizado', abrev_perfil: 'POT' },
  { id: 4, profile: 'Clientes Recentes', abrev_perfil: 'REC' },
  { id: 5, profile: 'Precisam de Atenção', abrev_perfil: 'ATE' },
  { id: 6, profile: 'Não Pode Perder', abrev_perfil: 'NPP' },
  { id: 7, profile: 'Quase Hibernando', abrev_perfil: 'QHI' },
  { id: 8, profile: 'Hibernando', abrev_perfil: 'HIB' },
  { id: 9, profile: 'Museu', abrev_perfil: 'MUS' },
];

// Motivos de suspensão (id_motivo em /api/contact/suspend)
const suspendReasons = [
  { id: 1, reason: 'Número inválido' },
  { id: 2, reason: 'Cliente pediu para não ser contatado' },
  { id: 3, reason: 'Cliente falecido' },
  { id: 4, reason: 'Outro' },
];

// ---------------------------------------------------------------- Campanhas
// status: ativa | finalizada | concluida
const campaigns = [
  { id: 6, id_company: 1, id_store: '901', status: 'ativa', title: 'teste 901', end_date: daysAgo(-30), attachment: [] },
  { id: 7, id_company: 1, id_store: '901', status: 'ativa', title: 'Reativação de Hibernando', end_date: daysAgo(-45), attachment: [] },
  { id: 4, id_company: 1, id_store: '901', status: 'finalizada', title: 'Dia dos Pais', end_date: daysAgo(40), attachment: [] },
  { id: 3, id_company: 1, id_store: '901', status: 'concluida', title: 'Dia das Mães', end_date: daysAgo(120), attachment: [] },
];

// ---------------------------------------------------------------- Contatos
const firstNames = ['ADRIANA', 'BRUNO', 'CARLA', 'DANIEL', 'ELAINE', 'FABIO', 'GABRIELA', 'HUGO', 'ISABELA', 'JOAO', 'KARINA', 'LUCAS', 'MARIANA', 'NATALIA', 'OTAVIO', 'PAULA', 'RAFAEL', 'SIMONE', 'TIAGO', 'VANESSA'];
const lastNames = ['SILVA', 'SANTOS', 'OLIVEIRA', 'SOUZA', 'COSTA', 'PEREIRA', 'ALMEIDA', 'LIMA', 'CARVALHO', 'RIBEIRO', 'VIEIRA'];
const products = ['Camisa Polo', 'Calça Jeans', 'Vestido Midi', 'Tênis Casual', 'Bolsa de Couro', 'Jaqueta', 'Blusa Básica', 'Sandália'];

const contacts = []; // cada contato pertence a (campanha, vendedor)
let nextContactId = 17250;

function makeContact({ id, campaign_id, cod_vendedor, cod_loja, name, status }) {
  const purchases = Array.from({ length: 1 + Math.floor(rand() * 6) }, () => ({
    amount: money(80, 900).toFixed(2),
    date: daysAgo(Math.floor(between(20, 1200))),
    product: pick(products),
  })).sort((a, b) => b.date.localeCompare(a.date));
  const tkm = Math.round((purchases.reduce((s, p) => s + Number(p.amount), 0) / purchases.length) * 100) / 100;
  const whats = `9${Math.floor(between(10000000, 99999999))}`;
  return {
    id: id ?? nextContactId++,
    campaign_id,
    cod_vendedor,
    client_id: String(Math.floor(between(1000, 9999))),
    id_store: cod_loja,
    id_company: 1,
    profile: pick(profiles).profile,
    name: name ?? `${pick(firstNames)} ${pick(lastNames)} ${pick(lastNames)}`,
    tkm,
    client_since: daysAgo(Math.floor(between(400, 2500))),
    last_contact: status === 'pendente' ? null : daysAgo(Math.floor(between(1, 20))),
    last_purchase: purchases[0].date,
    phone: whats,
    whats,
    client_type: null,
    observacao: null,
    status: status ?? 'pendente', // pendente | contatado | convertido | suspenso
    recent_contacts: [], // preenchido abaixo, depois que as campanhas existem
    purchase_history: purchases,
  };
}

// Campanha 6 — vendedor 611 (13 contatos, como na documentação)
contacts.push(makeContact({ id: 17289, campaign_id: 6, cod_vendedor: '611', cod_loja: '901', name: 'ADRIANA VIEIRA COSTA SANTOS', status: 'contatado' }));
contacts.push(makeContact({ id: 17254, campaign_id: 6, cod_vendedor: '611', cod_loja: '901', status: 'pendente' }));
for (let i = 0; i < 11; i++) contacts.push(makeContact({ campaign_id: 6, cod_vendedor: '611', cod_loja: '901', status: 'pendente' }));

// Demais campanhas / vendedores
const seedCampaign = (campaign_id, cod_vendedor, total, statuses) => {
  for (let i = 0; i < total; i++) contacts.push(makeContact({ campaign_id, cod_vendedor, cod_loja: '901', status: statuses(i) }));
};
seedCampaign(7, '611', 8, (i) => (i < 2 ? 'contatado' : 'pendente'));
seedCampaign(4, '611', 10, (i) => (i < 7 ? 'contatado' : i < 9 ? 'convertido' : 'suspenso'));
seedCampaign(3, '611', 6, () => 'convertido');
seedCampaign(6, '603', 15, (i) => (i < 4 ? 'contatado' : i < 5 ? 'convertido' : 'pendente'));
seedCampaign(7, '603', 12, (i) => (i < 1 ? 'contatado' : 'pendente'));

// Histórico de contatos (campos lidos pela tela de detalhe do app)
for (const c of contacts) {
  if (c.status === 'pendente') continue;
  c.recent_contacts.push({
    last_contact: c.last_contact,
    converted: c.status === 'convertido',
    campaign: campaigns.find((x) => x.id === c.campaign_id)?.title ?? null,
    observacao: 'Contato via WhatsApp',
    status: c.status,
  });
}

// ---------------------------------------------------------------- Vendas (home)
// Série de 14 meses por vendedor
function monthlySeries(base) {
  const now = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const partial = i === 0 ? Math.max(now.getDate() / 30, 0.1) : 1;
    const attendance = Math.round(between(base.att * 0.7, base.att * 1.3) * partial);
    const month_sales = money(base.sales * 0.7, base.sales * 1.3) * partial;
    const ppa = money(1.8, 3);
    const tkm = Math.round((month_sales / Math.max(attendance, 1)) * 100) / 100;
    return {
      reference_month: `${d.getFullYear()}${pad(d.getMonth() + 1)}`,
      month_sales: Math.round(month_sales * 100) / 100,
      attendance,
      tkm,
      ppa,
      pu: Math.round(tkm * 2.7 * 100) / 100,
    };
  });
}

const sales = {
  '611': { goal: 60000, day_goal: 2500, series: monthlySeries({ sales: 55000, att: 110 }) },
  '603': { goal: 45000, day_goal: 1800, series: monthlySeries({ sales: 38000, att: 80 }) },
};

// ---------------------------------------------------------------- Suporte
const tickets = [];
let nextTicketId = 1;
const newTicketId = () => nextTicketId++;

module.exports = { sellers, profiles, suspendReasons, campaigns, contacts, sales, tickets, newTicketId, money, isoDate };
