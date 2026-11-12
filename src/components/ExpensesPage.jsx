import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Wallet, ArrowLeftRight, CalendarClock, ChevronLeft, ChevronRight, Search, X, ArrowDownLeft, Pencil, ShoppingCart, House, Car, HeartPulse, Ticket, Zap, UtensilsCrossed, Tag, CircleMinus, CirclePlus } from 'lucide-react';
import { aggregateByCategory, budgetProgress, calculateAccountBalances, categoriesForType, groupTransactionsByDay, monthlyTotals, orderedCategories, shiftMonth, totalAccountBalance, upcomingPayments } from '../lib/depenses.js';
import { CATEGORY_ICON_SET, categoryIcon } from '../lib/category-icons.js';
import { prepareExpenseImport } from '../lib/import-depenses.js';
import { Upload, Download } from 'lucide-react';
import { aggregatePieCategories, buildMonthlySeries } from '../lib/expense-charts.js';

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const money = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const monthLabel = month => new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
function dayLabel(date) {
  const t = today(), y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (date === t) return "Aujourd'hui";
  if (date === y) return 'Hier';
  const s = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const CATEGORY_ICONS = { courses: ShoppingCart, loyer: House, transport: Car, sante: HeartPulse, loisirs: Ticket, factures: Zap, restaurants: UtensilsCrossed };
function CatIcon({ category, type, size = 22 }) {
  if (type === 'transfer') return <ArrowLeftRight size={size} strokeWidth={1.8}/>;
  if (type === 'income' && !category) return <ArrowDownLeft size={size} strokeWidth={1.8}/>;
  const Icon = categoryIcon(category) || CATEGORY_ICONS[category?.id];
  if (Icon) return <Icon size={size} strokeWidth={1.8}/>;
  return category?.icon && category.icon !== '•' ? <span className="xp-glyph">{category.icon}</span> : <Tag size={size} strokeWidth={1.8}/>;
}
const shortDay = date => new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();
const weekday = date => { const s = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
const timeOf = t => { const c = String(t.created_at || ''); return c.length > 16 && !c.includes('T00:00:00') ? new Date(c).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''; };
const TYPES = [['expense', 'Dépense'], ['income', 'Revenu'], ['transfer', 'Virement']];
const FILTERS = [['all', 'Tout'], ['expense', 'Dépenses'], ['income', 'Revenus'], ['transfer', 'Virements']];
const TABS = [['journal', 'Journal'], ['analyse', 'Analyse'], ['budgets', 'Budgets'], ['recurrences', 'Récurrences'], ['comptes', 'Comptes']];
const TAB_ALIASES = { transactions: 'journal', overview: 'journal' };
const ACCOUNT_TYPES = ['Espèces', 'Banque', 'Carte de crédit', 'Épargne', 'Mobile money'];
const newTransaction = (data, type = 'expense') => ({ date: today(), type, amount: '', accountId: data.accounts[0]?.id || '', destinationAccountId: '', categoryId: type === 'expense' ? (data.categories.find(c => c.id === 'courses')?.id || '') : type === 'income' ? (data.categories.find(c => c.id === 'salaire')?.id || '') : '', note: '', receipt: '' });

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const scale = Math.min(1, 1200 / Math.max(img.width, img.height)), canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL('image/jpeg', .72)); };
    img.onerror = reject; img.src = url;
  });
}

