'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const P = window.StudyProgress;
  const STORAGE_KEY = 'az4caf.study-progress.v2';
  const LEGACY_KEY = 'az4caf.study-progress.v1';
  const VIEW_KEY = 'az4caf.study-view.v1';
  const views = ['notes', 'cards', 'pathway', 'quizzes', 'labs', 'practice', 'programme'];
  const state = {
    content: {}, units: [], notes: [], cards: [], lessons: [], questions: [], labs: [], capstones: [], sources: [], guides: [], programme: {},
    progress: P.createEmpty(), view: 'pathway', loaded: false, openNotes: new Set(), openChecks: new Set(), revealedCards: new Set(),
    session: null, quiz: null, pendingImport: null, practiceMounted: false, searchCache: new Map(), savedScroll: {}, quizUnit: '', unrestoredProgress: null, utterance: null
  };
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };
  const button = (text, className, handler) => {
    const node = make('button', className, text); node.type = 'button'; node.addEventListener('click', handler); return node;
  };
  const readable = text => String(text || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const unitFor = id => state.units.find(unit => unit.id === id);
  const safeURL = value => {
    try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  const link = (title, url, className = '') => {
    const node = make('a', className, title); const target = safeURL(url);
    if (target) { node.href = target; if (new URL(target).origin !== location.origin) { node.target = '_blank'; node.rel = 'noopener noreferrer'; } }
    return node;
  };
  const allText = value => {
    if (Array.isArray(value)) return value.map(allText).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(allText).join(' ');
    return String(value ?? '');
  };
  const announce = text => { $('announcement').textContent = text; };
  const focusTarget = node => {
    if (!node) return;
    node.tabIndex = -1; node.focus({ preventScroll: true }); node.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  const sourceFor = id => state.sources.find(source => source.id === id);
  const fillOptions = (select, values, firstLabel, label = value => value) => {
    const selected = select.value; select.replaceChildren(new Option(firstLabel, ''));
    values.forEach(value => select.add(new Option(label(value), value)));
    select.value = values.includes(selected) ? selected : '';
  };
  const unitOptions = () => fillOptions($('unitFilter'), state.units.filter(unit => !$('semesterFilter').value || String(unit.semester) === $('semesterFilter').value).map(unit => unit.id), 'All units', id => unitFor(id)?.name || id);
  const selectedUnit = () => unitFor($('unitFilter').value);
  const matchesUnit = item => (!$('unitFilter').value || item.unit_id === $('unitFilter').value) && (!$('semesterFilter').value || String(item.semester ?? unitFor(item.unit_id)?.semester) === $('semesterFilter').value);
  const matches = item => {
    const query = $('searchInput').value.trim().toLocaleLowerCase();
    const vendor = $('vendorFilter').value;
    return matchesUnit(item) && (!$('categoryFilter').value || item.category === $('categoryFilter').value) && (!vendor || item.vendor === vendor || item.vendors?.includes(vendor)) && (!query || state.searchCache.get(item.id)?.includes(query));
  };
  const toggleID = (list, id, checked) => { const set = new Set(list); checked ? set.add(id) : set.delete(id); return [...set]; };
  const save = () => {
    try { if (state.unrestoredProgress === null) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
    catch { $('storageNotice').hidden = false; }
    updateProgress(); renderDashboard();
  };
  const restore = () => {
    let original = null;
    try {
      const current = localStorage.getItem(STORAGE_KEY); const legacy = current ? null : localStorage.getItem(LEGACY_KEY);
      original = current || legacy;
      if (original) {
        state.progress = P.migrate(JSON.parse(original), state.content);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
        if (legacy) backupStatus('Your previous browser progress has been migrated to stable content IDs. The earlier copy is retained.');
      }
    } catch (error) {
      if (original !== null) {
        state.unrestoredProgress = original; $('recoverProgressBtn').hidden = false;
        backupStatus(`Saved progress could not be restored: ${error.message} The original is retained and this visit will not overwrite it. Download that backup before explicitly resetting or importing a replacement.`, true);
      } else $('storageNotice').hidden = false;
    }
  };
  const rememberNavigation = () => {
    if (!state.loaded) return;
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify({ path: location.pathname, route: location.hash, scroll: window.scrollY, openNotes: [...state.openNotes], openChecks: [...state.openChecks], revealedCards: [...state.revealedCards], savedScroll: state.savedScroll })); } catch { /* Reading remains available without session storage. */ }
  };
  const restoreNavigation = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null'); if (!saved || saved.path !== location.pathname) return null;
      const restoreSet = (field, items) => new Set(Array.isArray(saved[field]) ? saved[field].filter(id => items.some(item => item.id === id)) : []);
      state.openNotes = restoreSet('openNotes', state.notes); state.openChecks = restoreSet('openChecks', state.notes); state.revealedCards = restoreSet('revealedCards', state.cards);
      if (saved.savedScroll && typeof saved.savedScroll === 'object') Object.entries(saved.savedScroll).forEach(([view, position]) => { if (views.includes(view) && Number.isFinite(position) && position >= 0) state.savedScroll[view] = position; });
      return saved.route === location.hash && Number.isFinite(saved.scroll) && saved.scroll >= 0 ? saved.scroll : null;
    } catch { return null; }
  };
  const backupStatus = (text, error = false) => { $('backupStatus').textContent = text; $('backupStatus').classList.toggle('error', error); $('backupStatus').hidden = false; };
  const updateProgress = () => {
    $('notesProgress').textContent = `${state.notes.filter(note => state.progress.notes.includes(note.id)).length} / ${state.notes.length}`;
    $('cardsProgress').textContent = `${state.cards.filter(card => state.progress.cards[card.id]?.rating === 'known').length} / ${state.cards.length}`;
    $('lessonProgress').textContent = `${state.progress.lessons.length} / ${state.lessons.length} lessons completed`;
    document.querySelectorAll('.unit-link').forEach(node => {
      const lessons = state.lessons.filter(lesson => lesson.unit_id === node.dataset.unit);
      const done = lessons.length > 0 && lessons.every(lesson => state.progress.lessons.includes(lesson.id));
      node.querySelector('.unit-complete').classList.toggle('done', done);
      node.querySelector('.unit-complete').title = done ? 'All lessons completed' : 'Lessons to study';
    });
  };
  const stopSpeech = () => { state.utterance = null; if ('speechSynthesis' in window) window.speechSynthesis.cancel(); $('speechControls').hidden = true; };
  const speak = text => {
    if (!('speechSynthesis' in window)) return;
    stopSpeech(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-GB';
    state.utterance = utterance;
    utterance.onend = () => { if (state.utterance === utterance) { state.utterance = null; $('speechControls').hidden = true; } };
    utterance.onerror = () => { if (state.utterance === utterance) { state.utterance = null; $('speechControls').hidden = true; announce('Reading aloud could not start. Try your browser’s reading tools.'); } };
    $('speechControls').hidden = false; window.speechSynthesis.speak(utterance);
  };
  const audioButton = (label, getText) => {
    const node = button('Read aloud', 'audio-button', () => speak(getText())); node.setAttribute('aria-label', label);
    if (!('speechSynthesis' in window)) { node.disabled = true; node.title = 'Reading aloud is not supported in this browser'; } return node;
  };
  const buildNav = () => {
    $('unitNav').replaceChildren();
    [1, 2].forEach(semester => {
      $('unitNav').append(make('div', 'semester-label', `SEMESTER ${semester}`));
      state.units.filter(unit => Number(unit.semester) === semester).forEach(unit => {
        const nav = button('', 'unit-link', () => selectUnit(unit.id, 'pathway'));
        nav.dataset.unit = unit.id; nav.setAttribute('aria-pressed', 'false');
        nav.append(make('span', 'unit-number', String(state.units.indexOf(unit) + 1).padStart(2, '0')), make('span', 'unit-name', unit.name + (unit.optional && !unit.name.toLowerCase().includes('optional') ? ' · optional' : '')), make('span', 'unit-complete'));
        $('unitNav').append(nav);
      });
    });
    $('totalNotes').textContent = state.notes.length;
  };
  const writeRoute = (details = {}, replace = false) => {
    const params = new URLSearchParams({ view: state.view });
    if ($('unitFilter').value) params.set('unit', $('unitFilter').value);
    if ($('semesterFilter').value) params.set('semester', $('semesterFilter').value);
    if ($('categoryFilter').value) params.set('category', $('categoryFilter').value);
    if ($('vendorFilter').value) params.set('vendor', $('vendorFilter').value);
    if ($('searchInput').value.trim()) params.set('q', $('searchInput').value.trim());
    Object.entries(details).forEach(([key, value]) => params.set(key, value));
    const next = `#${params}`;
    if (location.hash !== next) {
      if (!replace) history.replaceState({ studyScroll: window.scrollY }, '', location.href);
      history[replace ? 'replaceState' : 'pushState']({ studyScroll: window.scrollY }, '', next);
    }
  };
  const clearFilterValues = () => { $('searchInput').value = ''; $('semesterFilter').value = ''; unitOptions(); $('unitFilter').value = ''; $('categoryFilter').value = ''; $('vendorFilter').value = ''; state.session = null; };
  const clearFilters = () => { clearFilterValues(); refresh(); writeRoute({}, true); };
  const selectUnit = (id, view = 'notes') => {
    const unit = unitFor(id); if (!unit) return;
    $('semesterFilter').value = String(unit.semester); unitOptions(); $('unitFilter').value = unit.id;
    $('categoryFilter').value = ''; $('vendorFilter').value = ''; $('searchInput').value = ''; state.session = null;
    setView(view); writeRoute(); focusTarget($(`${view === 'notes' || view === 'cards' ? 'section' : view}Title`));
  };
  const openNote = id => {
    const note = state.notes.find(item => item.id === id); if (!note) return;
    clearFilterValues(); $('unitFilter').value = note.unit_id; state.openNotes.add(id); setView('notes'); writeRoute({ note: id });
    focusTarget(document.getElementById(id)?.querySelector('h3'));
  };
  const openCard = id => {
    const card = state.cards.find(item => item.id === id); if (!card) return;
    clearFilterValues(); $('unitFilter').value = card.unit_id; $('revisionMode').value = 'all'; setView('cards'); writeRoute({ card: id }); focusTarget(document.getElementById(id)?.querySelector('h3'));
  };
  const openLesson = id => {
    const lesson = state.lessons.find(item => item.id === id); if (!lesson) return;
    clearFilterValues(); $('unitFilter').value = lesson.unit_id; setView('pathway'); writeRoute({ lesson: id }); focusTarget(document.getElementById(id)?.querySelector('h4'));
  };
  const openLab = id => {
    const lab = [...state.labs, ...state.capstones].find(item => item.id === id); if (!lab) return;
    clearFilterValues(); if (lab.unit_id) $('unitFilter').value = lab.unit_id; setView('labs'); writeRoute({ lab: id }); focusTarget(document.getElementById(id)?.querySelector('h3'));
  };
  const applyRoute = () => {
    if (!state.loaded) return;
    const params = new URLSearchParams(location.hash.slice(1)); clearFilterValues();
    if (['1', '2'].includes(params.get('semester'))) $('semesterFilter').value = params.get('semester');
    unitOptions(); if (unitFor(params.get('unit'))) { if (![...$('unitFilter').options].some(opt => opt.value === params.get('unit'))) { $('semesterFilter').value = ''; unitOptions(); } $('unitFilter').value = params.get('unit'); }
    for (const [field, id] of [['category', 'categoryFilter'], ['vendor', 'vendorFilter']]) if ([...$(id).options].some(opt => opt.value === params.get(field))) $(id).value = params.get(field);
    $('searchInput').value = params.get('q') || '';
    const id = params.get('note') || params.get('card') || params.get('lesson') || params.get('lab');
    if (params.has('note')) { const note = state.notes.find(item => item.id === id); if (note) { $('unitFilter').value = note.unit_id; state.openNotes.add(id); } }
    if (params.has('card')) { const card = state.cards.find(item => item.id === id); if (card) $('unitFilter').value = card.unit_id; $('revisionMode').value = 'all'; }
    if (params.has('lesson')) { const lesson = state.lessons.find(item => item.id === id); if (lesson) $('unitFilter').value = lesson.unit_id; }
    if (params.has('lab')) { const lab = state.labs.find(item => item.id === id); if (lab) $('unitFilter').value = lab.unit_id; }
    if (!params.toString()) {
      const next = orderedLessons().find(lesson => !unitFor(lesson.unit_id)?.optional && !state.progress.lessons.includes(lesson.id)) || orderedLessons()[0];
      if (next) { $('semesterFilter').value = String(unitFor(next.unit_id)?.semester || 1); unitOptions(); $('unitFilter').value = next.unit_id; }
    }
    setView(params.has('note') ? 'notes' : params.has('card') ? 'cards' : params.has('lesson') ? 'pathway' : params.has('lab') ? 'labs' : views.includes(params.get('view')) ? params.get('view') : 'pathway');
    if (id) requestAnimationFrame(() => focusTarget(document.getElementById(id)?.querySelector('h3,h4')));
  };
  const addPart = (parent, title, text, className = '') => { if (text) parent.append(make('h4', '', title), make('p', className, text)); };
  const sourceLinks = (parent, ids = []) => ids.forEach(id => { const source = sourceFor(id); if (source) parent.append(link(source.title, source.url, 'source-link')); });
  const renderNotes = notes => {
    $('notes').replaceChildren();
    notes.forEach(note => {
      const article = make('article', 'note'); article.id = note.id; article.classList.toggle('reviewed', state.progress.notes.includes(note.id));
      const top = make('div', 'note-top'); top.append(make('span', 'topic-label', readable(note.category)), make('span', 'note-index', note.id.toUpperCase()));
      article.append(top, make('h3', '', note.topic), make('p', 'meta', `${note.unit} · Semester ${note.semester}${note.vendor ? ` · ${note.vendor}` : ''}`));
      if (note.supplementary) article.append(make('span', 'tag', 'Supplementary extension'));
      article.append(make('p', '', note.content));
      if (note.key_points?.length) { const list = make('ul', 'key-points'); note.key_points.forEach(point => list.append(make('li', '', point))); article.append(list); }
      const details = make('details'); details.open = state.openNotes.has(note.id); details.append(make('summary', '', 'Examples, practice & self-check'));
      details.addEventListener('toggle', () => details.open ? state.openNotes.add(note.id) : state.openNotes.delete(note.id));
      const body = make('div', 'study-detail'); addPart(body, 'Worked example', note.worked_example); addPart(body, 'Try it yourself', note.practice);
      if (note.check_question) {
        addPart(body, 'Check your understanding', note.check_question);
        const answer = make('details', 'answer-check'); answer.open = state.openChecks.has(note.id); answer.append(make('summary', '', 'Reveal suggested answer'), make('p', '', note.check_answer));
        answer.addEventListener('toggle', () => answer.open ? state.openChecks.add(note.id) : state.openChecks.delete(note.id)); body.append(answer);
      }
      addPart(body, 'Operational context', note.case_study, 'scenario'); details.append(body); article.append(details);
      if (safeURL(note.source_url)) {
        const reference = link(`${note.source_title || 'Reference'} ↗`, note.source_url, 'source-link');
        const source = sourceFor(note.source_ids?.[0]);
        if (source) reference.append(make('span', 'source-status', source.verification_status === 'document-reviewed' ? `Document reviewed ${source.reviewed_on || ''}; check the applicable release` : 'Further reference · not independently rechecked'));
        article.append(reference);
      }
      const actions = make('div', 'note-actions'); const label = make('label', 'review-label'); const input = make('input'); input.type = 'checkbox'; input.checked = state.progress.notes.includes(note.id); input.setAttribute('aria-label', `Mark ${note.topic} as reviewed`);
      input.addEventListener('change', () => { state.progress.notes = toggleID(state.progress.notes, note.id, input.checked); article.classList.toggle('reviewed', input.checked); save(); announce(input.checked ? 'Note marked as reviewed.' : 'Note marked for review.'); });
      label.append(input, make('span', '', 'Reviewed')); actions.append(label, audioButton(`Read ${note.topic} aloud`, () => [note.topic, note.content, ...(note.key_points || []), note.worked_example, note.practice].filter(Boolean).join('. '))); article.append(actions); $('notes').append(article);
    });
  };
  const renderCards = cards => {
    $('cards').replaceChildren();
    cards.forEach(card => {
      const article = make('article', 'card'); article.id = card.id;
      article.append(make('span', 'topic-label', `${readable(card.category)} · RECALL`), make('h3', '', card.question), make('p', 'meta', `${card.unit} · Semester ${card.semester}${card.vendor ? ` · ${card.vendor}` : ''}`));
      const status = make('p', 'rating-status');
      const updateRating = () => { const review = state.progress.cards[card.id]; status.textContent = review ? `${review.rating === 'known' ? '✓ Marked as known' : '↻ More practice'} · next review ${review.due}` : 'New card · answer from memory first'; };
      updateRating(); article.append(status);
      const answer = make('div', 'card-answer'); answer.id = `${card.id}-answer`; answer.hidden = !state.revealedCards.has(card.id); answer.append(make('span', 'small-label', 'SUGGESTED ANSWER'), make('p', '', card.answer));
      const ratings = make('div', 'rating-controls');
      ['again', 'known'].forEach(rating => {
        const rate = button(rating === 'again' ? 'Practise again' : 'Got it', rating === 'again' ? 'secondary' : '', () => {
          state.progress = P.reviewCard(state.progress, card.id, rating); save(); updateRating();
          ratings.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node === rate)));
          if (state.session) state.session.rated.add(card.id);
          renderRevisionSummary(); announce(`${rating === 'known' ? 'Card marked as known.' : 'Card marked for practice.'} Next review ${state.progress.cards[card.id].due}.`);
        });
        rate.setAttribute('aria-pressed', String(state.progress.cards[card.id]?.rating === rating)); rate.setAttribute('aria-label', `${rating === 'again' ? 'Practise again' : 'Got it'}: ${card.question}`); ratings.append(rate);
      });
      answer.append(ratings);
      const controls = make('div', 'card-controls'); const reveal = button(answer.hidden ? 'Reveal answer' : 'Hide answer', 'secondary', () => { answer.hidden = !answer.hidden; answer.hidden ? state.revealedCards.delete(card.id) : state.revealedCards.add(card.id); reveal.textContent = answer.hidden ? 'Reveal answer' : 'Hide answer'; reveal.setAttribute('aria-expanded', String(!answer.hidden)); });
      reveal.setAttribute('aria-expanded', String(!answer.hidden)); reveal.setAttribute('aria-controls', answer.id);
      controls.append(reveal, audioButton(`Read question: ${card.question}`, () => answer.hidden ? `Question: ${card.question}` : `Question: ${card.question}. Answer: ${card.answer}`)); article.append(controls, answer); $('cards').append(article);
    });
  };
  const renderReferences = notes => {
    $('references').replaceChildren(); const refs = new Map(); notes.forEach(note => { if (safeURL(note.source_url)) refs.set(note.source_url, note.source_title || note.source_url); });
    [...refs].sort((a, b) => a[1].localeCompare(b[1])).forEach(([url, title]) => { const item = make('li'); item.append(link(title, url)); $('references').append(item); });
    $('referencesPanel').hidden = state.view !== 'notes' || refs.size === 0;
  };
  const matchingGuides = () => {
    const query = $('searchInput').value.trim().toLocaleLowerCase(); if (!query) return [];
    return state.guides.filter(entry => {
      const unit = $('unitFilter').value; const semester = $('semesterFilter').value; const vendor = $('vendorFilter').value;
      return (!unit || !entry.unit_ids?.length || entry.unit_ids.includes(unit)) && (!semester || !entry.unit_ids?.length || entry.unit_ids.some(id => String(unitFor(id)?.semester) === semester)) && (!vendor || entry.vendors?.includes(vendor)) && state.searchCache.get(`guide:${entry.id}`)?.includes(query);
    });
  };
  const renderLibrarySearch = (notes, cards, guides) => {
    const panel = $('librarySearchResults'); panel.replaceChildren(); panel.hidden = !$('searchInput').value.trim(); if (panel.hidden) return;
    panel.append(make('h3', '', 'Across your study library')); const list = make('ul');
    const append = (type, title, context, action) => { const item = make('li'); item.append(make('span', 'tag', type), action, make('p', '', context)); list.append(item); };
    (state.view === 'cards' ? notes : cards).forEach(item => append(state.view === 'cards' ? 'Note' : 'Recall card', item.topic || item.question, item.unit, button(item.topic || item.question, '', () => state.view === 'cards' ? openNote(item.id) : openCard(item.id))));
    guides.forEach(entry => append('Guide section', entry.title, entry.guide_title || 'Practical library', link(entry.title, entry.url)));
    if (!list.children.length) panel.append(make('p', '', 'No additional card, note or guide-section matches.')); else panel.append(list);
  };
  const orderedLessons = () => [...state.lessons].sort((a, b) => state.units.findIndex(unit => unit.id === a.unit_id) - state.units.findIndex(unit => unit.id === b.unit_id) || a.order - b.order);
  const renderDashboard = () => {
    if (!state.loaded) return; const content = $('dashboardContent'); content.replaceChildren(); $('continueDashboard').hidden = false;
    const eligible = orderedLessons().filter(lesson => !unitFor(lesson.unit_id)?.optional || selectedUnit()?.id === lesson.unit_id);
    const remaining = eligible.filter(lesson => !state.progress.lessons.includes(lesson.id));
    const next = remaining.find(lesson => (lesson.prerequisite_ids || []).every(id => state.progress.lessons.includes(id))) || remaining[0];
    const nextCard = make('article', 'dashboard-card'); nextCard.append(make('span', 'small-label', 'CONTINUE LEARNING'), make('h3', '', next?.title || 'Your pathway is up to date'), make('p', '', next ? `${unitFor(next.unit_id)?.name} · about ${next.estimated_minutes} minutes` : 'Revisit a lesson, practise a variation or explore the optional project route.'));
    nextCard.append(button(next ? 'Continue lesson →' : 'Explore pathway →', '', () => next ? openLesson(next.id) : setView('pathway', true))); content.append(nextCard);
    const due = P.dueCards(state.cards, state.progress); const reviewedDue = due.filter(card => state.progress.cards[card.id]);
    const recall = make('article', 'dashboard-card'); recall.append(make('span', 'small-label', 'STEADY REVISION'), make('h3', '', `${reviewedDue.length} due · ${due.length - reviewedDue.length} new`), make('p', '', 'A short recall session keeps review manageable. Scheduled cards are always available too.'), button('Start revision →', 'secondary', () => { clearFilterValues(); $('revisionMode').value = 'due'; startSession(); })); content.append(recall);
    const unfinished = state.labs.filter(lab => !state.progress.labs[lab.id]?.complete); const lab = unfinished.find(item => state.progress.labs[item.id]?.completed_steps?.length) || unfinished[0];
    const practical = make('article', 'dashboard-card'); practical.append(make('span', 'small-label', 'PUT IT INTO PRACTICE'), make('h3', '', `${unfinished.length} labs to complete`), make('p', '', lab?.title || 'Revisit a lab or try a semester capstone.'), button(lab ? 'Continue lab →' : 'View capstones →', 'secondary', () => lab ? openLab(lab.id) : setView('labs', true))); content.append(practical);
  };
  const noteButtons = (parent, ids = []) => ids.forEach(id => { const note = state.notes.find(item => item.id === id); if (note) parent.append(button(note.topic, 'secondary', () => openNote(id))); });
  const renderPathway = () => {
    const content = $('pathwayContent'); content.replaceChildren();
    const units = state.units.filter(unit => matchesUnit({ unit_id: unit.id, semester: unit.semester }));
    units.forEach(unit => {
      const section = make('section', 'learning-unit'); section.append(make('h3', '', unit.name), make('p', 'muted', unit.summary)); if (unit.optional) section.append(make('span', 'tag', 'Optional project route · confirm your unit combination with HRUC'));
      const actions = make('div', 'learning-unit-actions'); actions.append(button('Open unit notes', 'secondary', () => selectUnit(unit.id, 'notes')), button('Start unit checkpoint', '', () => { state.quizUnit = unit.id; state.quiz = null; selectUnit(unit.id, 'quizzes'); })); section.append(actions);
      const list = make('div', 'lesson-list');
      orderedLessons().filter(lesson => lesson.unit_id === unit.id).forEach(lesson => {
        const article = make('article', 'lesson'); article.id = lesson.id; article.classList.toggle('completed', state.progress.lessons.includes(lesson.id));
        article.append(make('span', 'small-label', `LESSON ${lesson.order} · ${lesson.estimated_minutes} MINUTES`), make('h4', '', lesson.title));
        const objectives = make('ul'); (lesson.objectives || []).forEach(value => objectives.append(make('li', '', value))); article.append(objectives);
        const prerequisites = (lesson.prerequisite_ids || []).map(id => state.lessons.find(item => item.id === id)).filter(Boolean);
        if (prerequisites.length) article.append(make('p', 'prerequisite', `Suggested first: ${prerequisites.map(item => `${state.progress.lessons.includes(item.id) ? '✓ ' : ''}${item.title}`).join('; ')}`));
        const links = make('div', 'lesson-links'); noteButtons(links, lesson.note_ids);
        (lesson.card_ids || []).forEach(id => { const card = state.cards.find(item => item.id === id); if (card) links.append(button(`Recall: ${card.question}`, 'secondary', () => openCard(id))); });
        (lesson.lab_ids || []).forEach(id => { const lab = state.labs.find(item => item.id === id); if (lab) links.append(button(`Lab: ${lab.title}`, '', () => openLab(id))); }); article.append(links);
        const label = make('label', 'completion-toggle'); const check = make('input'); check.type = 'checkbox'; check.dataset.lessonId = lesson.id; check.checked = state.progress.lessons.includes(lesson.id);
        check.addEventListener('change', () => { state.progress.lessons = toggleID(state.progress.lessons, lesson.id, check.checked); article.classList.toggle('completed', check.checked); save(); announce(check.checked ? 'Lesson marked completed in your study record.' : 'Lesson marked for study.'); }); label.append(check, make('span', '', 'I completed this lesson')); article.append(label); list.append(article);
      });
      if (!list.children.length) list.append(make('p', 'no-lessons', 'Lessons for this unit could not be loaded. You can still use its notes and guides.')); section.append(list); content.append(section);
    });
  };
  const renderRevisionSummary = () => {
    const filtered = state.cards.filter(matches); const eligible = P.dueCards(filtered, state.progress, P.localDate(), $('revisionMode').value === 'all');
    $('endSessionBtn').hidden = !state.session;
    $('revisionSummary').textContent = state.session ? `Session: ${state.session.rated.size} / ${state.session.ids.length} cards rated. Your next review date is saved after each rating.` : `${eligible.length} cards available in this mode. Start a session of up to ten, or browse below.`;
    $('startSessionBtn').disabled = eligible.length === 0;
  };
  const startSession = () => {
    const cards = P.reviewSession(state.cards.filter(matches), state.progress, P.localDate(), $('revisionMode').value === 'all');
    state.session = { ids: cards.map(card => card.id), rated: new Set() }; setView('cards'); writeRoute(); focusTarget($('sectionTitle'));
  };
  const renderQuiz = () => {
    const content = $('quizContent'); content.replaceChildren();
    const unit = unitFor(state.quizUnit) || selectedUnit() || state.units[0]; if (!unit) return; state.quizUnit = unit.id;
    const picker = make('div', 'quiz-picker'); const label = make('label', '', 'Choose a unit'); const select = make('select'); select.id = 'quizUnit'; state.units.forEach(item => select.add(new Option(item.name, item.id))); select.value = unit.id;
    select.addEventListener('change', () => { state.quizUnit = select.value; state.quiz = null; renderQuiz(); }); label.append(select); picker.append(label);
    const start = button(state.quiz ? 'Start a new checkpoint' : 'Start 10-question checkpoint', '', () => {
      const bank = state.questions.filter(question => question.unit_id === state.quizUnit);
      const scenarios = bank.filter(question => question.kind === 'scenario'); const knowledge = bank.filter(question => question.kind !== 'scenario');
      const previousIDs = new Set(state.progress.quizzes[state.quizUnit]?.question_ids || []);
      const sample = (items, count) => {
        const shuffled = [...items];
        for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
        return [...shuffled.filter(question => !previousIDs.has(question.id)), ...shuffled.filter(question => previousIDs.has(question.id))].slice(0, count);
      };
      const selected = [...sample(scenarios, 3), ...sample(knowledge, 7)];
      for (const question of bank) if (selected.length < 10 && !selected.includes(question)) selected.push(question);
      state.quiz = { unit_id: state.quizUnit, questions: selected, answers: selected.map(() => null), submitted: false }; renderQuiz(); focusTarget($('checkpointForm')?.querySelector('legend'));
    }); start.id = 'startQuizBtn'; start.disabled = state.questions.filter(question => question.unit_id === unit.id).length < 10; picker.append(start); content.append(picker);
    const previous = state.progress.quizzes[unit.id];
    if (previous) content.append(make('p', 'quiz-last-result', `Last saved result: ${previous.score}% on ${previous.completed_on}. ${previous.score >= 80 ? 'Personal milestone reached; keep practising.' : 'Review the linked material and try again.'}`));
    if (!state.quiz || state.quiz.unit_id !== unit.id) { content.append(make('p', 'muted', 'Work from memory first. Submit all ten answers to see feedback and links for further study. Results stay in this browser and are included in your progress backup.')); return; }
    const quiz = state.quiz; const form = make('form', 'quiz-panel'); form.id = 'checkpointForm';
    form.append(make('h3', '', unit.name), make('p', 'muted', 'Choose one answer for each question. These are original learning questions, not official exam questions.'));
    if (quiz.submitted) {
      const correct = quiz.questions.filter((question, i) => quiz.answers[i] === question.correct_index).length; const score = Math.round(correct / quiz.questions.length * 100); const result = make('div', 'quiz-score'); result.setAttribute('role', 'status'); result.append(make('strong', '', `${score}% · ${correct} / ${quiz.questions.length}`), make('p', '', score >= 80 ? 'Personal revision milestone reached. Explain the answers in your own words and test a variation.' : 'Use the feedback below to choose your next revision topic. An incorrect answer is useful evidence of what to practise.')); form.append(result);
    }
    quiz.questions.forEach((question, index) => {
      const fieldset = make('fieldset', 'quiz-question'); const legend = make('legend', '', `${index + 1}. ${question.prompt}`); fieldset.append(legend);
      if (question.kind === 'scenario') fieldset.append(make('span', 'tag', 'Applied scenario'));
      question.choices.forEach((choice, choiceIndex) => {
        const label = make('label', 'quiz-choice'); const radio = make('input'); radio.type = 'radio'; radio.name = question.id; radio.value = choiceIndex; radio.checked = quiz.answers[index] === choiceIndex; radio.disabled = quiz.submitted;
        radio.addEventListener('change', () => { quiz.answers[index] = choiceIndex; $('submitQuizBtn').disabled = quiz.answers.some(answer => answer === null); });
        if (quiz.submitted) { label.classList.toggle('correct', choiceIndex === question.correct_index); label.classList.toggle('incorrect', quiz.answers[index] === choiceIndex && choiceIndex !== question.correct_index); }
        label.append(radio, make('span', '', choice)); fieldset.append(label);
      });
      if (quiz.submitted) {
        const correct = quiz.answers[index] === question.correct_index; const feedback = make('div', `quiz-feedback${correct ? '' : ' incorrect'}`); feedback.append(make('strong', '', correct ? 'Correct.' : `Suggested answer: ${question.choices[question.correct_index]}`), make('p', '', question.explanation));
        const links = make('div', 'lesson-links'); noteButtons(links, question.note_ids); feedback.append(links); sourceLinks(feedback, question.source_ids); fieldset.append(feedback);
      }
      form.append(fieldset);
    });
    if (!quiz.submitted) {
      const submit = make('button', '', 'Submit all answers'); submit.id = 'submitQuizBtn'; submit.type = 'submit'; submit.disabled = quiz.answers.some(answer => answer === null); form.append(submit);
      form.addEventListener('submit', event => {
        event.preventDefault(); if (quiz.answers.some(answer => answer === null)) return;
        const score = Math.round(quiz.questions.filter((question, i) => quiz.answers[i] === question.correct_index).length / quiz.questions.length * 100);
        state.progress.quizzes[unit.id] = { score, completed_on: P.localDate(), question_ids: quiz.questions.map(question => question.id), answers: [...quiz.answers] }; quiz.submitted = true; save(); renderQuiz(); focusTarget($('checkpointForm')?.querySelector('.quiz-score')); announce(`Checkpoint saved: ${score} percent.`);
      });
    }
    content.append(form);
  };
  const renderLab = (lab, capstone = false) => {
    const saved = state.progress.labs[lab.id] || { completed_steps: [], complete: false, reflection: '' };
    const article = make('article', capstone ? 'capstone' : 'lab-record'); article.id = lab.id; article.classList.toggle('completed', saved.complete);
    article.append(make('span', 'small-label', capstone ? `SEMESTER ${lab.semester} · INTEGRATED CAPSTONE` : unitFor(lab.unit_id)?.name || 'PRACTICAL LAB'), make('h3', '', lab.title));
    if (lab.scenario) article.append(make('p', '', lab.scenario));
    const verification = lab.verification_status === 'locally-tested' ? 'Selected local examples were executed during authoring; verify them in your own environment.' : 'Documentation reviewed; this exercise was not executed on vendor hardware here.';
    article.append(make('p', 'lab-verification', `${verification} Your checklist is self-reported.`));
    if (lab.guide_url) article.append(link('Open the full workbook and commands →', lab.guide_url, 'source-link'));
    const prerequisites = lab.prerequisites || lab.objectives || [];
    if (prerequisites.length) { article.append(make('h4', '', capstone ? 'Objectives' : 'Before you start')); const list = make('ul'); prerequisites.forEach(value => list.append(make('li', '', value))); article.append(list); }
    const steps = make('ol', 'lab-steps');
    const persist = () => { state.progress.labs[lab.id] = { completed_steps: [...saved.completed_steps], complete: saved.complete, reflection: saved.reflection }; save(); };
    (lab.steps || []).forEach((step, index) => {
      const item = make('li', 'lab-step'); const check = make('input'); check.type = 'checkbox'; check.id = `${lab.id}-step-${index}`; check.dataset.labStep = String(index); check.dataset.labId = lab.id; check.checked = saved.completed_steps.includes(index); const label = make('label', '', `${index + 1}. ${step}`); label.htmlFor = check.id;
      check.addEventListener('change', () => { const completed = new Set(saved.completed_steps); check.checked ? completed.add(index) : completed.delete(index); saved.completed_steps = [...completed].sort((a, b) => a - b); if (!check.checked) { saved.complete = false; complete.checked = false; article.classList.remove('completed'); } persist(); }); item.append(check, label); steps.append(item);
    }); article.append(steps);
    addPart(article, 'Expected result', lab.expected_result); if (lab.troubleshooting?.length) { const details = make('details'); details.append(make('summary', '', 'Troubleshooting prompts')); const list = make('ul'); lab.troubleshooting.forEach(value => list.append(make('li', '', value))); details.append(list); article.append(details); }
    addPart(article, 'Cleanup and recovery', lab.cleanup); addPart(article, 'Evidence to collect', lab.evidence_prompt);
    const reflectionLabel = make('label', 'lab-reflection', 'Your observations and explanation (optional, saved only in this browser)'); const reflection = make('textarea'); reflection.rows = 3; reflection.maxLength = 10000; reflection.id = `${lab.id}-reflection`; reflectionLabel.htmlFor = reflection.id; reflection.value = saved.reflection; reflection.placeholder = 'Prediction, actual result, explanation and remaining uncertainty. Use synthetic details; keep credentials and workplace records out.';
    reflection.addEventListener('change', () => { saved.reflection = reflection.value; persist(); }); article.append(reflectionLabel, reflection);
    const completion = make('label', 'completion-toggle'); const complete = make('input'); complete.type = 'checkbox'; complete.dataset.labComplete = lab.id; complete.checked = saved.complete;
    complete.addEventListener('change', () => { saved.complete = complete.checked; if (complete.checked) { saved.completed_steps = (lab.steps || []).map((_, i) => i); article.querySelectorAll('[data-lab-step]').forEach(node => { node.checked = true; }); } article.classList.toggle('completed', complete.checked); persist(); announce(complete.checked ? 'Lab marked completed in your own record. This does not verify execution.' : 'Lab marked for more practice.'); }); completion.append(complete, make('span', '', 'I performed the steps, checked the result and completed cleanup')); article.append(completion); return article;
  };
  const renderLabs = () => {
    const content = $('labsContent'); content.replaceChildren(); const labs = state.labs.filter(matchesUnit); labs.forEach(lab => content.append(renderLab(lab)));
    const capstones = state.capstones.filter(capstone => !$('semesterFilter').value || String(capstone.semester) === $('semesterFilter').value);
    if (capstones.length) { content.append(make('h3', '', 'Semester capstones')); capstones.forEach(capstone => content.append(renderLab(capstone, true))); }
    if (!labs.length) content.prepend(make('p', 'no-lessons', 'No standalone labs match this unit. Use its lesson activities and the integrated capstones below.'));
  };
  const buildProgramme = () => {
    const content = $('programmeContent'); content.replaceChildren(); const programme = state.programme;
    content.append(make('p', 'programme-intro', 'A foundation in computing, technical operations and professional practice, developed and delivered by HRUC. Use this companion alongside teaching and your assessment briefs.'));
    const semesters = make('div', 'semester-grid');
    [1, 2].forEach(number => {
      const metadata = programme.semesters?.find(item => Number(item.number) === number); const panel = make('article', 'programme-panel'); panel.append(make('span', 'small-label', `SEMESTER ${number}`), make('h3', '', number === 1 ? 'Establish the foundations' : 'Apply and develop'), make('p', 'dates', metadata?.dates || (number === 1 ? 'September 2026 – February 2027' : 'February – July 2027')));
      state.units.filter(unit => Number(unit.semester) === number).forEach(unit => { const item = make('div', 'programme-unit'); if (unit.optional) item.append(make('span', 'tag', 'Optional route')); item.append(button(`${unit.name} →`, '', () => selectUnit(unit.id, 'pathway')), make('p', '', unit.summary)); const list = make('ul'); (unit.outcomes || []).forEach(value => list.append(make('li', '', value))); item.append(list); panel.append(item); }); semesters.append(panel);
    }); content.append(semesters);
    const placement = programme.placement || {}; const panel = make('article', 'programme-panel placement-panel'); panel.append(make('span', 'small-label', 'EXPERIENTIAL LEARNING'), make('h3', '', `${placement.duration_weeks || 14}-week work-based learning opportunity`), make('p', '', placement.start_context || 'Work experience dates are from January 2027. Eligible candidates may have an opportunity at Amazon data centres.'), make('p', '', placement.eligibility || 'Confirm eligibility and availability with HRUC.'), make('p', '', placement.note || 'The optional project provides an alternative qualification route; confirm requirements with HRUC.')); content.append(panel);
    const certifications = make('div', 'certification-grid'); (programme.certifications || []).forEach(cert => { const item = make('article', 'programme-panel'); item.append(make('span', 'small-label', 'VENDOR CERTIFICATION'), make('h3', '', cert.name), make('p', '', cert.alignment), make('p', 'muted', cert.note)); certifications.append(item); }); content.append(certifications, make('p', 'programme-note', programme.context_note || 'Independent revision material. Confirm programme requirements with HRUC.'));
  };
  const refresh = () => {
    if (!state.loaded) return;
    const unit = selectedUnit(); const notes = state.notes.filter(matches); const cards = state.cards.filter(matches); const guides = matchingGuides();
    $('notesTabCount').textContent = notes.length; $('cardsTabCount').textContent = cards.length;
    $('allUnitsBtn').classList.toggle('active', !unit); $('allUnitsBtn').setAttribute('aria-pressed', String(!unit));
    document.querySelectorAll('.unit-link').forEach(node => { const active = node.dataset.unit === unit?.id; node.classList.toggle('active', active); node.setAttribute('aria-pressed', String(active)); });
    if (state.view === 'notes' || state.view === 'cards') {
      const isNotes = state.view === 'notes'; $('sectionTitle').textContent = unit ? unit.name : isNotes ? 'All study notes' : 'Train your recall'; $('sectionEyebrow').textContent = isNotes ? 'UNDERSTAND · APPLY · REVIEW' : 'THINK FIRST. THEN REVEAL.';
      $('unitSummary').textContent = unit?.summary || (isNotes ? 'Concepts, worked examples and practical exercises across your programme.' : 'Recall from memory, check your explanation and choose the next review.');
      $('resultCount').textContent = `${notes.length} study notes · ${cards.length} recall cards${$('searchInput').value.trim() ? ` · ${guides.length} guide sections` : ''} match your filters`;
      $('notes').hidden = !isNotes; $('cards').hidden = isNotes; $('revisionControls').hidden = isNotes;
      let visibleCards = cards;
      if (!isNotes) { renderRevisionSummary(); visibleCards = state.session ? cards.filter(card => state.session.ids.includes(card.id)) : P.dueCards(cards, state.progress, P.localDate(), $('revisionMode').value === 'all'); }
      $('emptyState').hidden = (isNotes ? notes : visibleCards).length > 0 || guides.length > 0 || ($('searchInput').value.trim() && (isNotes ? cards : notes).length > 0);
      if (isNotes) renderNotes(notes); else renderCards(visibleCards);
      renderLibrarySearch(notes, cards, guides); renderReferences(isNotes ? notes : []);
    } else if (state.view === 'pathway') renderPathway(); else if (state.view === 'quizzes') renderQuiz(); else if (state.view === 'labs') renderLabs();
    updateProgress(); renderDashboard();
  };
  const setView = (view, focus = false) => {
    if (!views.includes(view)) return; state.savedScroll[state.view] = window.scrollY; state.view = view; stopSpeech();
    document.querySelectorAll('[data-view]').forEach(node => { const selected = node.dataset.view === view; node.classList.toggle('active', selected); node.setAttribute('aria-pressed', String(selected)); });
    $('studyControls').hidden = ['programme', 'practice'].includes(view);
    $('searchInput').disabled = false;
    ['categoryFilter', 'vendorFilter'].forEach(id => { $(id).disabled = !['notes', 'cards'].includes(view); $(id).closest('label').hidden = !['notes', 'cards'].includes(view); });
    $('studySection').hidden = !state.loaded || !['notes', 'cards'].includes(view);
    ['pathway', 'quizzes', 'labs', 'practice', 'programme'].forEach(name => { $(`${name}Section`).hidden = !state.loaded || view !== name; });
    if (view === 'practice' && !state.practiceMounted && window.StudyTools) { window.StudyTools.mount($('practiceTools')); state.practiceMounted = true; }
    refresh();
    if (focus) { writeRoute(); focusTarget($(view === 'notes' || view === 'cards' ? 'sectionTitle' : `${view}Title`)); }
  };
  const navigateUnit = direction => { const units = state.units.filter(unit => !$('semesterFilter').value || String(unit.semester) === $('semesterFilter').value); if (!units.length) return; const index = units.findIndex(unit => unit.id === $('unitFilter').value); const next = index === -1 ? direction > 0 ? 0 : units.length - 1 : (index + direction + units.length) % units.length; selectUnit(units[next].id); };
  const fetchJSON = async url => { const response = await fetch(url, { cache: 'no-cache' }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); };
  const load = async () => {
    $('loadState').hidden = false; $('loadState').classList.remove('error'); $('loadState').textContent = 'Opening your study pathway…'; $('retryBtn').hidden = true;
    try {
      const base = await fetchJSON(document.body.dataset.contentUrl);
      const learning = Array.isArray(base.lessons) ? {} : await fetchJSON(document.body.dataset.learningUrl);
      const content = { ...base, ...learning }; const search = await fetchJSON(document.body.dataset.searchUrl);
      if (!Array.isArray(content.units) || !Array.isArray(content.notes) || !Array.isArray(content.flashcards) || !content.units.length) throw new Error('The study content has an unexpected format.');
      state.units = content.units; const normalize = item => ({ ...item, semester: item.semester || unitFor(item.unit_id)?.semester || 1 });
      state.notes = content.notes.map(normalize);
      state.cards = content.flashcards.map(normalize).map(card => ({ ...card, vendors: card.vendor ? [card.vendor] : [...new Set(state.notes.filter(note => note.unit_id === card.unit_id && note.category === card.category).map(note => note.vendor).filter(Boolean))] }));
      state.lessons = content.lessons || []; state.questions = content.questions || []; state.labs = content.labs || []; state.capstones = content.capstones || []; state.sources = content.sources || []; state.programme = content.programme || {}; state.guides = Array.isArray(search) ? search : search.entries || [];
      state.content = { ...content, notes: state.notes, flashcards: state.cards };
      [...state.notes, ...state.cards].forEach(item => state.searchCache.set(item.id, allText(item).toLocaleLowerCase())); state.guides.forEach(item => state.searchCache.set(`guide:${item.id}`, `${item.title} ${item.guide_title} ${item.text}`.toLocaleLowerCase()));
      restore(); unitOptions(); fillOptions($('categoryFilter'), [...new Set([...state.notes, ...state.cards].map(item => item.category).filter(Boolean))].sort(), 'All topic areas', readable); fillOptions($('vendorFilter'), [...new Set([...state.notes, ...state.cards].flatMap(item => item.vendors || [item.vendor]).filter(Boolean))].sort(), 'All vendors');
      const readingPosition = restoreNavigation();
      buildNav(); buildProgramme(); state.loaded = true; $('loadState').hidden = true; applyRoute();
      if (readingPosition !== null) requestAnimationFrame(() => window.scrollTo({ top: readingPosition, behavior: 'auto' }));
    } catch (error) {
      $('loadState').classList.add('error'); $('loadState').textContent = `The study book could not load. ${error.message} Check your connection and try again. To run locally, start Flask or serve the docs folder with an HTTP server.`; $('retryBtn').hidden = false; $('studySection').hidden = true; ['pathway','quizzes','labs','practice','programme'].forEach(name => { $(`${name}Section`).hidden = true; }); $('continueDashboard').hidden = true;
    }
  };
  $('searchInput').addEventListener('input', () => { state.session = null; if (!['notes', 'cards'].includes(state.view)) setView('notes'); else refresh(); writeRoute({}, true); });
  $('semesterFilter').addEventListener('change', () => { state.session = null; unitOptions(); refresh(); writeRoute({}, true); });
  ['unitFilter', 'categoryFilter', 'vendorFilter'].forEach(id => $(id).addEventListener('change', () => { state.session = null; if (id === 'unitFilter') { state.quizUnit = $('unitFilter').value; state.quiz = null; } refresh(); writeRoute({}, true); }));
  document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => { const previous = state.savedScroll[node.dataset.view]; const heroAction = Boolean(node.closest('.hero-actions')); setView(node.dataset.view, heroAction); writeRoute(); if (!heroAction && previous !== undefined) window.scrollTo({ top: previous, behavior: 'auto' }); }));
  $('clearFiltersBtn').addEventListener('click', clearFilters); $('emptyClearBtn').addEventListener('click', clearFilters);
  $('allUnitsBtn').addEventListener('click', () => { clearFilterValues(); setView('notes', true); }); $('prevUnitBtn').addEventListener('click', () => navigateUnit(-1)); $('nextUnitBtn').addEventListener('click', () => navigateUnit(1));
  $('retryBtn').addEventListener('click', load); $('stopSpeechBtn').addEventListener('click', stopSpeech); window.addEventListener('pagehide', () => { rememberNavigation(); stopSpeech(); }); window.addEventListener('popstate', event => { applyRoute(); if (Number.isFinite(event.state?.studyScroll)) requestAnimationFrame(() => window.scrollTo({ top: event.state.studyScroll, behavior: 'auto' })); });
  $('revisionMode').addEventListener('change', () => { state.session = null; refresh(); }); $('startSessionBtn').addEventListener('click', startSession); $('endSessionBtn').addEventListener('click', () => { state.session = null; refresh(); });
  $('resetProgressBtn').addEventListener('click', () => { $('resetConfirm').hidden = false; $('confirmResetBtn').focus(); }); $('cancelResetBtn').addEventListener('click', () => { $('resetConfirm').hidden = true; $('resetProgressBtn').focus(); });
  $('confirmResetBtn').addEventListener('click', () => { state.progress = P.createEmpty(); state.unrestoredProgress = null; $('recoverProgressBtn').hidden = true; state.session = null; state.quiz = null; save(); refresh(); $('resetConfirm').hidden = true; $('resetProgressBtn').focus(); announce('Study progress cleared.'); });
  $('exportProgressBtn').addEventListener('click', () => { const blob = new Blob([P.exportData(state.progress)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const download = make('a'); download.href = url; download.download = `az4caf-progress-${P.localDate()}.json`; document.body.append(download); download.click(); download.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); backupStatus('Progress backup downloaded. It includes your optional lab reflections; keep it private.'); });
  $('recoverProgressBtn').addEventListener('click', () => { if (state.unrestoredProgress === null) return; const url = URL.createObjectURL(new Blob([state.unrestoredProgress], { type: 'application/json' })); const download = make('a'); download.href = url; download.download = `az4caf-unreadable-backup-${P.localDate()}.json`; document.body.append(download); download.click(); download.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
  $('importProgressBtn').addEventListener('click', () => $('importProgressFile').click());
  $('importProgressFile').addEventListener('change', async event => {
    const file = event.target.files[0]; if (!file) return; state.pendingImport = null; $('importConfirm').hidden = true;
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('The backup exceeds the 5 MiB size limit.');
      state.pendingImport = P.validateImport(JSON.parse(await file.text()), state.content);
      const imported = state.pendingImport; $('importSummary').textContent = `This backup contains ${imported.notes.length} reviewed notes, ${Object.keys(imported.cards).length} card records, ${imported.lessons.length} completed lessons and ${Object.keys(imported.labs).length} lab records.`; $('importConfirm').hidden = false; $('confirmImportBtn').focus(); backupStatus('Backup validated. Your current progress has not changed.');
    } catch (error) { backupStatus(`Backup was not imported: ${error.message}`, true); } finally { event.target.value = ''; }
  });
  $('cancelImportBtn').addEventListener('click', () => { state.pendingImport = null; $('importConfirm').hidden = true; backupStatus('Import cancelled. Your progress is unchanged.'); $('importProgressBtn').focus(); });
  $('confirmImportBtn').addEventListener('click', () => { if (!state.pendingImport) return; state.progress = state.pendingImport; state.unrestoredProgress = null; $('recoverProgressBtn').hidden = true; state.pendingImport = null; state.session = null; state.quiz = null; save(); refresh(); $('importConfirm').hidden = true; backupStatus('Progress replaced with the validated backup.'); $('importProgressBtn').focus(); });
  load();
})();
