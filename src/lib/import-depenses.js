// Import d'anciennes dépenses / gains depuis un fichier JSON (voir modele-import-depenses.json).
import { normalizeDepenses } from './depenses.js';

export const IMPORT_FORMAT = 'kelasi-depenses';
const MAX_OPERATIONS = 20000;

const strip = v => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();

// Noms acceptés pour chaque catégorie (français, allemand de l'ancienne application, anglais).
const CATEGORY_ALIASES = {
  abonnement: ['abonnement', 'abo', 'subscription'],
  transport: ['auto transport', 'transport', 'auto', 'voiture', 'car'],
  education: ['education livres', 'education', 'livres', 'bildung buch', 'bildung', 'buch', 'books'],
  courses: ['alimentation repas', 'alimentation', 'courses', 'repas', 'essen speisen', 'essen', 'lebensmittel', 'groceries', 'food'],
  restaurants: ['restaurants', 'restaurant'],
  salaire: ['salaire', 'gehalt', 'salary'],
  paie: ['paie', 'lohn', 'wage', 'wages'],
  sante: ['sante assurance', 'sante', 'assurance', 'gesundheit versicherung', 'gesundheit', 'versicherung', 'health', 'insurance'],
  animaux: ['animaux', 'animal', 'haustier', 'pet', 'pets'],
  enfant: ['enfant', 'enfants', 'kind', 'kinder', 'child', 'kids'],
  vetements: ['vetements', 'vetement', 'kleidung', 'clothes', 'clothing'],
  soins: ['soins personnels', 'soins', 'korperpflege', 'koerperpflege', 'personal care'],
  'carte-credit': ['carte de credit', 'carte credit', 'kreditkarte', 'credit card'],
  loyer: ['loyer', 'miete', 'rent'],
  dons: ['dons solidarite', 'dons', 'solidarite', 'nachstenliebe', 'naechstenliebe', 'charity'],
  factures: ['factures', 'facture', 'rechnung', 'rechnungen', 'bills'],
  electricite: ['electricite', 'elektrizitat', 'elektrizitaet', 'strom', 'electricity'],
  chauffage: ['chauffage', 'heizung', 'heating'],
  internet: ['internet'],
  tv: ['television', 'tv', 'kabel tv', 'cable tv'],
  mobile: ['telephone mobile', 'mobile', 'portable', 'mobiltelefon', 'handy', 'mobile phone'],
  eau: ['eau', 'wasser', 'water'],
  enerlec: ['enerlec'],
  voyage: ['voyage', 'voyages', 'reise', 'travel'],
  'agence-voyage': ['agence de voyage', 'travel agency', 'reiseburo', 'reisebuero'],
  loisirs: ['loisirs divertissement', 'loisirs', 'divertissement', 'unterhaltung', 'entertainment'],
  vente: ['vente', 'ventes', 'verkauf', 'sale', 'sales'],
  maison: ['maison reparation', 'maison', 'reparation', 'zuhause reparatur', 'zuhause', 'reparatur', 'home'],
  'frais-bancaires': ['frais bancaires', 'frais bancaire', 'konto gebuhr', 'konto gebuehr', 'kontogebuhr', 'bank fees'],
  epargne: ['epargne', 'speichern', 'sparen', 'savings'],
  'emprunt-x': ['emprunt a x', 'emprunt'],
  'pret-x': ['pret a x', 'pret'],
  transfert: ['transfert', 'transfer', 'einziehung', 'virement interne'],
  autre: ['autre', 'autres', 'divers', 'sonstiges', 'other']
};
const ACCOUNT_ALIASES = { especes: ['especes', 'espece', 'cash', 'bargeld', 'liquide'] };
const TYPE_ALIASES = {
  expense: ['depense', 'depenses', 'sortie', 'expense', 'ausgabe', 'debit'],
  income: ['revenu', 'revenus', 'gain', 'gains', 'entree', 'income', 'einkommen', 'einnahme', 'credit'],
  transfer: ['virement', 'transfert', 'transfer', 'uberweisung', 'umbuchung']
};