export default function ExpensesPage({ value, onChange, initialTab = 'journal' }) {
  const data = value, patch = fn => onChange(current => fn(current));
  const [month, setMonth] = useState(today().slice(0, 7));
  const [tab, setTab] = useState(TAB_ALIASES[initialTab] || initialTab);
  const [filter, setFilter] = useState('all');
  const tabsRef = useRef(null);
  useEffect(() => { tabsRef.current?.querySelector('.active')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); }, [tab]);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [form, setForm] = useState(null);
  const [accountForm, setAccountForm] = useState(null);
  const [budgetForm, setBudgetForm] = useState(null);
  const [recurrenceForm, setRecurrenceForm] = useState(null);
  const cats = orderedCategories(data.categories);
  const [categoryForm, setCategoryForm] = useState(null);
  const [importState, setImportState] = useState(null);
  const catById = id => data.categories.find(c => c.id === id);
  const accById = id => data.accounts.find(a => a.id === id);

  const totals = monthlyTotals(data.transactions, month);
  const days = useMemo(() => groupTransactionsByDay(data.transactions, month, { type: filter, search }), [data.transactions, month, filter, search]);
  const balances = calculateAccountBalances(data.accounts, data.transactions);
  const budgets = budgetProgress(data.budgets, data.transactions, month);
  const upcoming = upcomingPayments(data.recurrences, today()).slice(0, 5);

  function saveTransaction(t) {
    const now = new Date().toISOString();
    const old = data.transactions.find(x => x.id === t.id);
    const row = { ...t, amount: Math.abs(Number(String(t.amount).replace(',', '.'))), categoryId: t.type === 'transfer' ? null : t.categoryId || null, destinationAccountId: t.type === 'transfer' ? t.destinationAccountId : null, updated_at: now, created_at: old?.created_at || now };
    patch(d => ({ ...d, transactions: old ? d.transactions.map(x => x.id === row.id ? row : x) : [{ ...row, id: uid() }, ...d.transactions] }));
    if (row.date.slice(0, 7) !== month) setMonth(row.date.slice(0, 7));
    setForm(null);
  }
  function removeTransaction(t) {
    if (!window.confirm('Supprimer cette opération ?')) return;
    patch(d => ({ ...d, transactions: d.transactions.filter(x => x.id !== t.id), deletedDepenseIds: [...new Set([...d.deletedDepenseIds, `transactions:${t.id}`])] }));
    setForm(null);
  }
  function saveAccount(a) {
    const now = new Date().toISOString();
    patch(d => ({ ...d, accounts: a.id ? d.accounts.map(x => x.id === a.id ? { ...x, ...a, updated_at: now } : x) : [...d.accounts, { ...a, id: uid(), currency: 'EUR', created_at: now, updated_at: now }] }));
    setAccountForm(null);
  }
  function removeAccount(a) {
    if (data.transactions.some(t => t.accountId === a.id || t.destinationAccountId === a.id)) { alert('Ce compte contient des opérations : réaffecte-les avant de le supprimer.'); return; }
    if (!confirm(`Supprimer le compte « ${a.name} » ?`)) return;
    patch(d => ({ ...d, accounts: d.accounts.filter(x => x.id !== a.id), deletedDepenseIds: [...new Set([...d.deletedDepenseIds, `accounts:${a.id}`])] }));
    setAccountForm(null);
  }
  function saveBudget(b) {
    const now = new Date().toISOString();
    patch(d => ({ ...d, budgets: [...d.budgets.filter(x => x.categoryId !== b.categoryId), { id: d.budgets.find(x => x.categoryId === b.categoryId)?.id || uid(), categoryId: b.categoryId, limit: Number(b.limit), updated_at: now }] }));
    setBudgetForm(null);
  }
  function removeBudget(b) {
    patch(d => ({ ...d, budgets: d.budgets.filter(x => x.id !== b.id), deletedDepenseIds: [...new Set([...d.deletedDepenseIds, `budgets:${b.id}`])] }));
    setBudgetForm(null);
  }
  function saveRecurrence(r) {
    const now = new Date().toISOString();
    patch(d => ({ ...d, recurrences: r.id ? d.recurrences.map(x => x.id === r.id ? { ...x, ...r, updated_at: now } : x) : [...d.recurrences, { ...r, id: uid(), active: true, created_at: now, updated_at: now }] }));
    setRecurrenceForm(null);
  }
  function addCategory() { setCategoryForm({ name: '', kind: 'expense', parentId: '', color: '#5da98a', iconKey: 'tag' }); }
  function renameCategory(c) { setCategoryForm({ ...c, parentId: c.parentId || '', kind: c.kind || 'both', iconKey: c.iconKey || 'tag' }); }
  function saveCategory(c) {
    const now = new Date().toISOString(), row = { ...c, name: c.name.trim(), parentId: c.parentId || null, updated_at: now };
    patch(d => ({ ...d, categories: c.id ? d.categories.map(x => x.id === c.id ? { ...x, ...row } : x) : [...d.categories, { ...row, id: uid(), icon: '', deleted: false, created_at: now }] }));
    setCategoryForm(null);
  }
  function removeCategory(c) {
    const used = data.transactions.filter(t => t.categoryId === c.id).length, children = data.categories.filter(x => x.parentId === c.id).length;
    if (!confirm(`Supprimer la catégorie « ${c.name} » ?${used ? `\n${used} opération(s) passeront « Sans catégorie ».` : ''}${children ? `\nSes ${children} sous-catégorie(s) deviendront principales.` : ''}`)) return;
    patch(d => ({ ...d, categories: d.categories.filter(x => x.id !== c.id).map(x => x.parentId === c.id ? { ...x, parentId: null, updated_at: new Date().toISOString() } : x), budgets: d.budgets.filter(b => b.categoryId !== c.id), deletedDepenseIds: [...new Set([...d.deletedDepenseIds, `categories:${c.id}`])] }));
    setCategoryForm(null);
  }
  async function readImportFile(file) {
    try {
      if (file.size > 15 * 1024 * 1024) throw new Error('Fichier trop volumineux (15 Mo maximum).');
      const json = JSON.parse(await file.text());
      const { report } = prepareExpenseImport(data, json);
      setImportState({ name: file.name, json, report });
    } catch (err) { setImportState({ name: file.name, error: err instanceof SyntaxError ? 'Ce fichier n\'est pas un JSON valide.' : err.message }); }
  }
  function confirmImport() {
    const { json, report } = importState;
    patch(d => { const prepared = prepareExpenseImport(d, json); return { ...d, ...prepared.data }; });
    if (report.to) setMonth(report.to.slice(0, 7));
    setImportState(null); setTab('journal');
  }

  const net = totals.income - totals.expenses;
  return <div className="xp">
    <h1 className="sr-only">Dépenses</h1>
    <MonthDonut data={data} month={month} cats={cats} totals={totals}/>
    <div className="xp-bar">
      <div className="xp-bar-balance"><strong className={net < 0 ? 'neg' : ''}>{money(net)}</strong><small><span className="pos-light">+{money(totals.income)}</span> · <span className="neg-light">−{money(totals.expenses)}</span></small></div>
      <div className="xp-bar-month">
        <button aria-label="Mois précédent" onClick={() => setMonth(m => shiftMonth(m, -1))}><ChevronLeft size={20}/></button>
        <label><span>{monthLabel(month)}</span><input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} aria-label="Choisir le mois"/></label>
        <button aria-label="Mois suivant" onClick={() => setMonth(m => shiftMonth(m, 1))}><ChevronRight size={20}/></button>
      </div>
    </div>

    <nav className="xp-tabs" ref={tabsRef} aria-label="Sections des dépenses">{TABS.map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>

    {tab === 'journal' && <section className="xp-journal">
      <div className="xp-filters">
        <div className="xp-chips">{FILTERS.map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
        <button className="icon-button" aria-label="Rechercher" onClick={() => { setShowSearch(s => !s); setSearch(''); }}>{showSearch ? <X size={18}/> : <Search size={18}/>}</button>
      </div>
      <p className="xp-hint">Touche une opération pour la modifier ou la supprimer.</p>
      {showSearch && <input className="xp-search" autoFocus placeholder="Rechercher une note ou un montant" value={search} onChange={e => setSearch(e.target.value)}/>}
      {days.length === 0 && <div className="xp-empty"><Wallet size={28}/><strong>Aucune opération en {monthLabel(month)}</strong><span>Ajoute une dépense, ou importe tes anciennes opérations.</span><button className="btn-secondary" onClick={() => setTab('comptes')}><Upload size={15}/> Importer (JSON)</button></div>}
      {days.length > 0 && <div className="xp-timeline">{days.map(day => <div className="xp-day" key={day.date}>
        <div className="xp-day-head"><span className="xp-col-amount">{shortDay(day.date)}</span><span className="xp-col-line"/><span className="xp-day-name">{dayLabel(day.date).startsWith('Aujourd') || dayLabel(day.date) === 'Hier' ? dayLabel(day.date) : weekday(day.date)}</span></div>
        <ul>{day.items.map(t => { const c = catById(t.categoryId), isTransfer = t.type === 'transfer'; return <li key={t.id}><button className="xp-row" aria-label={`Modifier ou supprimer : ${t.type === 'income' ? 'revenu' : t.type === 'transfer' ? 'virement' : 'dépense'} de ${money(t.amount)} du ${t.date}`} onClick={() => setForm({ ...t, amount: String(t.amount) })}>
          <span className={`xp-col-amount xp-amount ${t.type === 'income' ? 'pos' : t.type === 'expense' ? 'neg' : 'transfer'}`}>{t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}{money(t.amount)}</span>
          <span className="xp-col-line"><span className="xp-node" style={{ color: isTransfer ? 'var(--blue)' : t.type === 'income' ? 'var(--green)' : c?.color || 'var(--blue)' }}><CatIcon category={c} type={t.type}/></span></span>
          <span className="xp-main"><strong>{isTransfer ? 'Virement' : (c?.name || (t.type === 'income' ? 'Revenu' : 'Dépense'))}{timeOf(t) && <time>{timeOf(t)}</time>}</strong><small>{isTransfer ? `${accById(t.accountId)?.name || 'Compte'} → ${accById(t.destinationAccountId)?.name || 'Compte'}` : accById(t.accountId)?.name || 'Compte'}</small>{(t.note || t.receipt) && <em>{t.note}{t.receipt ? `${t.note ? ' · ' : ''}reçu joint` : ''}</em>}</span>
        </button></li>; })}</ul>
      </div>)}</div>}
    </section>}

    {tab === 'analyse' && <Analyse data={data} month={month} cats={cats} budgets={budgets} upcoming={upcoming} onBudgets={() => setTab('budgets')}/>}

    {tab === 'budgets' && <section className="panel xp-panel">
      <div className="xp-panel-head"><h2>Budgets · {monthLabel(month)}</h2><button className="btn-secondary" onClick={() => setBudgetForm({ categoryId: cats[0]?.id || '', limit: '' })}><Plus size={15}/> Budget</button></div>
      {budgets.map(b => <BudgetRow key={b.id} b={b} category={catById(b.categoryId)} onClick={() => setBudgetForm({ ...b })}/>)}
      {budgets.length === 0 && <p className="xp-muted">Aucun budget. Fixe une limite mensuelle par catégorie pour être alerté avant de la dépasser.</p>}
    </section>}

    {tab === 'recurrences' && <section className="panel xp-panel">
      <div className="xp-panel-head"><h2>Récurrences</h2><button className="btn-secondary" onClick={() => setRecurrenceForm({ name: '', amount: '', type: 'expense', frequency: 'monthly', nextDate: today(), accountId: data.accounts[0]?.id || '', categoryId: cats[0]?.id || '' })}><Plus size={15}/> Récurrence</button></div>
      <p className="xp-muted">Les opérations échues sont ajoutées automatiquement au journal, une seule fois.</p>
      <ul className="xp-list">{data.recurrences.map(r => <li key={r.id} className={r.active === false ? 'inactive' : ''}><CalendarClock size={18}/><span className="xp-main"><strong>{r.name}</strong><small>{({ weekly: 'Chaque semaine', monthly: 'Chaque mois', annual: 'Chaque année' })[r.frequency] || r.frequency} · {r.active === false ? 'désactivée' : `prochaine le ${new Date(`${r.nextDate}T12:00:00`).toLocaleDateString('fr-FR')}`}</small></span><span className="xp-amount neg">{money(r.amount)}</span>{r.active !== false && <button className="icon-button danger" aria-label={`Désactiver ${r.name}`} onClick={() => { if (confirm('Désactiver cette récurrence ?')) patch(d => ({ ...d, recurrences: d.recurrences.map(x => x.id === r.id ? { ...x, active: false, updated_at: new Date().toISOString() } : x) })); }}><X size={15}/></button>}</li>)}</ul>
      {data.recurrences.length === 0 && <p className="xp-muted">Aucune récurrence (loyer, abonnements…).</p>}
    </section>}

    {tab === 'comptes' && <section className="panel xp-panel">
      <div className="xp-panel-head"><h2>Comptes · {money(totalAccountBalance(data.accounts, data.transactions))}</h2><button className="btn-secondary" onClick={() => setAccountForm({ name: '', type: 'Espèces', initialBalance: '0' })}><Plus size={15}/> Compte</button></div>
      <ul className="xp-list">{data.accounts.map(a => <li key={a.id}><button className="xp-row" onClick={() => setAccountForm({ ...a, initialBalance: String(a.initialBalance ?? 0) })}><span className="xp-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Wallet size={17}/></span><span className="xp-main"><strong>{a.name}</strong><small>{a.type}</small></span><span className={`xp-amount ${(balances[a.id] || 0) < 0 ? 'neg' : ''}`}>{money(balances[a.id] || 0)}</span></button></li>)}</ul>
      {data.accounts.length === 0 && <p className="xp-muted">Ajoute un premier compte (espèces, banque…) pour noter tes opérations.</p>}
      <div className="xp-import">
        <div><strong>Importer d'anciennes opérations</strong><small>Fichier JSON avec dates, heures, catégories et notes. Un aperçu s'affiche avant l'enregistrement.</small></div>
        <label className="btn-primary"><Upload size={15}/> Importer un fichier JSON<input type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) readImportFile(f); }}/></label>
        <a className="btn-secondary" href="/modele-import-depenses.json" download="modele-import-depenses.json"><Download size={15}/> Télécharger le modèle</a>
      </div>
      <div className="xp-panel-head xp-sub"><h2>Catégories</h2><button className="btn-secondary" onClick={addCategory}><Plus size={15}/> Catégorie</button></div>
      <div className="xp-cat-list">{cats.map(c => <button key={c.id} className={c.parentId ? 'child' : ''} onClick={() => renameCategory(c)}><span className="xp-icon sm" style={{ background: `${c.color}22`, color: c.color }}><CatIcon category={c} size={15}/></span>{c.name}<Pencil size={12}/></button>)}</div>
    </section>}

    {tab !== 'comptes' && data.accounts.length > 0 && <div className="xp-accounts-strip">{data.accounts.map(a => <span key={a.id}>{a.name} <b>{money(balances[a.id] || 0)}</b></span>)}</div>}

    <div className="xp-actions">
      <button className="xp-act income" onClick={() => data.accounts.length ? setForm(newTransaction(data, 'income')) : setAccountForm({ name: 'Espèces', type: 'Espèces', initialBalance: '0' })}><CirclePlus size={24} strokeWidth={1.7}/><span>Revenu</span></button>
      <button className="xp-act expense" onClick={() => data.accounts.length ? setForm(newTransaction(data)) : setAccountForm({ name: 'Espèces', type: 'Espèces', initialBalance: '0' })}><CircleMinus size={24} strokeWidth={1.7}/><span>Dépense</span></button>
    </div>

    {categoryForm && <Sheet title={categoryForm.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'} onClose={() => setCategoryForm(null)}>
      <form className="xp-form" onSubmit={e => { e.preventDefault(); if (categoryForm.name.trim()) saveCategory(categoryForm); }}>
        <label>Nom<input autoFocus required value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}/></label>
        <div className="xp-form-row">
          <label>Utilisée pour<select value={categoryForm.kind} onChange={e => setCategoryForm({ ...categoryForm, kind: e.target.value })}><option value="expense">Dépenses</option><option value="income">Revenus</option><option value="both">Les deux</option></select></label>
          <label>Catégorie parente<select value={categoryForm.parentId} onChange={e => setCategoryForm({ ...categoryForm, parentId: e.target.value })}><option value="">Aucune (principale)</option>{cats.filter(c => !c.parentId && c.id !== categoryForm.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        </div>
        <label>Couleur<input type="color" value={categoryForm.color || '#5da98a'} onChange={e => setCategoryForm({ ...categoryForm, color: e.target.value })}/></label>
        <div className="xp-icon-picker" role="radiogroup" aria-label="Icône">{Object.entries(CATEGORY_ICON_SET).map(([key, Icon]) => <button type="button" role="radio" aria-checked={categoryForm.iconKey === key} aria-label={key} key={key} className={categoryForm.iconKey === key ? 'active' : ''} style={categoryForm.iconKey === key ? { color: categoryForm.color, borderColor: categoryForm.color } : null} onClick={() => setCategoryForm({ ...categoryForm, iconKey: key })}><Icon size={19}/></button>)}</div>
        <div className="xp-form-actions">{categoryForm.id && <button type="button" className="btn-danger-outline" onClick={() => removeCategory(categoryForm)}><Trash2 size={15}/> Supprimer</button>}<button className="btn-primary">Enregistrer</button></div>
      </form>
    </Sheet>}
    {importState && <Sheet title="Importer des opérations" onClose={() => setImportState(null)}>
      <div className="xp-form">
        <p className="xp-muted">Fichier : <b>{importState.name}</b></p>
        {importState.error ? <p className="inline-error">{importState.error}</p> : <>
          <ul className="xp-import-report">
            <li><span>Opérations à ajouter</span><b>{importState.report.added}</b></li>
            {importState.report.from && <li><span>Période</span><b>{new Date(`${importState.report.from}T12:00:00`).toLocaleDateString('fr-FR')} → {new Date(`${importState.report.to}T12:00:00`).toLocaleDateString('fr-FR')}</b></li>}
            <li><span>Revenus</span><b className="pos">+{money(importState.report.income)}</b></li>
            <li><span>Dépenses</span><b className="neg">−{money(importState.report.expense)}</b></li>
            {importState.report.duplicates > 0 && <li><span>Déjà présentes (ignorées)</span><b>{importState.report.duplicates}</b></li>}
            {importState.report.newAccounts.length > 0 && <li><span>Nouveaux comptes</span><b>{importState.report.newAccounts.join(', ')}</b></li>}
            {importState.report.newCategories.length > 0 && <li><span>Nouvelles catégories</span><b>{importState.report.newCategories.join(', ')}</b></li>}
          </ul>
          {importState.report.errors.length > 0 && <details className="xp-import-errors" open={importState.report.added === 0}><summary>{importState.report.errors.length} ligne(s) refusée(s)</summary><ul>{importState.report.errors.slice(0, 50).map(e => <li key={e.line}>Opération n° {e.line} : {e.message}</li>)}</ul></details>}
        </>}
        <div className="xp-form-actions"><button type="button" className="btn-secondary" onClick={() => setImportState(null)}>Annuler</button>{!importState.error && <button type="button" className="btn-primary" disabled={!importState.report.added} onClick={confirmImport}>Importer {importState.report.added} opération(s)</button>}</div>
      </div>
    </Sheet>}
    {form && <TransactionModal form={form} setForm={setForm} data={data} cats={cats} onSave={saveTransaction} onDelete={removeTransaction}/>}
    {accountForm && <Sheet title={accountForm.id ? 'Modifier le compte' : 'Nouveau compte'} onClose={() => setAccountForm(null)}>
      <form className="xp-form" onSubmit={e => { e.preventDefault(); if (accountForm.name.trim()) saveAccount({ ...accountForm, name: accountForm.name.trim(), initialBalance: Number(String(accountForm.initialBalance).replace(',', '.')) || 0 }); }}>
        {!data.accounts.length && <p className="xp-muted">Crée d'abord un compte pour y rattacher tes opérations.</p>}
        <label>Nom<input autoFocus required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}/></label>
        <label>Type<select value={accountForm.type} onChange={e => setAccountForm({ ...accountForm, type: e.target.value })}>{[...new Set([...ACCOUNT_TYPES, accountForm.type])].map(t => <option key={t}>{t}</option>)}</select></label>
        <label>Solde initial (€)<input inputMode="decimal" value={accountForm.initialBalance} onChange={e => setAccountForm({ ...accountForm, initialBalance: e.target.value })}/></label>
        <div className="xp-form-actions">{accountForm.id && <button type="button" className="btn-danger-outline" onClick={() => removeAccount(accountForm)}><Trash2 size={15}/> Supprimer</button>}<button className="btn-primary">Enregistrer</button></div>
      </form>
    </Sheet>}
    {budgetForm && <Sheet title={budgetForm.id ? 'Modifier le budget' : 'Nouveau budget'} onClose={() => setBudgetForm(null)}>
      <form className="xp-form" onSubmit={e => { e.preventDefault(); if (budgetForm.categoryId && Number(budgetForm.limit) > 0) saveBudget(budgetForm); }}>
        <label>Catégorie<select required value={budgetForm.categoryId} onChange={e => setBudgetForm({ ...budgetForm, categoryId: e.target.value })}>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Limite mensuelle (€)<input required inputMode="decimal" value={budgetForm.limit} onChange={e => setBudgetForm({ ...budgetForm, limit: e.target.value.replace(',', '.') })}/></label>
        <div className="xp-form-actions">{budgetForm.id && <button type="button" className="btn-danger-outline" onClick={() => removeBudget(budgetForm)}><Trash2 size={15}/> Supprimer</button>}<button className="btn-primary">Enregistrer</button></div>
      </form>
    </Sheet>}
    {recurrenceForm && <Sheet title="Nouvelle récurrence" onClose={() => setRecurrenceForm(null)}>
      <form className="xp-form" onSubmit={e => { e.preventDefault(); const amount = Number(String(recurrenceForm.amount).replace(',', '.')); if (recurrenceForm.name.trim() && amount > 0 && recurrenceForm.accountId) saveRecurrence({ ...recurrenceForm, name: recurrenceForm.name.trim(), amount }); }}>
        {!data.accounts.length && <p className="xp-muted">Ajoute d'abord un compte dans l'onglet Comptes.</p>}
        <label>Nom<input autoFocus required placeholder="Loyer, abonnement…" value={recurrenceForm.name} onChange={e => setRecurrenceForm({ ...recurrenceForm, name: e.target.value })}/></label>
        <label>Montant (€)<input required inputMode="decimal" value={recurrenceForm.amount} onChange={e => setRecurrenceForm({ ...recurrenceForm, amount: e.target.value })}/></label>
        <label>Fréquence<select value={recurrenceForm.frequency} onChange={e => setRecurrenceForm({ ...recurrenceForm, frequency: e.target.value })}><option value="weekly">Chaque semaine</option><option value="monthly">Chaque mois</option><option value="annual">Chaque année</option></select></label>
        <label>Prochaine date<input type="date" required value={recurrenceForm.nextDate} onChange={e => setRecurrenceForm({ ...recurrenceForm, nextDate: e.target.value })}/></label>
        <label>Compte<select required value={recurrenceForm.accountId} onChange={e => setRecurrenceForm({ ...recurrenceForm, accountId: e.target.value })}><option value="">Choisir</option>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label>Catégorie<select value={recurrenceForm.categoryId} onChange={e => setRecurrenceForm({ ...recurrenceForm, categoryId: e.target.value })}>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className="xp-form-actions"><button className="btn-primary" disabled={!data.accounts.length}>Enregistrer</button></div>
      </form>
    </Sheet>}
  </div>;
}

function MonthDonut({ data, month, cats, totals }) {
  const pie = aggregatePieCategories(aggregateByCategory(data.transactions, month), cats, { maxCategories: 6, smallSlicePercent: 4 });
  const unspent = Math.max(0, totals.income - totals.expenses);
  const rows = [...pie.rows.map(r => ({ ...r })), ...(unspent > 0 ? [{ id: 'unspent', name: 'Non dépensé', color: 'var(--donut-rest)', amount: unspent }] : [])];
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const C = 2 * Math.PI * 62; let offset = 0;
  return <section className="xp-donut-card" aria-label="Répartition du mois">
    <svg viewBox="0 0 180 180" className="xp-donut" role="img" aria-label={`Dépenses de ${monthLabel(month)}`}>
      <circle cx="90" cy="90" r="62" fill="none" stroke="var(--border)" strokeWidth="30"/>
      {total > 0 && rows.map(r => { const dash = r.amount / total * C, el = <circle key={r.id} cx="90" cy="90" r="62" fill="none" stroke={r.color} strokeWidth="30" strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={-offset} transform="rotate(-90 90 90)"/>; offset += dash; return el; })}
      <text x="90" y="84" textAnchor="middle" className="xp-donut-k">{new Date(`${month}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase()}</text>
      <text x="90" y="104" textAnchor="middle" className="xp-donut-v">{money(totals.expenses)}</text>
    </svg>
    <ul className="xp-donut-legend">{rows.length ? rows.map(r => <li key={r.id}><i style={{ background: r.color }}/><span>{r.name}</span><b>{Math.round(r.amount / total * 100)} %</b></li>) : <li className="xp-muted">Aucune opération ce mois-ci</li>}</ul>
  </section>;
}

function Sheet({ title, onClose, children }) {
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal xp-sheet" role="dialog" aria-modal="true" aria-label={title}><div className="xp-sheet-head"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={19}/></button></div>{children}</div></div>;
}

function TransactionModal({ form, setForm, data, cats, onSave, onDelete }) {
  const set = patch => setForm({ ...form, ...patch });
  const amount = Number(String(form.amount).replace(',', '.'));
  const valid = amount > 0 && form.accountId && form.date && (form.type !== 'transfer' || (form.destinationAccountId && form.destinationAccountId !== form.accountId));
  return <Sheet title={form.id ? "Modifier l'opération" : 'Nouvelle opération'} onClose={() => setForm(null)}>
    <form className="xp-form" onSubmit={e => { e.preventDefault(); if (valid) onSave(form); }}>
      <div className="xp-type">{TYPES.map(([id, label]) => <button type="button" key={id} className={`${form.type === id ? 'active' : ''} t-${id}`} onClick={() => { const allowed = categoriesForType(cats, id); set({ type: id, categoryId: id === 'transfer' ? '' : allowed.some(c => c.id === form.categoryId) ? form.categoryId : (id === 'expense' ? allowed[0]?.id || '' : '') }); }}>{label}</button>)}</div>
      <label className={`xp-amount-input t-${form.type}`}><span>€</span><input autoFocus required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={e => set({ amount: e.target.value.replace(/[^\d.,]/g, '') })} aria-label="Montant en euros"/></label>
      {form.type !== 'transfer' && <div className="xp-cat-grid" role="radiogroup" aria-label="Catégorie">{categoriesForType(cats, form.type).map(c => <button type="button" role="radio" aria-checked={form.categoryId === c.id} key={c.id} className={form.categoryId === c.id ? 'active' : ''} onClick={() => set({ categoryId: form.categoryId === c.id ? '' : c.id })}><span className="xp-icon" style={{ background: `${c.color}22`, color: c.color }}><CatIcon category={c} size={19}/></span><small>{c.name}</small>{c.parentId && <em>{cats.find(p => p.id === c.parentId)?.name}</em>}</button>)}</div>}
      <div className="xp-form-row">
        <label>{form.type === 'transfer' ? 'De' : 'Compte'}<select required value={form.accountId} onChange={e => set({ accountId: e.target.value })}><option value="">Choisir</option>{data.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        {form.type === 'transfer' ? <label>Vers<select required value={form.destinationAccountId || ''} onChange={e => set({ destinationAccountId: e.target.value })}><option value="">Choisir</option>{data.accounts.filter(a => a.id !== form.accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
          : <label>Date<input type="date" required value={form.date} onChange={e => set({ date: e.target.value })}/></label>}
      </div>
      {form.type === 'transfer' && <label>Date<input type="date" required value={form.date} onChange={e => set({ date: e.target.value })}/></label>}
      <label>Note<input placeholder="Marché, essence, salaire…" value={form.note || ''} onChange={e => set({ note: e.target.value })}/></label>
      <label className="xp-receipt">Photo du reçu {form.receipt ? <small>({Math.round(form.receipt.length / 1024)} Ko) <button type="button" className="text-link" onClick={() => set({ receipt: '' })}>retirer</button></small> : null}<input type="file" accept="image/*" onChange={async e => { if (e.target.files?.[0]) try { set({ receipt: await compressImage(e.target.files[0]) }); } catch { alert('Impossible de lire ce reçu.'); } }}/></label>
      {form.receipt && <a className="text-link" href={form.receipt} target="_blank" rel="noreferrer">Voir le reçu</a>}
      <div className="xp-form-actions">{form.id && <button type="button" className="btn-danger-outline" onClick={() => onDelete(form)}><Trash2 size={15}/> Supprimer</button>}<button className="btn-primary" disabled={!valid}>Enregistrer</button></div>
    </form>
  </Sheet>;
}

function Analyse({ data, month, cats, budgets, upcoming, onBudgets }) {
  const pie = aggregatePieCategories(aggregateByCategory(data.transactions, month), cats);
  const trend = buildMonthlySeries(data.transactions, month);
  return <div className="xp-analyse">
    <section className="panel xp-panel">
      <h2>Dépenses par catégorie</h2>
      {pie.total > 0 ? <div className="expense-pie-layout"><svg className="expense-donut" viewBox="0 0 160 160" role="img" aria-label={`Répartition des dépenses pour ${month}`}><circle cx="80" cy="80" r="58" fill="none" stroke="var(--border)" strokeWidth="22"/>{(() => { let offset = 0; return pie.rows.map(row => { const dash = row.percent / 100 * 364.425, node = <circle key={row.id} cx="80" cy="80" r="58" fill="none" stroke={row.color} strokeWidth="22" strokeDasharray={`${dash} ${364.425 - dash}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)"/>; offset += dash; return node; }); })()}<text x="80" y="76" textAnchor="middle" className="expense-donut-label">Total</text><text x="80" y="96" textAnchor="middle" className="expense-donut-total">{money(pie.total)}</text></svg>
        <ul className="xp-legend">{pie.rows.map(row => <li key={row.id}><i style={{ background: row.color }}/><span>{row.name}</span><small>{row.percent.toFixed(0)} %</small><b>{money(row.amount)}</b></li>)}</ul></div>
        : <p className="xp-muted">Aucune dépense ce mois-ci.</p>}
    </section>
    <section className="panel xp-panel">
      <h2>6 derniers mois</h2>
      <svg className="expense-trend-svg" viewBox="0 0 420 170" role="img" aria-label="Revenus et dépenses sur six mois"><line x1="20" y1="135" x2="400" y2="135" stroke="var(--border)"/>{['expenses', 'income'].map((kind, j) => { const vals = trend[kind], y = n => 125 - (n / trend.max) * 105; return <g key={kind}><polyline fill="none" stroke={j ? '#4ca68a' : '#dc806d'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={vals.map((n, i) => `${20 + i * 76},${y(n)}`).join(' ')}/>{vals.map((n, i) => <circle key={i} cx={20 + i * 76} cy={y(n)} r="3.5" fill={j ? '#4ca68a' : '#dc806d'}/>)}</g>; })}{trend.months.map((key, i) => <text key={key} x={20 + i * 76} y="155" textAnchor="middle" className="expense-month-tick">{new Date(`${key}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' })}</text>)}</svg>
      <div className="chart-legend"><span><i style={{ background: '#dc806d' }}/> Dépenses</span><span><i style={{ background: '#4ca68a' }}/> Revenus</span></div>
    </section>
    <section className="panel xp-panel"><div className="xp-panel-head"><h2>Budgets</h2><button className="text-link" onClick={onBudgets}>Gérer</button></div>{budgets.slice(0, 4).map(b => <BudgetRow key={b.id} b={b} category={data.categories.find(c => c.id === b.categoryId)}/>)}{!budgets.length && <p className="xp-muted">Aucun budget défini.</p>}</section>
    <section className="panel xp-panel"><h2>À venir</h2>{upcoming.length ? <ul className="xp-list">{upcoming.map(r => <li key={r.id}><CalendarClock size={17}/><span className="xp-main"><strong>{r.name}</strong><small>{new Date(`${r.nextDate}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</small></span><span className="xp-amount neg">{money(r.amount)}</span></li>)}</ul> : <p className="xp-muted">Aucun paiement à venir.</p>}</section>
  </div>;
}

function BudgetRow({ b, category, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return <Tag className="budget-row xp-budget" onClick={onClick}><div><strong>{category?.name || 'Catégorie supprimée'}</strong><small>{money(b.spent)} / {money(b.limit)}</small></div><div className="budget-track"><i style={{ width: `${Math.min(100, b.progress * 100)}%`, background: b.over ? '#d85f62' : b.progress > .8 ? '#df9f40' : category?.color || '#58a68d' }}/></div><b className={b.over ? 'negative' : ''}>{b.limit ? Math.round(b.progress * 100) : 0} %</b></Tag>;
}
