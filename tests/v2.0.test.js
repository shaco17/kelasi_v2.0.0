import test from 'node:test';
import assert from 'node:assert/strict';
import { groupTransactionsByDay, shiftMonth } from '../src/lib/depenses.js';

const tx = [
  { id: 'a', date: '2026-11-05', amount: 10, type: 'expense', note: 'Marché', created_at: '2026-11-05T09:00:00Z' },
  { id: 'b', date: '2026-11-05', amount: 100, type: 'income', created_at: '2026-11-05T10:00:00Z' },
  { id: 'c', date: '2026-11-02', amount: 7.5, type: 'expense' },
  { id: 'd', date: '2026-10-30', amount: 99, type: 'expense' }
];

test('journal : groupé par jour, plus récent d’abord, totaux du jour, mois filtré', () => {
  const days = groupTransactionsByDay(tx, '2026-11');
  assert.deepEqual(days.map(d => d.date), ['2026-11-05', '2026-11-02']);
  assert.equal(days[0].net, 90);
  assert.deepEqual(days[0].items.map(t => t.id), ['b', 'a']);
});

test('journal : filtres type et recherche', () => {
  assert.equal(groupTransactionsByDay(tx, '2026-11', { type: 'income' }).length, 1);
  assert.deepEqual(groupTransactionsByDay(tx, '2026-11', { search: 'marché' }).map(d => d.items.length), [1]);
});

test('shiftMonth passe correctement d’une année à l’autre', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
