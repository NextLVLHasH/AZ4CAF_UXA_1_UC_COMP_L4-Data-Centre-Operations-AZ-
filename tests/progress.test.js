'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const P = require('../docs/assets/progress.js');
const legacyNote = JSON.stringify(['Computing', 'Original wording']);
const legacyCard = JSON.stringify(['Computing', 'Original question']);
const content = {
  units: [{ id: 'unit-1' }, { id: 'unit-2' }],
  notes: [{ id: 'note-1', unit: 'Computing', topic: 'Corrected wording', legacy_keys: [legacyNote] }],
  flashcards: [
    { id: 'card-1', unit: 'Computing', question: 'Improved question', legacy_keys: [legacyCard] },
    { id: 'card-2', legacy_keys: ['old-card-2'] },
    { id: 'card-3', legacy_keys: [] },
  ],
  lessons: [{ id: 'lesson-1' }],
  labs: [{ id: 'lab-1', steps: ['Inspect', 'Verify'] }],
  capstones: [{ id: 'capstone-1', steps: ['Plan', 'Practise', 'Review'] }],
  questions: [
    { id: 'question-1', unit_id: 'unit-1', choices: ['Correct', 'Wrong'], correct_index: 0 },
    { id: 'question-2', unit_id: 'unit-1', choices: ['Wrong', 'Correct'], correct_index: 1 },
    { id: 'question-3', unit_id: 'unit-2', choices: ['Correct', 'Wrong'], correct_index: 0 },
  ],
};
const clone = value => JSON.parse(JSON.stringify(value));
const richProgress = () => ({
  ...P.reviewCard(P.createEmpty(), 'card-1', 'known', '2026-11-13'),
  notes: ['note-1'], lessons: ['lesson-1'],
  labs: { 'lab-1': { completed_steps: [1, 0], complete: true, reflection: 'Observed the expected response.' } },
  quizzes: { 'unit-1': { score: 50, completed_on: '2026-11-13', question_ids: ['question-1', 'question-2'], answers: [0, 0] } },
});

test('independent empty records and reset contain no shared mutable state', () => {
  const a = P.createEmpty();
  a.notes.push('note-1');
  a.cards['card-1'] = { rating: 'again' };
  assert.deepEqual(P.createEmpty(), { version: 2, notes: [], cards: {}, lessons: [], labs: {}, quizzes: {} });
});

test('legacy progress migrates through explicit aliases after wording changes', () => {
  const before = clone(content);
  const legacy = { notes: [legacyNote, legacyNote, 'removed-note'], cards: { [legacyCard]: 'known', 'old-card-2': 'again', missing: 'known' } };
  const migrated = P.migrate(JSON.stringify(legacy), content, '2026-11-13');
  assert.deepEqual(migrated.notes, ['note-1']);
  assert.deepEqual(migrated.cards['card-1'], { rating: 'known', stage: 0, due: '2026-11-14', reviewed_on: '2026-11-13' });
  assert.equal(migrated.cards['card-2'].due, '2026-11-13');
  assert.equal(P.classifyCard('card-2', migrated, '2026-11-13'), 'due');
  assert.deepEqual(content, before, 'migration must not append to content legacy_keys');
  assert.deepEqual(legacy.notes, [legacyNote, legacyNote, 'removed-note']);
});

test('missing progress starts clean; unsupported versions require a clear recovery', () => {
  assert.deepEqual(P.migrate(null, content), P.createEmpty());
  assert.throws(() => P.migrate({ version: 99, notes: [], cards: {} }, content), /unsupported format/);
  assert.throws(() => P.migrate({ notes: [], cards: {} }, null), /content must load/i);
  assert.throws(() => P.migrate('{bad', content), /valid JSON/);
});

