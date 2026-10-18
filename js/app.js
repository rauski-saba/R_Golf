import { store, newId } from './storage.js';
import { COUNTRIES, listCourses, filterCourses, fetchHoles } from './osm.js';
import { coursePar, playerSummary } from './golf.js';

const app = document.getElementById('app');
let draftCourse = null; // OSM:stä tuotu kenttä, jota ei ole vielä tallennettu

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const countryName = code => COUNTRIES.find(c => c.code === code)?.name || code || '';
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? d.split('-').reverse().join('.') : '';

function emptyHoles(n) {
  return Array.from({ length: n }, (_, i) => ({ number: i + 1, par: 4, handicap: null }));
}

function go(hash) { location.hash = hash; }

// ---------- Näkymät ----------

function homeView() {
  const rounds = store.rounds();
  return `
    <header><h1>R_Golf</h1></header>
    <div class="actions">
      <a class="btn primary" href="#/round/new">Uusi kierros</a>
      <a class="btn" href="#/courses">Kentät</a>
    </div>
    <h2>Kierrokset</h2>
    ${rounds.length ? `<ul class="list">${rounds.map(r => {
      const c = store.course(r.courseId);
      return `<li><a href="#/round/${r.id}">
        <strong>${esc(c?.name || 'Poistettu kenttä')}</strong>
        <span class="muted">${fmtDate(r.date)} · ${r.players.map(p => esc(p.name)).join(', ')}</span>
      </a></li>`;
    }).join('')}</ul>` : '<p class="muted">Ei vielä kierroksia.</p>'}`;
}

function coursesView() {
  const courses = store.courses();
  return `
    <header><a href="#/" class="back">‹</a><h1>Kentät</h1></header>
    <form id="search" class="card" autocomplete="off" onsubmit="return false">
      <h2>Hae golfkenttä</h2>
      <div class="row">
        <select name="country">${COUNTRIES.map(c => `<option value="${c.code}" ${c.code === current.country ? 'selected' : ''}>${c.name}</option>`).join('')}</select>
        <input type="search" name="course-filter" id="courseFilter" placeholder="Suodata, esim. Tuusula"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="search">
      </div>
      <div id="results"><p class="muted">Ladataan kenttiä…</p></div>
    </form>
    <a class="btn" href="#/course/new">Lisää kenttä käsin</a>
    <h2>Tallennetut kentät</h2>
    ${courses.length ? `<ul class="list">${courses.map(c => `
      <li><a href="#/course/${c.id}">
        <strong>${esc(c.name)}</strong>
        <span class="muted">${countryName(c.country)} · ${c.holes.length} väylää · par ${coursePar(c.holes)}</span>
      </a></li>`).join('')}</ul>` : '<p class="muted">Ei tallennettuja kenttiä.</p>'}
    <p class="muted small">Kenttädata © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, ODbL.</p>`;
}

