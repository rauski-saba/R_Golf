import { store, newId } from './storage.js';
import { COUNTRIES, listCourses, filterCourses, fetchHoles } from './osm.js';
import { coursePar, playerSummary, pointsSummary, holePoints, hasFairway } from './golf.js';
import { PRESET_COURSES } from './presets.js';
import { GAMES, getEntry, setEntry, playerEntries, playerScores, flights, migrateRound } from './round.js';
import { syncEnabled, syncAll, shareRound, joinRound, pendingCount } from './sync.js';

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
      ${syncEnabled() ? '<a class="btn" href="#/join">Liity kierrokseen</a>' : ''}
      <a class="btn" href="#/courses">Kentät</a>
    </div>
    <h2>Kierrokset</h2>
    ${rounds.length ? `<ul class="list">${rounds.map(r => `<li><a href="#/round/${r.id}">
        <strong>${esc(r.course?.name || 'Poistettu kenttä')}</strong>
        <span class="muted">${fmtDate(r.date)} · ${GAMES[r.game] || ''}${r.code ? ' · jaettu' : ''} · ${r.players.map(p => esc(p.name)).join(', ')}</span>
      </a></li>`).join('')}</ul>` : '<p class="muted">Ei vielä kierroksia.</p>'}`;
}

function joinView() {
  return `
    <header><a href="#/" class="back">‹</a><h1>Liity kierrokseen</h1></header>
    <form id="join" class="card" autocomplete="off">
      <label>Kierroksen koodi
        <input name="code" required maxlength="6" placeholder="esim. K7M4QX" autocapitalize="characters" autocorrect="off" spellcheck="false"
          style="text-transform:uppercase; letter-spacing:.15em; font-size:1.3rem">
      </label>
      <p class="muted small">Koodin saa kierroksen aloittajalta. Liittymiseen tarvitaan verkkoyhteys, sen jälkeen kirjaus toimii myös ilman.</p>
      <button class="btn primary">Liity</button>
      <p id="joinMsg" class="error"></p>
    </form>`;
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
      ${course.source === 'preset' ? `<p class="muted small">Valmiiksi syötetty kenttä. Tarkista tiedot paikallisesta tuloskortista.</p>` : ''}
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
      <label>Peli <select name="game" id="gameSelect">${Object.entries(GAMES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <p class="muted small" id="gameInfo">${GAME_INFO.points}</p>
      <label>Kenttä <select name="course" id="courseSelect">${courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
      <label>Tii <select name="tee" id="teeSelect"></select></label>
      <label>Päivä <input type="date" name="date" value="${today()}" required></label>
      <h2>Pelaajat</h2>
      <p class="muted small">Flight = samassa ryhmässä pelaavat. Kirjaaja voi näyttää vain oman flightinsa pelaajat.</p>
      <div id="players" class="game-points">${playerRow(0)}</div>
      <button type="button" class="btn" data-action="add-player">+ Lisää pelaaja</button>
      <button class="btn primary">Aloita kierros</button>
    </form>`;
}

const GAME_INFO = {
  points: 'Ei tasoituksia. Väyläosuma 1 p (ei par 3:lla), green (GIR) 1 p, hole in one 4 p, eagle 3 p, birdie 2 p, par 1 p.',
  stableford: 'Pistebogey tasoituksilla (WHS).',
};

