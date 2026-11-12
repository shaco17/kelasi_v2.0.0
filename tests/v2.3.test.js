import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryBreakdown, monthlyStatement, groupTransactionsByDay, monthlyTotals, normalizeDepenses } from '../src/lib/depenses.js';

const tx = [
  { id: '1', date: '2024-07-20', type: 'income', amount: 1000, categoryId: 'salaire' },
  { id: '2', date: '2024-09-03', type: 'expense', amount: 200, categoryId: 'loyer' },
  { id: '3', date: '2026-11-01', type: 'expense', amount: 550, categoryId: 'loyer' },
  { id: '4', date: '2026-11-01', type: 'expense', amount: 150, categoryId: 'sante' },
  { id: '5', date: '2026-11-06', type: 'expense', amount: 10, categoryId: 'courses' },
  { id: '6', date: '2026-11-11', type: 'income', amount: 80, categoryId: 'salaire' }
];

test('période : mois, année ou tout l’historique', () => {
  assert.deepEqual(monthlyTotals(tx, '2026-11'), { income: 80, expenses: 710 });
  assert.deepEqual(monthlyTotals(tx, '2024'), { income: 1000, expenses: 200 });
  assert.deepEqual(monthlyTotals(tx, ''), { income: 1080, expenses: 910 });
  assert.equal(groupTransactionsByDay(tx, '').length, 5);
  assert.deepEqual(groupTransactionsByDay(tx, '', { categoryIds: ['loyer'] }).map(d => d.date), ['2026-11-01', '2024-09-03']);
});

test('relevé mensuel depuis la première opération, avec cumul', () => {
  const s = monthlyStatement(tx, '', '2026-11');
  assert.equal(s[0].month, '2024-07'); assert.equal(s.at(-1).month, '2026-11');
  assert.equal(s.length, 29);
  assert.equal(s.at(-1).cumul, 170);
  assert.equal(s.find(m => m.month === '2024-08').net, 0);
  assert.equal(monthlyStatement(tx, '2026').length, 12);
  assert.equal(monthlyStatement(tx, '2026-11').length, 12);
  assert.deepEqual(monthlyStatement([], ''), []);
});

test('détail par catégorie : montants, nombre, part et budget du mois', () => {
  const cats = normalizeDepenses({}).categories;
  const { total, rows } = categoryBreakdown(tx, cats, '2026-11', 'expense', [{ id: 'b', categoryId: 'sante', limit: 144 }]);
  assert.equal(total, 710);
  assert.deepEqual(rows.map(r => [r.name, r.amount, r.count]), [['Loyer', 550, 1], ['Santé / Assurance', 150, 1], ['Alimentation / Repas', 10, 1]]);
  assert.equal(rows[1].limit, 144); assert.equal(rows[1].over, true);
  assert.equal(categoryBreakdown(tx, cats, '', 'expense', [{ categoryId: 'sante', limit: 1 }]).rows[1].limit, null);
  assert.equal(categoryBreakdown(tx, cats, '', 'income').total, 1080);
});