test('known reviews advance 1, 3, 7, 14, 30 days and retain their maximum stage', () => {
  let progress = P.createEmpty();
  const expected = [
    ['2026-11-13', 0, '2026-11-14'],
    ['2026-11-14', 1, '2026-11-17'],
    ['2026-11-17', 2, '2026-11-24'],
    ['2026-11-24', 3, '2026-12-08'],
    ['2026-12-08', 4, '2027-01-07'],
    ['2027-01-07', 4, '2027-02-06'],
  ];
  for (const [today, stage, due] of expected) {
    progress = P.reviewCard(progress, 'card-1', 'known', today);
    assert.equal(progress.cards['card-1'].stage, stage);
    assert.equal(progress.cards['card-1'].due, due);
  }
});

test('practise again resets the interval; first later success starts at one day', () => {
  let progress = P.reviewCard(P.createEmpty(), 'card-1', 'known', '2026-11-13');
  progress = P.reviewCard(progress, 'card-1', 'known', '2026-11-14');
  progress = P.reviewCard(progress, 'card-1', 'again', '2026-11-17');
  assert.equal(progress.cards['card-1'].stage, 0);
  assert.equal(progress.cards['card-1'].due, '2026-11-18');
  progress = P.reviewCard(progress, 'card-1', 'known', '2026-11-18');
  assert.equal(progress.cards['card-1'].stage, 0);
  assert.equal(progress.cards['card-1'].due, '2026-11-19');
});

test('reviewCard preserves all unrelated records and never mutates its input', () => {
  const original = richProgress(); const before = clone(original);
  const result = P.reviewCard(original, 'card-2', 'again', '2026-11-14');
  assert.deepEqual(original, before);
  assert.deepEqual(result.notes, before.notes);
  assert.deepEqual(result.lessons, before.lessons);
  assert.deepEqual(result.quizzes, before.quizzes);
  assert.deepEqual(result.labs['lab-1'].completed_steps, [0, 1]);
  result.labs['lab-1'].completed_steps.push(100);
  assert.deepEqual(original.labs['lab-1'].completed_steps, [1, 0]);
});

test('calendar calculations handle leap days, month ends and rejected invalid dates', () => {
  assert.equal(P.addDays('2028-02-28', 1), '2028-02-29');
  assert.equal(P.addDays('2028-02-29', 1), '2028-03-01');
  assert.equal(P.addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(P.addDays('2026-03-01', -1), '2026-02-28');
  for (const date of ['2026-02-29', '2026-13-01', '2026-11-31', '2026-1-01', 'invalid']) {
    assert.throws(() => P.addDays(date, 1), /date/i);
  }
  assert.throws(() => P.addDays('2026-11-13', 1.5), /whole number/);
  assert.throws(() => P.addDays('9999-12-31', 1), /supported calendar/);
});

test('calendar review dates survive daylight-saving transitions in actual timezones', () => {
  const modulePath = path.resolve(__dirname, '../docs/assets/progress.js');
  const code = `const p=require(${JSON.stringify(modulePath)}); process.stdout.write(JSON.stringify([p.addDays('2026-03-07',1),p.addDays('2026-11-01',1),p.localDate(new Date('2026-11-13T01:00:00Z'))]));`;
  const ny = JSON.parse(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'America/New_York' }, encoding: 'utf8' }));
  assert.deepEqual(ny, ['2026-03-08', '2026-11-02', '2026-11-12']);
  const utc = JSON.parse(execFileSync(process.execPath, ['-e', code], { env: { ...process.env, TZ: 'UTC' }, encoding: 'utf8' }));
  assert.deepEqual(utc, ['2026-03-08', '2026-11-02', '2026-11-13']);
});

test('due queues put overdue reviewed cards before new cards and omit future reviews', () => {
  let progress = P.reviewCard(P.createEmpty(), 'card-1', 'known', '2026-11-12');
  progress = P.reviewCard(progress, 'card-3', 'known', '2026-11-13');
  assert.equal(P.classifyCard('card-1', progress, '2026-11-13'), 'due');
  assert.equal(P.classifyCard('card-2', progress, '2026-11-13'), 'new');
  assert.equal(P.classifyCard('card-3', progress, '2026-11-13'), 'scheduled');
  assert.equal(P.isDue('card-2', progress, '2026-11-13'), true);
  assert.deepEqual(P.dueCards(content.flashcards, progress, '2026-11-13').map(c => c.id), ['card-1', 'card-2']);
  assert.deepEqual(P.dueCards(content.flashcards, progress, '2026-11-13', true).map(c => c.id), ['card-1', 'card-2', 'card-3']);
});

