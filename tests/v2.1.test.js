import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeDepenses, upgradeCategories, categoriesForType, blankDepenses } from '../src/lib/depenses.js';
import { prepareExpenseImport, parseAmount, parseDate } from '../src/lib/import-depenses.js';

const model = JSON.parse(readFileSync(new URL('../public/modele-import-depenses.json', import.meta.url)));

test('le modèle fourni s’importe entièrement sans erreur', () => {
  const { data, report } = prepareExpenseImport(blankDepenses(), model);
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  assert.equal(report.added, model.operations.length);
  assert.equal(report.from, '2025-07-01'); assert.equal(report.to, '2025-07-25');
  const elec = data.transactions.find(t => t.amount === 50.15);
  assert.equal(elec.categoryId, 'electricite'); assert.equal(elec.type, 'expense');
  const transfer = data.transactions.find(t => t.type === 'transfer');
  assert.ok(transfer.destinationAccountId && transfer.destinationAccountId !== transfer.accountId);
  assert.deepEqual(report.newAccounts.sort(), ['Banque Postale', 'Max Card']); // « Espèces » existe déjà par défaut
  assert.ok(data.accounts.some(a => a.id === 'especes' && data.transactions.some(t => t.accountId === 'especes')));
});

test('réimporter le même fichier n’ajoute pas de doublons', () => {
  const first = prepareExpenseImport(blankDepenses(), model).data;
  const second = prepareExpenseImport(first, model);
  assert.equal(second.report.added, 0);
  assert.equal(second.report.duplicates, model.operations.length);
});

test('noms allemands de l’ancienne application, montants et dates en texte', () => {
  const { data, report } = prepareExpenseImport(blankDepenses(), { operations: [
    { date: '19.07.2025', type: 'Ausgabe', montant: '1.750,00 €', categorie: 'Miete', compte: 'Bargeld' },
    { date: '01/08/2025', montant: -12.5, categorie: 'Kabel-TV' },
    { date: '2025-08-02', montant: 2400, categorie: 'Gehalt' },
    { date: '2025-02-30', type: 'depense', montant: 5 },
    { date: '2025-08-03', type: 'depense', montant: 0 }
  ] });
  assert.equal(report.added, 3); assert.equal(report.errors.length, 2);
  const [t1, t2, t3] = data.transactions.slice(0, 3).sort((a, b) => a.date.localeCompare(b.date));
  assert.equal(t1.categoryId, 'loyer'); assert.equal(t1.amount, 1750);
  assert.equal(data.accounts.find(a => a.id === t1.accountId).name, 'Espèces');
  assert.equal(t2.categoryId, 'tv'); assert.equal(t2.type, 'expense');
  assert.equal(t3.categoryId, 'salaire'); assert.equal(t3.type, 'income');
});

test('fichier sans liste d’opérations : erreur explicite', () => {
  assert.throws(() => prepareExpenseImport(blankDepenses(), { foo: 1 }), /operations/);
});

test('helpers de lecture', () => {
  assert.equal(parseAmount('1.234,56'), 1234.56); assert.equal(parseAmount('1,234.56'), 1234.56); assert.equal(parseAmount('50,15'), 50.15);
  assert.equal(parseDate('2025-07-19'), '2025-07-19'); assert.equal(parseDate('9/7/2025'), '2025-07-09'); assert.equal(parseDate('31.02.2025'), null);
});

test('catégories : anciennes valeurs mises à niveau, nouvelles ajoutées, suppression respectée', () => {
  const upgraded = upgradeCategories([{ id: 'courses', name: 'Courses', color: '#48a88a', icon: '🛒' }, { id: 'mine', name: 'Perso' }], ['categories:voyage']);
  assert.equal(upgraded.find(c => c.id === 'courses').name, 'Alimentation / Repas');
  assert.ok(upgraded.find(c => c.id === 'electricite')?.parentId === 'factures');
  assert.ok(!upgraded.some(c => c.id === 'voyage'));
  assert.ok(upgraded.some(c => c.id === 'mine'));
  const renamed = upgradeCategories([{ id: 'loyer', name: 'Mon loyer' }]);
  assert.equal(renamed.find(c => c.id === 'loyer').name, 'Mon loyer');
});

test('grille de saisie : revenus et dépenses ont leurs propres catégories', () => {
  const cats = normalizeDepenses({}).categories;
  const income = categoriesForType(cats, 'income').map(c => c.id);
  const expense = categoriesForType(cats, 'expense').map(c => c.id);
  assert.ok(income.includes('salaire') && !income.includes('loyer'));
  assert.ok(expense.includes('loyer') && !expense.includes('salaire') && expense.includes('epargne'));
  assert.equal(categoriesForType(cats, 'transfer').length, 0);
});