function courseEditView(course) {
  const tees = course.tees.length ? course.tees : [{ name: '', rating: '', slope: '' }];
  return `
    <header><a href="#/courses" class="back">‹</a><h1>${course.name ? esc(course.name) : 'Uusi kenttä'}</h1></header>
    <form id="course" class="card">
      <label>Nimi <input name="name" value="${esc(course.name)}" required></label>
      <label>Maa <select name="country">${COUNTRIES.map(c => `<option value="${c.code}" ${c.code === course.country ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
      <label>Väyliä
        <select name="count">${[9, 18].map(n => `<option ${n === course.holes.length ? 'selected' : ''}>${n}</option>`).join('')}
        ${![9, 18].includes(course.holes.length) ? `<option selected>${course.holes.length}</option>` : ''}</select>
      </label>
      ${course.source === 'osm' ? `<p class="muted small">Tuotu OpenStreetMapista. Tarkista par ja väylähcp tuloskortista.</p>` : ''}
      <table class="holes">
        <thead><tr><th>Väylä</th><th>Par</th><th>Hcp</th></tr></thead>
        <tbody>${course.holes.map((h, i) => `
          <tr><td>${h.number}</td>
            <td><input type="number" inputmode="numeric" min="3" max="6" name="par${i}" value="${h.par ?? ''}" required></td>
            <td><input type="number" inputmode="numeric" min="1" max="18" name="hcp${i}" value="${h.handicap ?? ''}"></td></tr>`).join('')}
        </tbody>
        <tfoot><tr><td>Yht.</td><td>${coursePar(course.holes)}</td><td></td></tr></tfoot>
      </table>
      <h2>Tiit</h2>
      <p class="muted small">Slope ja CR löytyvät tuloskortista. Ilman niitä pelitasoitus lasketaan suoraan tasoitusindeksistä.</p>
      <div id="tees">${tees.map((t, i) => teeRow(t, i)).join('')}</div>
      <button type="button" class="btn" data-action="add-tee">+ Lisää tii</button>
      <div class="actions">
        <button class="btn primary">Tallenna</button>
        ${store.course(course.id) ? `<button type="button" class="btn danger" data-action="delete-course">Poista</button>` : ''}
      </div>
    </form>`;
}

function teeRow(t, i) {
  return `<div class="row tee">
    <input name="teeName${i}" placeholder="Tii, esim. 57" value="${esc(t.name)}">
    <input name="teeRating${i}" type="number" step="0.1" inputmode="decimal" placeholder="CR" value="${esc(t.rating)}">
    <input name="teeSlope${i}" type="number" inputmode="numeric" placeholder="Slope" value="${esc(t.slope)}">
  </div>`;
}

function newRoundView() {
  const courses = store.courses();
  if (!courses.length) {
    return `<header><a href="#/" class="back">‹</a><h1>Uusi kierros</h1></header>
      <p>Lisää ensin kenttä.</p><a class="btn primary" href="#/courses">Kentät</a>`;
  }
  return `
    <header><a href="#/" class="back">‹</a><h1>Uusi kierros</h1></header>
    <form id="round" class="card">
      <label>Kenttä <select name="course" id="courseSelect">${courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <label>Tii <select name="tee" id="teeSelect"></select></label>
      <label>Päivä <input type="date" name="date" value="${today()}" required></label>
      <h2>Pelaajat</h2>
      <div id="players">${playerRow(0)}</div>
      <button type="button" class="btn" data-action="add-player">+ Lisää pelaaja</button>
      <button class="btn primary">Aloita kierros</button>
    </form>`;
}

function playerRow(i) {
  return `<div class="row player">
    <input name="pname${i}" placeholder="Nimi" required>
    <input name="phcp${i}" type="number" step="0.1" inputmode="decimal" placeholder="Tasoitus" required>
  </div>`;
}

function teeOptions(course) {
  if (!course?.tees.length) return '<option value="-1">Ei tiitietoja</option>';
  return course.tees.map((t, i) => `<option value="${i}">${esc(t.name || `Tii ${i + 1}`)}${t.slope ? ` (CR ${t.rating}, slope ${t.slope})` : ''}</option>`).join('');
}

async function loadCourseList() {
  const out = document.getElementById('results');
  if (!out) return;
  const country = current.country || 'FI';
  out.innerHTML = '<p class="muted">Ladataan kenttiä…</p>';
  try {
    current.courseList = await listCourses(country);
    if (current.country === country) showResults();
  } catch (err) {
    out.innerHTML = `<p class="error">${esc(err.message)}</p><button type="button" class="btn" data-action="retry-list">Yritä uudelleen</button>`;
  }
}

function showResults() {
  const out = document.getElementById('results');
  const input = document.getElementById('courseFilter');
  if (!out || !current.courseList) return;
  const all = filterCourses(current.courseList, input?.value || '');
  current.results = all.slice(0, 50);
  out.innerHTML = current.results.length
    ? `<ul class="list">${current.results.map((r, i) => `<li><button type="button" class="link" data-action="import" data-i="${i}">${esc(r.name)}${r.city ? ` <span class="muted small">${esc(r.city)}</span>` : ''}</button></li>`).join('')}</ul>
       ${all.length > 50 ? `<p class="muted small">${all.length} kenttää, tarkenna hakua.</p>` : ''}`
    : '<p class="muted">Ei osumia. Voit lisätä kentän käsin.</p>';
}

function roundContext(round) {
  const course = store.course(round.courseId);
  if (!course) return null;
  const tee = course.tees[round.tee] || {};
  return { course, tee, summaries: round.players.map(p => playerSummary(p, course.holes, tee)) };
}

function holeView(round, idx) {
  const ctx = roundContext(round);
  if (!ctx) return `<p>Kenttä on poistettu.</p><a class="btn" href="#/">Etusivulle</a>`;
  const { course, summaries } = ctx;
  const hole = course.holes[idx];
  const last = idx === course.holes.length - 1;
  return `
    <header><a href="#/" class="back">‹</a><h1>${esc(course.name)}</h1></header>
    <div class="hole-head">
      <div class="big">Väylä ${hole.number}</div>
      <div class="muted">Par ${hole.par}${hole.handicap ? ` · Hcp ${hole.handicap}` : ''}</div>
    </div>
    ${round.players.map((p, pi) => {
      const s = p.scores[idx];
      const recv = summaries[pi].received[idx];
      return `<div class="card player-score">
        <div>
          <strong>${esc(p.name)}</strong>
          <div class="muted small">${recv ? `${recv > 0 ? '+' : ''}${recv} lyöntiä · ` : ''}${summaries[pi].points} p</div>
        </div>
        <div class="stepper">
          <button class="btn round" data-action="dec" data-p="${pi}">−</button>
          <span class="score">${s ?? '–'}</span>
          <button class="btn round" data-action="inc" data-p="${pi}">+</button>
        </div>
      </div>`;
    }).join('')}
    <div class="actions nav">
      <button class="btn" data-action="prev" ${idx === 0 ? 'disabled' : ''}>‹ Edellinen</button>
      ${last ? `<a class="btn primary" href="#/round/${round.id}/card">Tuloskortti</a>`
             : `<button class="btn primary" data-action="next">Seuraava ›</button>`}
    </div>
    <div class="dots">${course.holes.map((h, i) => `<button class="dot ${i === idx ? 'on' : ''} ${round.players.every(p => p.scores[i] != null) ? 'done' : ''}" data-action="goto" data-i="${i}">${h.number}</button>`).join('')}</div>
    <a class="btn" href="#/round/${round.id}/card">Näytä tuloskortti</a>`;
}

function cardView(round) {
  const ctx = roundContext(round);
  if (!ctx) return `<p>Kenttä on poistettu.</p>`;
  const { course, tee, summaries } = ctx;
  return `
    <header><a href="#/round/${round.id}" class="back">‹</a><h1>Tuloskortti</h1></header>
    <p class="muted">${esc(course.name)} · ${fmtDate(round.date)}${tee.name ? ` · tii ${esc(tee.name)}` : ''}</p>
    <div class="scroll"><table class="card-table">
      <thead><tr><th>Väylä</th>${course.holes.map(h => `<th>${h.number}</th>`).join('')}<th>Yht.</th></tr>
      <tr class="muted"><td>Par</td>${course.holes.map(h => `<td>${h.par}</td>`).join('')}<td>${coursePar(course.holes)}</td></tr></thead>
      <tbody>${round.players.map((p, pi) => `
        <tr><th>${esc(p.name)}</th>${course.holes.map((h, i) => {
          const s = p.scores[i];
          const cls = s == null ? '' : s < h.par ? 'under' : s > h.par ? 'over' : '';
          return `<td class="${cls}">${s ?? ''}</td>`;
        }).join('')}<td><strong>${summaries[pi].gross}</strong></td></tr>`).join('')}
      </tbody>
    </table></div>
    <table class="summary">
      <thead><tr><th>Pelaaja</th><th>Pelitas.</th><th>Lyönnit</th><th>Netto</th><th>Pisteet</th></tr></thead>
      <tbody>${round.players
        .map((p, pi) => ({ p, s: summaries[pi] }))
        .sort((a, b) => b.s.points - a.s.points)
        .map(({ p, s }) => `<tr><td>${esc(p.name)}</td><td>${s.courseHcp}</td><td>${s.gross}</td><td>${s.net ?? '–'}</td><td><strong>${s.points}</strong></td></tr>`).join('')}
      </tbody>
    </table>
    ${!tee.slope ? '<p class="muted small">Tiille ei ole slopea ja CR:ää, joten pelitasoitus on arvio.</p>' : ''}
    <div class="actions">
      <a class="btn" href="#/round/${round.id}">Muokkaa tuloksia</a>
      <button class="btn danger" data-action="delete-round">Poista kierros</button>
    </div>`;
}

// ---------- Reititys ----------

let current = { country: 'FI' };

function render() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  current = { parts, country: current.country };
  const [a, b, c] = parts;
  if (a === 'courses') {
    current.country = current.country || 'FI';
    app.innerHTML = coursesView();
    loadCourseList();
  }
  else if (a === 'course') {
    const course = b === 'new'
      ? { id: newId(), name: '', country: 'FI', holes: emptyHoles(18), tees: [], source: 'manual' }
      : b === 'draft' && draftCourse ? draftCourse : store.course(b);
    if (!course) return go('#/courses');
    current.course = course;
    app.innerHTML = courseEditView(course);
  } else if (a === 'round' && b === 'new') {
    app.innerHTML = newRoundView();
    updateTees();
  } else if (a === 'round' && b) {
    const round = store.round(b);
    if (!round) return go('#/');
    current.round = round;
    if (c === 'card') app.innerHTML = cardView(round);
    else app.innerHTML = holeView(round, round.currentHole || 0);
  } else app.innerHTML = homeView();
}

function updateTees() {
  const sel = document.getElementById('courseSelect');
  if (sel) document.getElementById('teeSelect').innerHTML = teeOptions(store.course(sel.value));
}

// ---------- Tapahtumat ----------

app.addEventListener('change', e => {
  if (e.target.id === 'courseSelect') updateTees();
  if (e.target.name === 'country' && e.target.form?.id === 'search') {
    current.country = e.target.value;
    current.courseList = null;
    loadCourseList();
  }
  if (e.target.name === 'count' && current.course) {
    const course = readCourseForm(e.target.form);
    const n = Number(e.target.value);
    course.holes = n > course.holes.length
      ? [...course.holes, ...emptyHoles(n).slice(course.holes.length)]
      : course.holes.slice(0, n);
    current.course = course;
    app.innerHTML = courseEditView(course);
  }
});

function readCourseForm(form) {
  const f = new FormData(form);
  const course = { ...current.course, name: f.get('name').trim(), country: f.get('country') };
  course.holes = course.holes.map((h, i) => ({
    number: h.number,
    par: Number(f.get(`par${i}`)) || null,
    handicap: Number(f.get(`hcp${i}`)) || null,
  }));
  course.tees = [];
  for (let i = 0; f.has(`teeName${i}`); i++) {
    const t = { name: f.get(`teeName${i}`).trim(), rating: Number(f.get(`teeRating${i}`)) || null, slope: Number(f.get(`teeSlope${i}`)) || null };
    if (t.name || t.rating || t.slope) course.tees.push(t);
  }
  return course;
}

app.addEventListener('input', e => {
  if (e.target.id === 'courseFilter') showResults();
});

app.addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'course') {
    const course = readCourseForm(form);
    store.saveCourse(course);
    draftCourse = null;
    go('#/courses');
  }
  if (form.id === 'round') {
    const f = new FormData(form);
    const course = store.course(f.get('course'));
    const players = [];
    for (let i = 0; f.has(`pname${i}`); i++) {
      players.push({ name: f.get(`pname${i}`).trim(), hcp: Number(f.get(`phcp${i}`)), scores: course.holes.map(() => null) });
    }
    const round = { id: newId(), courseId: course.id, tee: Number(f.get('tee')), date: f.get('date'), players, currentHole: 0 };
    store.saveRound(round);
    go(`#/round/${round.id}`);
  }
});