function pick(row, ...keys) { for (const k of keys) if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k]; return undefined; }
export function parseAmount(value) {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').replace(/\s|€|eur/gi, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
  return s === '' ? NaN : Number(s);
}
export function parseDate(value) {
  const s = String(value ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return valid(m[1], m[2], m[3]);
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/); if (m) return valid(m[3], m[2].padStart(2, '0'), m[1].padStart(2, '0'));
  return null;
  function valid(y, mo, d) { const iso = `${y}-${mo}-${d}`; const dt = new Date(`${iso}T12:00:00Z`); return dt.toISOString().slice(0, 10) === iso ? iso : null; }
}
function parseTime(value) { const m = String(value ?? '').trim().match(/^(\d{1,2})[:h](\d{2})/); if (!m || +m[1] > 23 || +m[2] > 59) return ''; return `${m[1].padStart(2, '0')}:${m[2]}`; }
function hash(text) { let h1 = 0x811c9dc5, h2 = 0x01000193; for (let i = 0; i < text.length; i++) { const c = text.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519); } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36); }
function resolveType(raw, amount) {
  const key = strip(raw);
  for (const [type, names] of Object.entries(TYPE_ALIASES)) if (names.includes(key)) return type;
  if (!key && Number.isFinite(amount)) return amount < 0 ? 'expense' : 'income';
  return null;
}

/**
 * Prépare l'import sans rien modifier. Retourne les nouvelles données et un rapport à afficher avant confirmation.
 * @param {object} current données Dépenses actuelles
 * @param {object|array} file contenu JSON du fichier
 */
