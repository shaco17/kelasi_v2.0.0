export const DEPENSES_KEYS = ['accounts','categories','transactions','recurrences','budgets'];
// [id, nom, couleur, iconKey, type ('expense' | 'income' | 'both'), parentId]
export const DEFAULT_EXPENSE_CATEGORIES = [
  ['abonnement','Abonnement','#7c6cd6','repeat','expense'],
  ['transport','Auto / Transport','#e69c44','car','expense'],
  ['education','Éducation / Livres','#5a8fd8','book','expense'],
  ['courses','Alimentation / Repas','#48a88a','cart','expense'],
  ['restaurants','Restaurants','#df875f','food','expense'],
  ['salaire','Salaire','#16a37a','briefcase','income'],
  ['paie','Paie','#2fb38b','banknote','income'],
  ['sante','Santé / Assurance','#d96d79','health','expense'],
  ['animaux','Animaux','#b5835a','paw','expense'],
  ['enfant','Enfant','#e58fb5','baby','expense'],
  ['vetements','Vêtements','#b05cc0','shirt','expense'],
  ['soins','Soins personnels','#d58ac9','sparkles','expense'],
  ['carte-credit','Carte de crédit','#5d6f86','card','expense'],
  ['loyer','Loyer','#cf5a4f','house','expense'],
  ['dons','Dons / Solidarité','#e0a43a','charity','expense'],
  ['factures','Factures','#4c9ab0','receipt','expense'],
  ['electricite','Électricité','#e6b81f','zap','expense','factures'],
  ['chauffage','Chauffage','#e2703a','flame','expense','factures'],
  ['internet','Internet','#3e8fd6','wifi','expense','factures'],
  ['tv','Télévision','#6a74c9','tv','expense','factures'],
  ['mobile','Téléphone mobile','#4aa3a0','phone','expense','factures'],
  ['eau','Eau','#3aa6d9','water','expense','factures'],
  ['enerlec','Enerlec','#d4a72c','bulb','expense','factures'],
  ['voyage','Voyage','#2f9fcf','plane','expense'],
  ['agence-voyage','Agence de voyage','#2a7fb8','globe','expense'],
  ['loisirs','Loisirs / Divertissement','#9876c7','ticket','expense'],
  ['vente','Vente','#3ea36b','store','income'],
  ['maison','Maison / Réparation','#a07a4f','hammer','expense'],
  ['frais-bancaires','Frais bancaires','#6b7a88','bank','expense'],
  ['epargne','Épargne','#0e8f6c','piggy','both'],
  ['emprunt-x','Emprunt à X','#3f86c6','borrow','both'],
  ['pret-x','Prêt à X','#c7783f','lend','both'],
  ['transfert','Transfert','#5795df','transfer','both'],
  ['autre','Autre','#87929a','tag','both']
].map(([id,name,color,iconKey,kind,parentId])=>({id,name,color,iconKey,kind,parentId:parentId||null,icon:'',deleted:false}));
const DEFAULT_BY_ID = new Map(DEFAULT_EXPENSE_CATEGORIES.map(c => [c.id, c]));
// Anciens noms par défaut (v1.x) : renommés seulement si l'utilisateur ne les a pas modifiés.
const LEGACY_DEFAULT_NAMES = { courses:'Courses', transport:'Transport', sante:'Santé', loisirs:'Loisirs', factures:'Factures', restaurants:'Restaurants', loyer:'Loyer', autre:'Autre' };
/** Complète la liste de catégories avec les catégories par défaut manquantes (sauf celles supprimées). */
export function upgradeCategories(categories=[], deletedIds=[]){
  const deleted=new Set(deletedIds), seen=new Set();
  const out=categories.map(c=>{seen.add(c.id);const def=DEFAULT_BY_ID.get(c.id);if(!def)return {kind:'both',parentId:null,...c};const renamed=LEGACY_DEFAULT_NAMES[c.id]&&c.name===LEGACY_DEFAULT_NAMES[c.id]?def.name:c.name;return {...def,...c,name:renamed,iconKey:c.iconKey||def.iconKey,kind:c.kind||def.kind,parentId:c.parentId===undefined?def.parentId:c.parentId,color:c.color||def.color};});
  for(const def of DEFAULT_EXPENSE_CATEGORIES)if(!seen.has(def.id)&&!deleted.has(`categories:${def.id}`))out.push({...def});
  return out;
}
/** Ordre d'affichage : parent puis ses sous-catégories, dans l'ordre de la liste. */
export function orderedCategories(categories=[]){const list=categories.filter(c=>!c.deleted),ids=new Set(list.map(c=>c.id)),roots=list.filter(c=>!c.parentId||!ids.has(c.parentId));return roots.flatMap(r=>[r,...list.filter(c=>c.parentId===r.id)]);}
export function categoriesForType(categories=[],type='expense'){return orderedCategories(categories).filter(c=>type==='transfer'?false:(c.kind||'both')==='both'||c.kind===type);}
// Comptes proposés par défaut dans Dépenses (ajoutés s'ils n'existent pas déjà sous ce nom).
export const DEFAULT_ACCOUNTS = [['especes','Espèces','Espèces'],['n26','N26','Banque'],['sparkasse','Sparkasse','Banque'],['commerzbank','Commerzbank','Banque'],['wise','Wise','Banque'],['revolut','Revolut','Banque']]
  .map(([id,name,type])=>({id,name,type,initialBalance:0,currency:'EUR'}));
const accountKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function upgradeAccounts(accounts=[],deletedIds=[]){const deleted=new Set(deletedIds),names=new Set(accounts.map(a=>accountKey(a.name))),ids=new Set(accounts.map(a=>a.id));const out=[...accounts];for(const def of DEFAULT_ACCOUNTS)if(!ids.has(def.id)&&!names.has(accountKey(def.name))&&!deleted.has(`accounts:${def.id}`))out.push({...def});return out;}
export function blankDepenses(){ return {accounts:[],categories:DEFAULT_EXPENSE_CATEGORIES.map(x=>({...x})),transactions:[],recurrences:[],budgets:[],deletedDepenseIds:[]}; }
const asArray = x => Array.isArray(x) ? x : [];
export function normalizeDepenses(value={}){const input=value&&typeof value==='object'?value:{},d={...blankDepenses(),...input};d.accounts=asArray(input.accounts??input.comptes);delete d.comptes;for(const k of DEPENSES_KEYS)d[k]=asArray(d[k]);d.deletedDepenseIds=[...new Set(asArray(d.deletedDepenseIds).map(key=>typeof key==='string'&&key.startsWith('comptes:')?`accounts:${key.slice(8)}`:key))];d.categories=upgradeCategories(d.categories,d.deletedDepenseIds);d.accounts=upgradeAccounts(d.accounts,d.deletedDepenseIds);return d;}
export function calculateAccountBalances(accounts=[],transactions=[]){const totals=new Map(asArray(accounts).map(a=>[a.id,Number(a.initialBalance)||0]));for(const t of asArray(transactions)){const amount=Math.abs(Number(t.amount)||0);if(t.type==='income')totals.set(t.accountId,(totals.get(t.accountId)||0)+amount);else if(t.type==='expense')totals.set(t.accountId,(totals.get(t.accountId)||0)-amount);else if(t.type==='transfer'){totals.set(t.accountId,(totals.get(t.accountId)||0)-amount);if(t.destinationAccountId)totals.set(t.destinationAccountId,(totals.get(t.destinationAccountId)||0)+amount);}}return Object.fromEntries(totals);}
export function totalAccountBalance(accounts=[],transactions=[]){return Object.values(calculateAccountBalances(accounts,transactions)).reduce((s,n)=>s+n,0);}
export function monthlyTotals(transactions=[],month){return asArray(transactions).filter(t=>(t.date||'').slice(0,7)===month).reduce((o,t)=>{if(t.type==='expense')o.expenses+=Number(t.amount)||0;if(t.type==='income')o.income+=Number(t.amount)||0;return o;},{income:0,expenses:0});}
export function aggregateByCategory(transactions=[],month){const out={};for(const t of asArray(transactions)){if(t.type!=='expense'||(month&&(t.date||'').slice(0,7)!==month))continue;out[t.categoryId||'other']=(out[t.categoryId||'other']||0)+(Number(t.amount)||0);}return out;}
export function budgetProgress(budgets=[],transactions=[],month){const totals=aggregateByCategory(transactions,month);return asArray(budgets).map(b=>{const spent=totals[b.categoryId]||0,limit=Math.max(0,Number(b.limit)||0);return {...b,spent,progress:limit?spent/limit:0,over:limit>0&&spent>limit};});}
function shiftDate(iso,frequency){const d=new Date(`${iso}T12:00:00Z`);if(frequency==='weekly')d.setUTCDate(d.getUTCDate()+7);else if(frequency==='annual'){const day=d.getUTCDate(),month=d.getUTCMonth();d.setUTCDate(1);d.setUTCFullYear(d.getUTCFullYear()+1);d.setUTCMonth(month);d.setUTCDate(Math.min(day,new Date(Date.UTC(d.getUTCFullYear(),month+1,0)).getUTCDate()));}else{const day=d.getUTCDate(),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1));target.setUTCDate(Math.min(day,new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate()));return target.toISOString().slice(0,10);}return d.toISOString().slice(0,10);}
export function generateDueOccurrences(recurrences=[],transactions=[],today=new Date().toISOString().slice(0,10)){const rows=asArray(transactions).slice(),ids=new Set(rows.map(t=>t.id)),nextRecurrences=asArray(recurrences).map(r=>({...r}));for(const r of nextRecurrences){if(r.active===false||!r.nextDate)continue;let date=r.nextDate,guard=0;while(date<=today&&guard++<120){const id=`rec-${r.id}-${date}`;if(!ids.has(id)){rows.push({id,date,amount:Number(r.amount)||0,type:r.type||'expense',accountId:r.accountId,destinationAccountId:r.destinationAccountId||null,categoryId:r.categoryId||null,note:r.note||r.name||'',recurrenceId:r.id,created_at:`${date}T00:00:00.000Z`});ids.add(id);}date=shiftDate(date,r.frequency||'monthly');}r.nextDate=date;}return {transactions:rows,recurrences:nextRecurrences};}
export function mergeExpenseData(remote={},local={}){const r=normalizeDepenses(remote),l=normalizeDepenses(local),result={...r,...l};delete result.comptes;const tombstones=[...new Set([...r.deletedDepenseIds,...l.deletedDepenseIds])];for(const key of DEPENSES_KEYS){const m=new Map(r[key].map(x=>[x.id,x]));for(const row of l[key]){const prev=m.get(row.id);if(!prev||(Date.parse(row.updated_at||row.created_at||'')||0)>=(Date.parse(prev.updated_at||prev.created_at||'')||0))m.set(row.id,{...prev,...row});}result[key]=[...m.values()].filter(x=>!tombstones.includes(`${key}:${x.id}`));}result.deletedDepenseIds=tombstones;return result;}
export function importExpenseData(current={},backup={}){const base=normalizeDepenses(current),incoming=backup&&typeof backup==='object'?backup:{};return mergeExpenseData(base,normalizeDepenses(incoming));}
export function upcomingPayments(recurrences=[],today=new Date().toISOString().slice(0,10)){return asArray(recurrences).filter(r=>r.active!==false&&r.nextDate>=today).sort((a,b)=>a.nextDate.localeCompare(b.nextDate));}
/** Journal : opérations du mois groupées par jour (plus récent d'abord) avec totaux du jour. */
export function groupTransactionsByDay(transactions=[],month,{type='all',search='',accountId=''}={}){const q=String(search||'').trim().toLowerCase();const days=new Map();for(const t of asArray(transactions)){const date=String(t.date||'').slice(0,10);if(!date||(month&&date.slice(0,7)!==month))continue;if(type!=='all'&&t.type!==type)continue;if(accountId&&t.accountId!==accountId&&t.destinationAccountId!==accountId)continue;if(q&&!`${t.note||''} ${t.amount}`.toLowerCase().includes(q))continue;if(!days.has(date))days.set(date,{date,items:[],income:0,expense:0});const d=days.get(date),amount=Math.abs(Number(t.amount)||0);d.items.push(t);if(t.type==='income')d.income+=amount;else if(t.type==='expense')d.expense+=amount;}return [...days.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(d=>({...d,net:d.income-d.expense,items:d.items.sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))}));}
export function shiftMonth(month,delta){const [y,m]=String(month).split('-').map(Number);const d=new Date(Date.UTC(y,(m-1)+delta,1));return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;}