test('revision sessions cap at ten and allow deliberate practice outside the schedule', () => {
  const cards = Array.from({ length: 20 }, (_, i) => ({ id: `card-${i}` }));
  const empty = P.createEmpty();
  assert.equal(P.reviewSession(cards, empty, '2026-11-13').length, 10);
  assert.equal(P.reviewSession(cards, empty, '2026-11-13', false, 50).length, 10);
  assert.equal(P.reviewSession([], empty, '2026-11-13').length, 0);
  const future = P.reviewCard(empty, 'card-1', 'known', '2026-11-13');
  assert.equal(P.reviewSession([{ id: 'card-1' }], future, '2026-11-13').length, 0);
  assert.equal(P.reviewSession([{ id: 'card-1' }], future, '2026-11-13', true).length, 1);
});

test('rich version-two progress exports/imports without dropping independent learning records', () => {
  const original = richProgress();
  const exported = P.exportData(original);
  const restored = P.validateImport(exported, content);
  assert.deepEqual(restored, P.migrate(JSON.parse(exported), content));
  assert.equal(restored.version, 2);
  assert.deepEqual(restored.labs['lab-1'].completed_steps, [0, 1]);
  restored.notes.push('other');
  assert.deepEqual(original.notes, ['note-1']);
  assert.equal(original.labs['lab-1'].reflection, 'Observed the expected response.');
});

test('invalid imports are rejected atomically without changing existing progress', () => {
  const original = richProgress(); const before = clone(original);
  const mutations = [
    p => { p.version = 1; },
    p => { p.notes.push('missing-note'); },
    p => { p.notes.push('note-1'); },
    p => { p.cards['card-1'].stage = 5; },
    p => { p.cards['card-1'].due = '2026-02-30'; },
    p => { p.cards['card-1'].due = '2026-11-12'; },
    p => { p.cards['card-1'].rating = 'false'; },
    p => { p.labs['lab-1'].completed_steps = [2]; },
    p => { p.labs['lab-1'].complete = 'true'; },
    p => { p.quizzes['unit-1'].answers = [999, 0]; },
    p => { p.quizzes['unit-1'].question_ids = ['question-1', 'question-3']; },
    p => { p.quizzes['unit-1'].score = 100; },
    p => { p.unexpected = true; },
  ];
  for (const change of mutations) {
    const malformed = clone(original); change(malformed);
    assert.throws(() => P.validateImport(malformed, content), Error);
    assert.deepEqual(original, before);
  }
  assert.throws(() => P.validateImport('not JSON', content), /valid JSON/);
  assert.throws(() => P.validateImport(P.createEmpty(), {}), /content must load/i);
});

test('prototype-like IDs cannot enter progress records or pollute objects', () => {
  const raw = P.exportData(P.createEmpty());
  const malicious = JSON.parse(raw);
  malicious.cards = JSON.parse('{"__proto__":{"rating":"known","stage":0,"due":"2026-11-14","reviewed_on":"2026-11-13"}}');
  assert.throws(() => P.validateImport(malicious, content), /invalid ID/);
  assert.throws(() => P.reviewCard(P.createEmpty(), 'constructor', 'known', '2026-11-13'), /invalid ID/);
  assert.equal({}.rating, undefined);
});

test('capstone steps can be tracked using the same bounded lab schema', () => {
  const progress = P.createEmpty();
  progress.labs['capstone-1'] = { completed_steps: [0, 2], complete: false, reflection: 'One test remains.' };
  assert.deepEqual(P.validateImport(progress, content), progress);
  progress.labs['capstone-1'].completed_steps.push(3);
  assert.throws(() => P.validateImport(progress, content), /unknown step/);
});