export function prepareExpenseImport(current = {}, file = {}) {
  const data = normalizeDepenses(current);
  const operations = Array.isArray(file) ? file : Array.isArray(file?.operations) ? file.operations : Array.isArray(file?.transactions) ? file.transactions : null;
  if (!operations) throw new Error('Le fichier doit contenir une liste « operations ». Télécharge le modèle pour voir le format attendu.');
  if (operations.length > MAX_OPERATIONS) throw new Error(`Trop d'opérations (${operations.length}). Maximum : ${MAX_OPERATIONS} par fichier.`);
  const now = new Date().toISOString();
  const accounts = data.accounts.map(a => ({ ...a }));
  const categories = data.categories.map(c => ({ ...c }));
  const report = { added: 0, duplicates: 0, errors: [], newAccounts: [], newCategories: [], income: 0, expense: 0, from: null, to: null, total: operations.length };

  const findAccount = name => { const key = strip(name); if (!key) return null; const alias = Object.entries(ACCOUNT_ALIASES).find(([, names]) => names.includes(key))?.[1] || [key]; return accounts.find(a => alias.includes(strip(a.name))) || null; };
  const ensureAccount = (name, extra = {}) => {
    const label = String(name || '').trim() || 'Espèces';
    const found = findAccount(label); if (found) return found;
    const account = { id: `acc-${hash(strip(label))}`, name: ACCOUNT_ALIASES.especes.includes(strip(label)) ? 'Espèces' : label, type: extra.type || 'Espèces', initialBalance: Number(parseAmount(extra.initialBalance)) || 0, currency: 'EUR', created_at: now, updated_at: now };
    accounts.push(account); report.newAccounts.push(account.name); return account;
  };
  for (const a of Array.isArray(file?.comptes) ? file.comptes : Array.isArray(file?.accounts) ? file.accounts : []) {
    const name = pick(a, 'nom', 'name'); if (name) ensureAccount(name, { type: pick(a, 'type'), initialBalance: pick(a, 'solde_initial', 'initialBalance', 'solde') });
  }
  const findCategory = (name, parentName) => {
    const key = strip(name); if (!key) return null;
    const byAlias = Object.entries(CATEGORY_ALIASES).find(([, names]) => names.includes(key))?.[0];
    if (byAlias && categories.some(c => c.id === byAlias)) return categories.find(c => c.id === byAlias);
    const parent = parentName ? findCategory(parentName) : null;
    return categories.find(c => strip(c.name) === key && (!parent || c.parentId === parent.id)) || categories.find(c => strip(c.name) === key || c.id === key) || null;
  };
  const ensureCategory = (name, parentName, type) => {
    if (!String(name || '').trim()) return null;
    const found = findCategory(name, parentName); if (found) return found;
    const parent = parentName ? findCategory(parentName) : null;
    const category = { id: `cat-${hash(strip(name))}`, name: String(name).trim(), color: '#5da98a', iconKey: 'tag', kind: type === 'income' ? 'income' : 'expense', parentId: parent?.id || null, icon: '', deleted: false, created_at: now, updated_at: now };
    categories.push(category); report.newCategories.push(category.name); return category;
  };

  const existingIds = new Set(data.transactions.map(t => t.id));
  const seenInFile = new Map();
  const added = [];
  operations.forEach((row, index) => {
    const line = index + 1;
    if (!row || typeof row !== 'object') { report.errors.push({ line, message: 'ligne vide ou invalide' }); return; }
    const rawAmount = parseAmount(pick(row, 'montant', 'amount', 'betrag'));
    if (!Number.isFinite(rawAmount) || rawAmount === 0) { report.errors.push({ line, message: 'montant manquant ou invalide' }); return; }
    const type = resolveType(pick(row, 'type', 'sens'), rawAmount);
    if (!type) { report.errors.push({ line, message: `type inconnu « ${pick(row, 'type')} » (depense, revenu ou virement)` }); return; }
    const date = parseDate(pick(row, 'date', 'datum'));
    if (!date) { report.errors.push({ line, message: 'date invalide (format AAAA-MM-JJ ou JJ/MM/AAAA)' }); return; }
    const time = parseTime(pick(row, 'heure', 'time', 'uhrzeit'));
    const account = ensureAccount(pick(row, 'compte', 'account', 'konto') || accounts[0]?.name || 'Espèces');
    let destination = null;
    if (type === 'transfer') {
      const to = pick(row, 'vers_compte', 'compte_destination', 'toAccount', 'destination');
      if (!to) { report.errors.push({ line, message: 'virement sans « vers_compte »' }); return; }
      destination = ensureAccount(to);
      if (destination.id === account.id) { report.errors.push({ line, message: 'virement vers le même compte' }); return; }
    }
    const category = type === 'transfer' ? null : ensureCategory(pick(row, 'sous_categorie', 'categorie', 'category', 'kategorie'), pick(row, 'sous_categorie') ? pick(row, 'categorie', 'category') : null, type);
    const amount = Math.round(Math.abs(rawAmount) * 100) / 100;
    const note = String(pick(row, 'note', 'description', 'libelle', 'notiz') ?? '').trim().slice(0, 500);
    const signature = [date, time, type, amount, account.id, destination?.id || '', category?.id || '', strip(note)].join('|');
    const occurrence = (seenInFile.get(signature) || 0) + 1; seenInFile.set(signature, occurrence);
    const id = `imp-${hash(signature)}-${occurrence}`;
    if (existingIds.has(id)) { report.duplicates++; return; }
    existingIds.add(id);
    const created = time ? new Date(`${date}T${time}:00`).toISOString() : `${date}T00:00:00.000Z`;
    added.push({ id, date, type, amount, accountId: account.id, destinationAccountId: destination?.id || null, categoryId: category?.id || null, note, receipt: '', imported: true, created_at: created, updated_at: now });
    if (type === 'income') report.income += amount; else if (type === 'expense') report.expense += amount;
    if (!report.from || date < report.from) report.from = date;
    if (!report.to || date > report.to) report.to = date;
  });
  report.added = added.length;
  report.income = Math.round(report.income * 100) / 100; report.expense = Math.round(report.expense * 100) / 100;
  return { data: { ...data, accounts, categories, transactions: [...added, ...data.transactions] }, report };
}
