/* Browser-local learning records. Dates are calendar dates, never UTC instants. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudyProgress = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const VERSION = 2;
  const INTERVALS = Object.freeze([1, 3, 7, 14, 30]);
  const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
  const MAX_IMPORT_LENGTH = 5 * 1024 * 1024;
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
  const fail = message => { throw new Error(message); };
  const dateParts = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('Use calendar dates in YYYY-MM-DD format.');
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(0);
    date.setUTCHours(12, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) fail(`Invalid calendar date: ${value}.`);
    return date;
  };
  const formatUTC = date => `${String(date.getUTCFullYear()).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const localDate = (date = new Date()) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) fail('A valid Date is required.');
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const addDays = (value, days) => {
    if (!Number.isSafeInteger(days)) fail('The review interval must be a whole number of days.');
    const date = dateParts(value);
    date.setUTCDate(date.getUTCDate() + days);
    if (Number.isNaN(date.getTime()) || date.getUTCFullYear() < 0 || date.getUTCFullYear() > 9999) fail('The review date is outside the supported calendar.');
    return formatUTC(date);
  };
  const createEmpty = () => ({ version: VERSION, notes: [], cards: {}, lessons: [], labs: {}, quizzes: {} });
  const safeID = (id, label) => {
    if (typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) || BAD_KEYS.has(id)) fail(`${label} has an invalid ID.`);
    return id;
  };
  const collectionMap = (content, names) => {
    if (!content) return null;
    const values = names.flatMap(name => Array.isArray(content[name]) ? content[name] : []);
    return new Map(values.filter(value => record(value) && typeof value.id === 'string').map(value => [value.id, value]));
  };
  const requireKnown = (id, entries, label) => {
    safeID(id, label);
    if (entries && !entries.has(id)) fail(`${label} refers to unknown content: ${id}.`);
  };
  const validateIDs = (values, entries, label) => {
    if (!Array.isArray(values)) fail(`${label} must be a list of IDs.`);
    const seen = new Set();
    values.forEach(id => {
      requireKnown(id, entries, label);
      if (seen.has(id)) fail(`${label} contains a duplicate ID: ${id}.`);
      seen.add(id);
    });
    return [...values];
  };
  const onlyFields = (value, allowed, label) => {
    if (!record(value)) fail(`${label} must be an object.`);
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key) || BAD_KEYS.has(key)) fail(`${label} contains an unsupported field: ${key}.`);
    }
    for (const key of allowed) if (!own(value, key)) fail(`${label} is missing ${key}.`);
  };
  const parse = raw => {
    if (typeof raw !== 'string') return raw;
    if (raw.length > MAX_IMPORT_LENGTH) fail('The progress file is larger than 5 MiB.');
    try { return JSON.parse(raw); } catch { fail('The progress file is not valid JSON.'); }
  };

  // This always constructs new arrays/objects. The caller can preview a validated
  // replacement without changing their current progress or the original input.
  const normalize = (raw, content = null) => {
    const value = parse(raw);
    onlyFields(value, ['version', 'notes', 'cards', 'lessons', 'labs', 'quizzes'], 'Progress');
    if (value.version !== VERSION) fail('This import requires progress version 2.');
    const notes = collectionMap(content, ['notes']);
    const cards = collectionMap(content, ['flashcards', 'cards']);
    const lessons = collectionMap(content, ['lessons']);
    const labs = collectionMap(content, ['labs', 'capstones']);
    const units = collectionMap(content, ['units']);
    const questions = collectionMap(content, ['questions']);
    const result = createEmpty();
    result.notes = validateIDs(value.notes, notes, 'Reviewed notes');
    result.lessons = validateIDs(value.lessons, lessons, 'Completed lessons');
    if (!record(value.cards)) fail('Card progress must be an object.');
    for (const [id, card] of Object.entries(value.cards)) {
      requireKnown(id, cards, 'Card progress');
      onlyFields(card, ['rating', 'stage', 'due', 'reviewed_on'], 'Card progress');
      if (!['again', 'known'].includes(card.rating)) fail(`Card ${id} has an invalid rating.`);
      if (!Number.isInteger(card.stage) || card.stage < 0 || card.stage >= INTERVALS.length) fail(`Card ${id} has an invalid review stage.`);
      if (card.rating === 'again' && card.stage !== 0) fail(`Card ${id} needs stage zero after practising again.`);
      dateParts(card.due); dateParts(card.reviewed_on);
      if (card.due < card.reviewed_on) fail(`Card ${id} is due before its review date.`);
      result.cards[id] = { rating: card.rating, stage: card.stage, due: card.due, reviewed_on: card.reviewed_on };
    }
    if (!record(value.labs)) fail('Lab progress must be an object.');
    for (const [id, lab] of Object.entries(value.labs)) {
      requireKnown(id, labs, 'Lab progress');
      onlyFields(lab, ['completed_steps', 'complete', 'reflection'], 'Lab progress');
      if (typeof lab.complete !== 'boolean' || typeof lab.reflection !== 'string' || lab.reflection.length > 20000) fail(`Lab ${id} has invalid completion or reflection data.`);
      if (!Array.isArray(lab.completed_steps) || lab.completed_steps.some(step => !Number.isInteger(step) || step < 0) || new Set(lab.completed_steps).size !== lab.completed_steps.length) fail(`Lab ${id} has invalid completed steps.`);
      const max = labs && Array.isArray(labs.get(id).steps) ? labs.get(id).steps.length : null;
      if (max !== null && lab.completed_steps.some(step => step >= max)) fail(`Lab ${id} refers to an unknown step.`);
      result.labs[id] = { completed_steps: [...lab.completed_steps].sort((a, b) => a - b), complete: lab.complete, reflection: lab.reflection };
    }
    if (!record(value.quizzes)) fail('Quiz progress must be an object.');
    for (const [id, quiz] of Object.entries(value.quizzes)) {
      requireKnown(id, units, 'Quiz progress');
      onlyFields(quiz, ['score', 'completed_on', 'question_ids', 'answers'], 'Quiz progress');
      if (typeof quiz.score !== 'number' || !Number.isFinite(quiz.score) || quiz.score < 0 || quiz.score > 100) fail(`Quiz ${id} has an invalid score.`);
      dateParts(quiz.completed_on);
      const questionIDs = validateIDs(quiz.question_ids, questions, 'Quiz questions');
      if (!questionIDs.length || !Array.isArray(quiz.answers) || quiz.answers.length !== questionIDs.length || quiz.answers.some(answer => !Number.isInteger(answer) || answer < 0)) fail(`Quiz ${id} has invalid answers.`);
      if (questions) {
        let correct = 0;
        questionIDs.forEach((questionID, index) => {
          const question = questions.get(questionID);
          if (question.unit_id !== id) fail(`Quiz ${id} contains a question from another unit.`);
          if (!Array.isArray(question.choices) || quiz.answers[index] >= question.choices.length) fail(`Quiz ${id} contains an unknown answer choice.`);
          if (quiz.answers[index] === question.correct_index) correct += 1;
        });
        const expected = Math.round(correct / questionIDs.length * 100);
        if (quiz.score !== expected) fail(`Quiz ${id} score does not match its answers.`);
      }
      result.quizzes[id] = { score: quiz.score, completed_on: quiz.completed_on, question_ids: questionIDs, answers: [...quiz.answers] };
    }
    return result;
  };
  const validateImport = (raw, content) => {
    if (!record(content) || !Array.isArray(content.units) || !Array.isArray(content.notes) || !Array.isArray(content.flashcards || content.cards)) fail('Study content must load before importing progress.');
    return normalize(raw, content);
  };
  const exportData = progress => JSON.stringify(normalize(progress), null, 2);
  const migrate = (raw, content, today = localDate()) => {
    dateParts(today);
    if (raw === null || raw === undefined || raw === '') return createEmpty();
    const value = parse(raw);
    if (!record(content) || !Array.isArray(content.notes) || !Array.isArray(content.flashcards || content.cards)) fail('Study content must load before restoring progress.');
    if (record(value) && value.version === VERSION) return validateImport(value, content);
    if (!record(value) || (own(value, 'version') && value.version !== 1) || !Array.isArray(value.notes) || !record(value.cards)) fail('Saved study progress has an unsupported format.');
    const result = createEmpty();
    const legacyMap = (items, field) => {
      const map = new Map();
      for (const item of items || []) {
        const keys = Array.isArray(item.legacy_keys) ? [...item.legacy_keys] : [];
        if (item.unit && item[field]) keys.push(JSON.stringify([item.unit, item[field]]));
        for (const key of keys) if (typeof key === 'string') map.set(key, item.id);
        if (typeof item.id === 'string') map.set(item.id, item.id);
      }
      return map;
    };
    const noteMap = legacyMap(content.notes, 'topic');
    const cardMap = legacyMap(content.flashcards || content.cards, 'question');
    result.notes = [...new Set(value.notes.filter(key => typeof key === 'string' && noteMap.has(key)).map(key => noteMap.get(key)))];
    for (const [key, rating] of Object.entries(value.cards)) {
      if (!cardMap.has(key) || !['again', 'known'].includes(rating)) continue;
      const id = cardMap.get(key);
      safeID(id, 'Migrated card');
      // Legacy ratings have no review timestamp. Keep known cards for tomorrow;
      // items explicitly needing practice are eligible immediately.
      result.cards[id] = { rating, stage: 0, due: rating === 'known' ? addDays(today, 1) : today, reviewed_on: today };
    }
    return validateImport(result, content);
  };
  const reviewCard = (progress, id, rating, today = localDate()) => {
    safeID(id, 'Card'); dateParts(today);
    if (!['again', 'known'].includes(rating)) fail('Choose known or again for a card review.');
    const result = normalize(progress);
    const previous = result.cards[id];
    const stage = rating === 'known' && previous && previous.rating === 'known'
      ? Math.min(previous.stage + 1, INTERVALS.length - 1) : 0;
    result.cards[id] = { rating, stage, due: addDays(today, INTERVALS[stage]), reviewed_on: today };
    return result;
  };
  const classifyCard = (cardOrID, progress, today = localDate()) => {
    dateParts(today);
    const id = typeof cardOrID === 'string' ? cardOrID : cardOrID.id;
    safeID(id, 'Card');
    const review = progress.cards && own(progress.cards, id) ? progress.cards[id] : null;
    if (!review) return 'new';
    dateParts(review.due);
    return review.due <= today ? 'due' : 'scheduled';
  };
  const isDue = (cardOrID, progress, today = localDate()) => classifyCard(cardOrID, progress, today) !== 'scheduled';
  const dueCards = (cards, progress, today = localDate(), includeAll = false) => {
    dateParts(today);
    if (!Array.isArray(cards)) fail('A card list is required for revision.');
    const groups = { due: [], new: [], scheduled: [] };
    cards.forEach((card, index) => groups[classifyCard(card, progress, today)].push({ card, index }));
    const byDue = (a, b) => progress.cards[a.card.id].due.localeCompare(progress.cards[b.card.id].due) || a.index - b.index;
    groups.due.sort(byDue); groups.scheduled.sort(byDue);
    return [...groups.due, ...groups.new, ...(includeAll ? groups.scheduled : [])].map(item => item.card);
  };
  const reviewSession = (cards, progress, today = localDate(), includeAll = false, limit = 10) => {
    if (!Number.isInteger(limit) || limit < 1) fail('A revision session needs a positive whole-number limit.');
    return dueCards(cards, progress, today, includeAll).slice(0, Math.min(limit, 10));
  };
  return Object.freeze({ VERSION, INTERVALS, createEmpty, localDate, addDays, validateImport, exportData, migrate, reviewCard, classifyCard, isDue, dueCards, reviewSession });
});