function playerRow(i) {
  return `<div class="row player">
    <input name="pname${i}" placeholder="Nimi" required>
    <input name="phcp${i}" class="hcp" type="number" step="0.1" inputmode="decimal" placeholder="Tasoitus">
    <select name="pflight${i}" class="flight" aria-label="Flight">${[1, 2, 3, 4].map(n => `<option value="${n}">Flight ${n}</option>`).join('')}</select>
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
  const course = round.course;
  if (!course) return null;
  const tee = round.teeData || {};
  const n = course.holes.length;
  const summaries = round.players.map(p => round.game === 'points'
    ? pointsSummary(playerEntries(round, p.id, n), course.holes)
    : playerSummary({ hcp: p.hcp, scores: playerScores(round, p.id, n) }, course.holes, tee));
  return { course, tee, summaries };
}

// Kirjaajan valitsema flight muistetaan kierroskohtaisesti tässä puhelimessa.
const flightKey = id => `rgolf.flight.${id}`;
const myFlight = round => Number(localStorage.getItem(flightKey(round.id))) || 0;

function syncBar(round) {
  if (!syncEnabled()) return '';
  if (!round.code) {
    return `<div class="sync"><button class="btn" data-action="share">Jaa ryhmälle</button>
      <span class="muted small">Muut liittyvät koodilla ja näkevät tulokset.</span></div>`;
  }
  const pending = pendingCount(round);
  const status = !navigator.onLine
    ? `Ei yhteyttä${pending ? ` · ${pending} odottaa` : ''}`
    : pending ? 'Lähetetään…'
    : round.syncedAt ? `Synkronoitu ${new Date(round.syncedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}` : '';
  return `<div class="sync"><span>Koodi <strong class="code">${esc(round.code)}</strong></span>
    <span class="muted small ${!navigator.onLine ? 'offline' : ''}">${status}</span></div>`;
}

function holeView(round, idx) {
  const ctx = roundContext(round);
  if (!ctx) return `<p>Kentän tiedot puuttuvat.</p><a class="btn" href="#/">Etusivulle</a>`;
  const { course, summaries } = ctx;
  const hole = course.holes[idx];
  const last = idx === course.holes.length - 1;
  const points = round.game === 'points';
  const fl = flights(round);
  const mine = myFlight(round);
  const shown = round.players.map((p, pi) => ({ p, pi })).filter(({ p }) => !mine || (p.flight || 1) === mine);
  return `
    <header><a href="#/" class="back">‹</a><h1>${esc(course.name)}</h1></header>
    ${syncBar(round)}
    ${fl.length > 1 ? `<div class="flights">
      <button class="chip ${!mine ? 'on' : ''}" data-action="flight" data-f="0">Kaikki</button>
      ${fl.map(f => `<button class="chip ${mine === f ? 'on' : ''}" data-action="flight" data-f="${f}">Flight ${f}</button>`).join('')}
    </div>` : ''}
    <div class="hole-head">
      <div class="big">Väylä ${hole.number}</div>
      <div class="muted">Par ${hole.par}${hole.handicap ? ` · Hcp ${hole.handicap}` : ''}</div>
    </div>
    ${shown.map(({ p, pi }) => {
      const e = getEntry(round, p.id, idx) || {};
      const sum = summaries[pi];
      const info = points
        ? `${holePoints(e, hole.par)} p tältä · ${sum.points} p yht.`
        : (() => { const recv = sum.received[idx]; return `${recv ? `${recv > 0 ? '+' : ''}${recv} lyöntiä · ` : ''}${sum.points} p`; })();
      return `<div class="card player-score">
        <div class="player-top">
          <div>
            <strong>${esc(p.name)}</strong>
            <div class="muted small">${info}</div>
          </div>
          <div class="stepper">
            <button class="btn round" data-action="dec" data-p="${pi}" aria-label="Vähemmän">−</button>
            <span class="score">${e.s ?? '–'}</span>
            <button class="btn round" data-action="inc" data-p="${pi}" aria-label="Enemmän">+</button>
          </div>
        </div>
        ${points ? `<div class="toggles">
          ${hasFairway(hole.par) ? `<button class="toggle ${e.f ? 'on' : ''}" data-action="fw" data-p="${pi}" aria-pressed="${!!e.f}">Väylä</button>` : ''}
          <button class="toggle ${e.g ? 'on' : ''}" data-action="gir" data-p="${pi}" aria-pressed="${!!e.g}">Green (GIR)</button>
        </div>` : ''}
      </div>`;
    }).join('')}
    <div class="actions nav">
      <button class="btn" data-action="prev" ${idx === 0 ? 'disabled' : ''}>‹ Edellinen</button>
      ${last ? `<a class="btn primary" href="#/round/${round.id}/card">Tuloskortti</a>`
             : `<button class="btn primary" data-action="next">Seuraava ›</button>`}
    </div>
    <div class="dots">${course.holes.map((h, i) => `<button class="dot ${i === idx ? 'on' : ''} ${shown.every(({ p }) => getEntry(round, p.id, i)?.s != null) ? 'done' : ''}" data-action="goto" data-i="${i}">${h.number}</button>`).join('')}</div>
    <a class="btn" href="#/round/${round.id}/card">Näytä tuloskortti</a>`;
}

const toParText = n => n === 0 ? 'E' : n > 0 ? `+${n}` : `${n}`;

function cardView(round) {
  const ctx = roundContext(round);
  if (!ctx) return `<p>Kentän tiedot puuttuvat.</p>`;
  const { course, tee, summaries } = ctx;
  const points = round.game === 'points';
  const n = course.holes.length;
  const ranked = round.players.map((p, pi) => ({ p, s: summaries[pi] }))
    .sort((a, b) => points ? b.s.points - a.s.points || a.s.gross - b.s.gross : b.s.points - a.s.points);
  return `
    <header><a href="#/round/${round.id}" class="back">‹</a><h1>Tuloskortti</h1></header>
    ${syncBar(round)}
    <p class="muted">${esc(course.name)} · ${fmtDate(round.date)} · ${GAMES[round.game]}${tee.name ? ` · tii ${esc(tee.name)}` : ''}</p>
    ${points ? `
    <table class="summary">
      <thead><tr><th>Pelaaja</th><th>Points</th><th>Lyönnit</th><th>+/−</th><th>Väylät</th><th>GIR</th></tr></thead>
      <tbody>${ranked.map(({ p, s }) => `<tr><td>${esc(p.name)}</td><td><strong>${s.points}</strong></td><td>${s.gross || '–'}</td>
        <td>${s.played ? toParText(s.toPar) : '–'}</td><td>${s.fairways}/${s.fairwayHoles}</td><td>${s.greens}/${n}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}
    <div class="scroll"><table class="card-table">
      <thead><tr><th>Väylä</th>${course.holes.map(h => `<th>${h.number}</th>`).join('')}<th>Yht.</th></tr>
      <tr class="muted"><td>Par</td>${course.holes.map(h => `<td>${h.par}</td>`).join('')}<td>${coursePar(course.holes)}</td></tr></thead>
      <tbody>${round.players.map((p, pi) => {
        const es = playerEntries(round, p.id, n);
        return `<tr><th>${esc(p.name)}</th>${course.holes.map((h, i) => {
          const s = es[i]?.s;
          const cls = s == null ? '' : s < h.par ? 'under' : s > h.par ? 'over' : '';
          return `<td class="${cls}">${s ?? ''}</td>`;
        }).join('')}<td><strong>${summaries[pi].gross}</strong></td></tr>
        ${points ? `<tr class="pts"><td>pist.</td>${course.holes.map((h, i) => `<td>${es[i] ? holePoints(es[i], h.par) : ''}</td>`).join('')}<td>${summaries[pi].points}</td></tr>` : ''}`;
      }).join('')}
      </tbody>
    </table></div>
    ${!points ? `
    <table class="summary">
      <thead><tr><th>Pelaaja</th><th>Pelitas.</th><th>Lyönnit</th><th>Netto</th><th>Pisteet</th></tr></thead>
      <tbody>${ranked.map(({ p, s }) => `<tr><td>${esc(p.name)}</td><td>${s.courseHcp}</td><td>${s.gross}</td><td>${s.net ?? '–'}</td><td><strong>${s.points}</strong></td></tr>`).join('')}
      </tbody>
    </table>
    ${!tee.slope ? '<p class="muted small">Tiille ei ole slopea ja CR:ää, joten pelitasoitus on arvio.</p>' : ''}` : ''}
    <div class="actions">
      <a class="btn" href="#/round/${round.id}">Muokkaa tuloksia</a>
      <button class="btn danger" data-action="delete-round">${round.code ? 'Poista puhelimesta' : 'Poista kierros'}</button>
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
  } else if (a === 'join') {
    app.innerHTML = joinView();
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
  if (e.target.id === 'gameSelect') {
    document.getElementById('gameInfo').textContent = GAME_INFO[e.target.value];
    document.getElementById('players').className = `game-${e.target.value}`;
  }
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
    const game = f.get('game');
    const players = [];
    for (let i = 0; f.has(`pname${i}`); i++) {
      const hcp = f.get(`phcp${i}`);
      players.push({ id: `p${i + 1}`, name: f.get(`pname${i}`).trim(), hcp: hcp === '' ? null : Number(hcp), flight: Number(f.get(`pflight${i}`)) || 1 });
    }
    if (game === 'stableford' && players.some(p => p.hcp == null)) {
      alert('Pistebogeyssa jokaiselle pelaajalle tarvitaan tasoitus.');
      return;
    }
    const round = {
      id: newId(), game, date: f.get('date'), players, entries: {}, currentHole: 0, t: Date.now(),
      course: { id: course.id, name: course.name, country: course.country, holes: course.holes },
      teeData: course.tees[Number(f.get('tee'))] || null,
    };
    store.saveRound(round);
    go(`#/round/${round.id}`);
  }
  if (form.id === 'join') {
    const msg = document.getElementById('joinMsg');
    const btn = form.querySelector('button');
    btn.disabled = true; msg.textContent = '';
    try {
      const round = await joinRound(new FormData(form).get('code'));
      go(`#/round/${round.id}`);
    } catch (err) {
      msg.textContent = navigator.onLine ? err.message : 'Liittymiseen tarvitaan verkkoyhteys.';
      btn.disabled = false;
    }
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
  const course = round.course;
  const idx = round.currentHole || 0;
  const pi = Number(el.dataset.p);
  const p = round.players[pi];
  if (action === 'share') {
    el.disabled = true;
    shareRound(round).catch(() => {}).finally(render);
    return;
  }
  if (action === 'flight') {
    localStorage.setItem(`rgolf.flight.${round.id}`, el.dataset.f);
    render();
    return;
  }
  const edit = ['inc', 'dec', 'fw', 'gir'].includes(action);
  if (edit) {
    const e = getEntry(round, p.id, idx) || {};
    const par = course.holes[idx].par;
    if (action === 'inc') setEntry(round, p.id, idx, { s: e.s == null ? par : e.s + 1 });
    if (action === 'dec') setEntry(round, p.id, idx, { s: e.s == null ? par - 1 : e.s > 1 ? e.s - 1 : null });
    if (action === 'fw') setEntry(round, p.id, idx, { f: !e.f });
    if (action === 'gir') setEntry(round, p.id, idx, { g: !e.g });
  }
  if (action === 'next') round.currentHole = Math.min(idx + 1, course.holes.length - 1);
  if (action === 'prev') round.currentHole = Math.max(idx - 1, 0);
  if (action === 'goto') round.currentHole = Number(el.dataset.i);
  if (edit || ['next', 'prev', 'goto'].includes(action)) {
    store.saveRound(round);
    render();
    if (edit) scheduleSync();
  }
});

// ---------- Synkronointi ----------

let syncTimer = null;
function scheduleSync(delay = 1500) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(runSync, delay);
}

async function runSync() {
  if (!syncEnabled()) return;
  const changed = await syncAll().catch(() => false);
  // Kierrosnäkymä päivitetään aina (muiden tulokset ja synkronoinnin tila).
  // Lomakkeita ei piirretä uudelleen, ettei kesken oleva syöttö katoa.
  const [a, b] = current.parts || [];
  if ((a === 'round' && b && b !== 'new') || (!a && changed)) render();
}

if (syncEnabled()) {
  window.addEventListener('online', () => scheduleSync(0));
  window.addEventListener('offline', () => render());
  // Jaetulla kierroksella haetaan muiden tulokset 15 sekunnin välein, kun sovellus on auki.
  setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) runSync(); }, 15000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleSync(0); });
}

window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
store.seedPresets(PRESET_COURSES);
store.migrateRounds(r => migrateRound(r, id => store.course(id)));
render();
scheduleSync(0);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