app.addEventListener('click', async e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const round = current.round;

  if (action === 'import') {
    const r = current.results[Number(el.dataset.i)];
    el.textContent = `${r.name} – haetaan väyliä…`;
    try {
      const holes = await fetchHoles(r);
      draftCourse = {
        id: newId(), name: r.name, country: r.country, source: 'osm',
        osm: { type: r.osmType, id: r.osmId },
        holes: holes.length >= 9 ? holes : emptyHoles(18),
        tees: [],
      };
      go('#/course/draft');
    } catch (err) {
      el.textContent = `${r.name} – ${err.message}`;
    }
  }
  if (action === 'retry-list') loadCourseList();
  if (action === 'add-tee') {
    const box = document.getElementById('tees');
    box.insertAdjacentHTML('beforeend', teeRow({}, box.children.length));
  }
  if (action === 'add-player') {
    const box = document.getElementById('players');
    box.insertAdjacentHTML('beforeend', playerRow(box.children.length));
  }
  if (action === 'delete-course' && confirm('Poistetaanko kenttä?')) {
    store.deleteCourse(current.course.id);
    go('#/courses');
  }
  if (action === 'delete-round' && confirm('Poistetaanko kierros?')) {
    store.deleteRound(round.id);
    go('#/');
  }
  if (!round) return;
  const course = store.course(round.courseId);
  const idx = round.currentHole || 0;
  if (action === 'inc' || action === 'dec') {
    const p = round.players[Number(el.dataset.p)];
    const s = p.scores[idx];
    if (action === 'inc') p.scores[idx] = s == null ? course.holes[idx].par : s + 1;
    else p.scores[idx] = s == null ? course.holes[idx].par - 1 : s > 1 ? s - 1 : null;
  }
  if (action === 'next') round.currentHole = Math.min(idx + 1, course.holes.length - 1);
  if (action === 'prev') round.currentHole = Math.max(idx - 1, 0);
  if (action === 'goto') round.currentHole = Number(el.dataset.i);
  if (['inc', 'dec', 'next', 'prev', 'goto'].includes(action)) {
    store.saveRound(round);
    render();
  }
});

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
