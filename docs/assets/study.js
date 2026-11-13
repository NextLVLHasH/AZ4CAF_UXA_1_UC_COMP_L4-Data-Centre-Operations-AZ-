'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'az4caf.study-progress.v1';
  const state = { units: [], notes: [], cards: [], programme: {}, view: 'notes', progress: { notes: [], cards: {} }, loaded: false };
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, className, handler) => {
    const node = make('button', className, text);
    node.type = 'button';
    node.addEventListener('click', handler);
    return node;
  };
  const readable = text => String(text || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const identity = (item, field) => JSON.stringify([item.unit, item[field]]);
  const noteID = note => identity(note, 'topic');
  const cardID = card => identity(card, 'question');
  const allText = value => {
    if (Array.isArray(value)) return value.map(allText).join(' ');
    if (value && typeof value === 'object') return Object.values(value).map(allText).join(' ');
    return String(value ?? '');
  };
  const safeURL = value => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  const announce = message => { $('announcement').textContent = message; };
  const storageWarning = () => { $('storageNotice').hidden = false; };
  const restoreProgress = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (!stored || !Array.isArray(stored.notes) || typeof stored.cards !== 'object' || stored.cards === null || Array.isArray(stored.cards)) return;
      state.progress.notes = stored.notes.filter(item => typeof item === 'string');
      state.progress.cards = Object.fromEntries(Object.entries(stored.cards).filter(([, value]) => ['again', 'known'].includes(value)));
    } catch { storageWarning(); }
  };
  const saveProgress = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
    catch { storageWarning(); }
    updateProgress();
  };
  const updateProgress = () => {
    const reviewed = new Set(state.progress.notes);
    $('notesProgress').textContent = `${state.notes.filter(note => reviewed.has(noteID(note))).length} / ${state.notes.length}`;
    $('cardsProgress').textContent = `${state.cards.filter(card => state.progress.cards[cardID(card)] === 'known').length} / ${state.cards.length}`;
    document.querySelectorAll('.unit-link').forEach(node => {
      const notes = state.notes.filter(note => note.unit === node.dataset.unit);
      const done = notes.length > 0 && notes.every(note => reviewed.has(noteID(note)));
      node.querySelector('.unit-complete').classList.toggle('done', done);
      node.querySelector('.unit-complete').title = done ? 'All notes reviewed' : 'Notes to review';
    });
  };
  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    $('stopSpeechBtn').hidden = true;
  };
  const speak = text => {
    if (!('speechSynthesis' in window)) return;
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.onend = () => { $('stopSpeechBtn').hidden = true; };
    utterance.onerror = () => { $('stopSpeechBtn').hidden = true; announce('Reading aloud could not start. Try your browser’s reading tools.'); };
    $('stopSpeechBtn').hidden = false;
    window.speechSynthesis.speak(utterance);
  };
  const audioButton = (label, getText) => {
    const node = button('Read aloud', 'audio-button', () => speak(getText()));
    node.setAttribute('aria-label', label);
    if (!('speechSynthesis' in window)) { node.disabled = true; node.title = 'Reading aloud is not supported in this browser'; }
    return node;
  };
  const fillOptions = (select, values, firstLabel, getLabel = value => value) => {
    const selected = select.value;
    select.replaceChildren(new Option(firstLabel, ''));
    values.forEach(value => select.add(new Option(getLabel(value), value)));
    select.value = values.includes(selected) ? selected : '';
  };
  const unitOptions = () => {
    const semester = $('semesterFilter').value;
    fillOptions($('unitFilter'), state.units.filter(unit => !semester || String(unit.semester) === semester).map(unit => unit.name), 'All units');
  };
  const buildNav = () => {
    $('unitNav').replaceChildren();
    [1, 2].forEach(semester => {
      $('unitNav').append(make('div', 'semester-label', `SEMESTER ${semester}`));
      state.units.filter(unit => Number(unit.semester) === semester).forEach(unit => {
        const nav = button('', 'unit-link', () => selectUnit(unit.name));
        nav.dataset.unit = unit.name;
        nav.setAttribute('aria-pressed', 'false');
        nav.append(make('span', 'unit-number', String(state.units.indexOf(unit) + 1).padStart(2, '0')), make('span', 'unit-name', unit.name + (unit.optional ? ' · optional' : '')), make('span', 'unit-complete'));
        $('unitNav').append(nav);
      });
    });
    $('totalNotes').textContent = state.notes.length;
  };
  const selectUnit = name => {
    const unit = state.units.find(item => item.name === name);
    if (unit && $('semesterFilter').value && String(unit.semester) !== $('semesterFilter').value) $('semesterFilter').value = String(unit.semester);
    unitOptions();
    $('unitFilter').value = name;
    // Selecting a chapter starts a useful view even after a narrow topic search.
    $('categoryFilter').value = '';
    $('vendorFilter').value = '';
    $('searchInput').value = '';
    setView('notes');
  };
  const clearFilters = () => {
    $('searchInput').value = '';
    $('semesterFilter').value = '';
    unitOptions();
    $('unitFilter').value = '';
    $('categoryFilter').value = '';
    $('vendorFilter').value = '';
    refresh();
  };
  const matching = item => {
    const unit = $('unitFilter').value;
    const semester = $('semesterFilter').value;
    const category = $('categoryFilter').value;
    const vendor = $('vendorFilter').value;
    const query = $('searchInput').value.trim().toLocaleLowerCase();
    return (!unit || item.unit === unit) && (!semester || String(item.semester) === semester) && (!category || item.category === category) && (!vendor || item.vendor === vendor || item.vendors?.includes(vendor)) && (!query || allText(item).toLocaleLowerCase().includes(query));
  };
  const addStudyPart = (parent, title, text, className = '') => {
    if (!text) return;
    parent.append(make('h4', '', title), make('p', className, text));
  };
  const renderNotes = notes => {
    $('notes').replaceChildren();
    notes.forEach(note => {
      const article = make('article', 'note');
      article.classList.toggle('reviewed', state.progress.notes.includes(noteID(note)));
      const top = make('div', 'note-top');
      top.append(make('span', 'topic-label', readable(note.category)), make('span', 'note-index', `NOTE ${String(state.notes.indexOf(note) + 1).padStart(2, '0')}`));
      article.append(top, make('h3', '', note.topic), make('p', 'meta', `${note.unit} · Semester ${note.semester}${note.vendor ? ` · ${note.vendor}` : ''}`), make('p', '', note.content));
      if (Array.isArray(note.key_points) && note.key_points.length) {
        const points = make('ul', 'key-points');
        note.key_points.forEach(point => points.append(make('li', '', point)));
        article.append(points);
      }
      const details = make('details');
      details.append(make('summary', '', 'Examples, practice & self-check'));
      const detailContent = make('div', 'study-detail');
      addStudyPart(detailContent, 'Worked example', note.worked_example);
      addStudyPart(detailContent, 'Try it yourself', note.practice);
      if (note.check_question) {
        addStudyPart(detailContent, 'Check your understanding', note.check_question);
        if (note.check_answer) {
          const answer = make('details', 'answer-check');
          answer.append(make('summary', '', 'Reveal suggested answer'), make('p', '', note.check_answer));
          detailContent.append(answer);
        }
      }
      addStudyPart(detailContent, 'Operational context', note.case_study, 'scenario');
      details.append(detailContent);
      article.append(details);
      const url = safeURL(note.source_url);
      if (url) {
        const link = make('a', 'source-link', `${note.source_title || 'Reference'} ↗`);
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        article.append(link);
      }
      const actions = make('div', 'note-actions');
      const label = make('label', 'review-label');
      const input = make('input'); input.type = 'checkbox'; input.checked = state.progress.notes.includes(noteID(note));
      input.setAttribute('aria-label', `Mark ${note.topic} as reviewed`);
      input.addEventListener('change', () => {
        const reviewed = new Set(state.progress.notes);
        input.checked ? reviewed.add(noteID(note)) : reviewed.delete(noteID(note));
        state.progress.notes = [...reviewed];
        article.classList.toggle('reviewed', input.checked);
        saveProgress();
        announce(input.checked ? 'Note marked as reviewed.' : 'Note marked for review.');
      });
      label.append(input, make('span', '', 'Reviewed'));
      actions.append(label, audioButton(`Read ${note.topic} aloud`, () => [note.topic, note.content, ...(note.key_points || []), note.worked_example, note.practice].filter(Boolean).join('. ')));
      article.append(actions);
      $('notes').append(article);
    });
  };
  const renderCards = cards => {
    $('cards').replaceChildren();
    cards.forEach((card, index) => {
      const article = make('article', 'card');
      article.append(make('span', 'topic-label', `${readable(card.category)} · RECALL`), make('h3', '', card.question), make('p', 'meta', `${card.unit} · Semester ${card.semester}`));
      const status = make('p', 'rating-status');
      const updateRating = () => {
        status.textContent = state.progress.cards[cardID(card)] === 'known' ? '✓ You marked this as known' : state.progress.cards[cardID(card)] === 'again' ? '↻ Keep practising this one' : 'Not rated yet';
      };
      updateRating(); article.append(status);
      const answer = make('div', 'card-answer');
      answer.hidden = true; answer.id = `card-answer-${index}`;
      answer.append(make('span', 'small-label', 'SUGGESTED ANSWER'), make('p', '', card.answer));
      const ratings = make('div', 'rating-controls');
      ['again', 'known'].forEach(rating => {
        const rate = button(rating === 'again' ? 'Practise again' : 'Got it', rating === 'again' ? 'secondary' : '', () => {
          state.progress.cards[cardID(card)] = rating;
          saveProgress(); updateRating();
          ratings.querySelectorAll('button').forEach(node => node.setAttribute('aria-pressed', String(node === rate)));
          announce(rating === 'known' ? 'Card marked as known.' : 'Card marked for more practice.');
        });
        rate.setAttribute('aria-pressed', String(state.progress.cards[cardID(card)] === rating));
        rate.setAttribute('aria-label', `${rating === 'again' ? 'Practise again' : 'Got it'}: ${card.question}`);
        ratings.append(rate);
      });
      answer.append(ratings);
      const controls = make('div', 'card-controls');
      const reveal = button('Reveal answer', 'secondary', () => {
        answer.hidden = !answer.hidden;
        reveal.textContent = answer.hidden ? 'Reveal answer' : 'Hide answer';
        reveal.setAttribute('aria-expanded', String(!answer.hidden));
      });
      reveal.setAttribute('aria-expanded', 'false'); reveal.setAttribute('aria-controls', answer.id);
      controls.append(reveal, audioButton(`Read question${card.question ? `: ${card.question}` : ''}`, () => answer.hidden ? `Question: ${card.question}` : `Question: ${card.question}. Answer: ${card.answer}`));
      article.append(controls, answer);
      $('cards').append(article);
    });
  };
  const renderReferences = notes => {
    $('references').replaceChildren();
    const references = new Map();
    notes.forEach(note => { const url = safeURL(note.source_url); if (url) references.set(url, note.source_title || url); });
    [...references].sort((a, b) => a[1].localeCompare(b[1])).forEach(([url, title]) => {
      const link = make('a', '', title); link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      const item = make('li'); item.append(link); $('references').append(item);
    });
    $('referencesPanel').hidden = state.view !== 'notes' || references.size === 0;
  };
  const refresh = () => {
    if (!state.loaded) return;
    const notes = state.notes.filter(matching);
    const cards = state.cards.filter(matching);
    const isNotes = state.view === 'notes';
    const unit = state.units.find(item => item.name === $('unitFilter').value);
    $('sectionTitle').textContent = unit ? unit.name : isNotes ? 'All study notes' : 'Train your recall';
    $('sectionEyebrow').textContent = isNotes ? 'UNDERSTAND · APPLY · REVIEW' : 'THINK FIRST. THEN REVEAL.';
    $('unitSummary').textContent = unit?.summary || (isNotes ? 'Concepts, worked examples and practical exercises across your programme.' : 'Answer from memory, check the explanation, then decide what needs more practice.');
    $('notesTabCount').textContent = notes.length;
    $('cardsTabCount').textContent = cards.length;
    $('resultCount').textContent = `${notes.length} study ${notes.length === 1 ? 'note' : 'notes'} · ${cards.length} recall ${cards.length === 1 ? 'card' : 'cards'} match your filters`;
    $('notes').hidden = !isNotes;
    $('cards').hidden = isNotes;
    $('emptyState').hidden = (isNotes ? notes : cards).length > 0;
    $('allUnitsBtn').classList.toggle('active', !unit);
    $('allUnitsBtn').setAttribute('aria-pressed', String(!unit));
    document.querySelectorAll('.unit-link').forEach(node => {
      const selected = node.dataset.unit === unit?.name;
      node.classList.toggle('active', selected);
      node.setAttribute('aria-pressed', String(selected));
    });
    renderNotes(notes); renderCards(cards); renderReferences(notes); updateProgress();
  };
  const setView = view => {
    state.view = view;
    stopSpeech();
    document.querySelectorAll('[data-view]').forEach(node => {
      const selected = node.dataset.view === view;
      node.classList.toggle('active', selected);
      node.setAttribute('aria-pressed', String(selected));
    });
    $('studyControls').hidden = view === 'programme';
    $('studySection').hidden = !state.loaded || view === 'programme';
    $('programmeSection').hidden = !state.loaded || view !== 'programme';
    refresh();
  };
  const navigateUnit = direction => {
    const semester = $('semesterFilter').value;
    const units = state.units.filter(unit => !semester || String(unit.semester) === semester);
    if (!units.length) return;
    const index = units.findIndex(unit => unit.name === $('unitFilter').value);
    const next = index === -1 ? (direction > 0 ? 0 : units.length - 1) : (index + direction + units.length) % units.length;
    selectUnit(units[next].name);
  };
  const buildProgramme = () => {
    const programme = state.programme;
    const content = $('programmeContent'); content.replaceChildren();
    content.append(make('p', 'programme-intro', 'A foundation in computing, technical operations and professional practice, developed and delivered by HRUC. Use this book alongside teaching, vendor materials and your assessment briefs.'));
    const semesters = make('div', 'semester-grid');
    [1, 2].forEach(number => {
      const metadata = programme.semesters?.find(item => Number(item.number) === number);
      const panel = make('article', 'programme-panel');
      panel.append(make('span', 'small-label', `SEMESTER ${String(number).padStart(2, '0')}`), make('h3', '', number === 1 ? 'Establish the foundations' : 'Apply and develop'), make('p', 'dates', metadata?.dates || (number === 1 ? 'September 2026 – February 2027' : 'February – July 2027')));
      state.units.filter(unit => Number(unit.semester) === number).forEach(unit => {
        const item = make('div', 'programme-unit');
        if (unit.optional) item.append(make('span', 'tag', 'Optional route'));
        item.append(button(unit.name + ' →', '', () => { selectUnit(unit.name); $('sectionTitle').scrollIntoView({ block: 'start' }); }));
        if (unit.summary) item.append(make('p', '', unit.summary));
        if (Array.isArray(unit.outcomes) && unit.outcomes.length) {
          const list = make('ul'); unit.outcomes.forEach(outcome => list.append(make('li', '', outcome))); item.append(list);
        }
        panel.append(item);
      });
      semesters.append(panel);
    });
    content.append(semesters);
    const placement = programme.placement || {};
    const experience = make('article', 'programme-panel placement-panel');
    experience.append(make('span', 'small-label', 'EXPERIENTIAL LEARNING'), make('h3', '', `${placement.duration_weeks || 14}-week work-based learning opportunity`), make('p', '', placement.start_context || 'Work experience dates are from January 2027. Eligible candidates may have an opportunity to gain hands-on experience at Amazon data centres.'), make('p', '', placement.eligibility || 'Placement participation depends on eligibility and availability; confirm arrangements with HRUC.'), make('p', '', placement.note || 'Designing a Computing Project offers an optional qualification route for students unable to complete work experience and those seeking progression to Level 5 HND study.'));
    content.append(experience);
    const certifications = make('div', 'certification-grid');
    const certs = programme.certifications || [
      { name: 'Cisco CCNA v7', alignment: 'Integrated with Core Networking, with Applied Networking extending practical skills.', note: 'Confirm the current exam objectives and booking arrangements with your tutor.' },
      { name: 'CompTIA A+', alignment: 'External professionals support Computer Systems Architecture.', note: 'These revision notes complement vendor learning materials; they do not guarantee full exam coverage.' }
    ];
    certs.forEach(cert => {
      const panel = make('article', 'programme-panel');
      panel.append(make('span', 'small-label', 'VENDOR CERTIFICATION'), make('h3', '', cert.name), make('p', '', cert.alignment), make('p', 'muted', cert.note));
      certifications.append(panel);
    });
    content.append(certifications, make('p', 'programme-note', programme.context_note || 'The programme is free of charge for students. Programme details, assessment requirements and placement arrangements should be confirmed with HRUC. These materials are an independent revision aid.'));
  };
  const load = async () => {
    $('loadState').hidden = false;
    $('loadState').classList.remove('error');
    $('loadState').textContent = 'Opening your study book…';
    $('retryBtn').hidden = true;
    try {
      const response = await fetch(document.body.dataset.contentUrl, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = await response.json();
      if (!content || !Array.isArray(content.units) || !Array.isArray(content.notes) || !Array.isArray(content.flashcards) || !content.units.length) throw new Error('The study content has an unexpected format.');
      if (![...content.units, ...content.notes, ...content.flashcards].every(item => item && typeof item === 'object')) throw new Error('Some study entries could not be read.');
      state.units = content.units;
      state.programme = content.programme || {};
      const normalize = item => ({ ...item, semester: item.semester || state.units.find(unit => unit.name === item.unit)?.semester || 1 });
      state.notes = content.notes.map(normalize);
      state.cards = content.flashcards.map(normalize).map(card => ({ ...card, vendors: card.vendors || [...new Set(state.notes.filter(note => note.unit === card.unit && note.category === card.category).map(note => note.vendor).filter(Boolean))] }));
      unitOptions();
      fillOptions($('categoryFilter'), [...new Set([...state.notes, ...state.cards].map(item => item.category).filter(Boolean))].sort(), 'All topic areas', readable);
      fillOptions($('vendorFilter'), [...new Set(state.notes.map(item => item.vendor).filter(Boolean))].sort(), 'All vendors');
      buildNav(); buildProgramme(); state.loaded = true;
      $('loadState').hidden = true;
      setView(state.view);
    } catch (error) {
      $('loadState').classList.add('error');
      $('loadState').textContent = `The study book could not load. ${error.message} Check your connection and try again. To run locally, start Flask or serve the docs folder with an HTTP server.`;
      $('retryBtn').hidden = false;
      $('studySection').hidden = true;
      $('programmeSection').hidden = true;
    }
  };
  restoreProgress();
  $('searchInput').addEventListener('input', refresh);
  $('semesterFilter').addEventListener('change', () => { unitOptions(); refresh(); });
  ['unitFilter', 'categoryFilter', 'vendorFilter'].forEach(id => $(id).addEventListener('change', refresh));
  document.querySelectorAll('[data-view]').forEach(node => node.addEventListener('click', () => setView(node.dataset.view)));
  $('clearFiltersBtn').addEventListener('click', clearFilters);
  $('emptyClearBtn').addEventListener('click', clearFilters);
  $('allUnitsBtn').addEventListener('click', () => { clearFilters(); setView('notes'); });
  $('prevUnitBtn').addEventListener('click', () => navigateUnit(-1));
  $('nextUnitBtn').addEventListener('click', () => navigateUnit(1));
  $('retryBtn').addEventListener('click', load);
  $('stopSpeechBtn').addEventListener('click', stopSpeech);
  window.addEventListener('pagehide', stopSpeech);
  $('resetProgressBtn').addEventListener('click', () => { $('resetConfirm').hidden = false; $('confirmResetBtn').focus(); });
  $('cancelResetBtn').addEventListener('click', () => { $('resetConfirm').hidden = true; $('resetProgressBtn').focus(); });
  $('confirmResetBtn').addEventListener('click', () => {
    state.progress = { notes: [], cards: {} }; saveProgress(); refresh();
    $('resetConfirm').hidden = true; $('resetProgressBtn').focus(); announce('Study progress cleared.');
  });
  load();
})();
