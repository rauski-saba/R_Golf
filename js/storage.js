// Tallennus selaimen localStorageen. Jakaminen kavereille tulee seuraavassa vaiheessa.

const KEY = 'rgolf.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { courses: [], rounds: [] };
  } catch {
    return { courses: [], rounds: [] };
  }
}

function save(db) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const store = {
  courses: () => load().courses,
  course: id => load().courses.find(c => c.id === id),
  saveCourse(course) {
    const db = load();
    const i = db.courses.findIndex(c => c.id === course.id);
    if (i >= 0) db.courses[i] = course; else db.courses.push(course);
    save(db);
  },
  deleteCourse(id) {
    const db = load();
    db.courses = db.courses.filter(c => c.id !== id);
    save(db);
  },
  rounds: () => load().rounds.sort((a, b) => b.date.localeCompare(a.date)),
  round: id => load().rounds.find(r => r.id === id),
  saveRound(round) {
    const db = load();
    const i = db.rounds.findIndex(r => r.id === round.id);
    if (i >= 0) db.rounds[i] = round; else db.rounds.push(round);
    save(db);
  },
  deleteRound(id) {
    const db = load();
    db.rounds = db.rounds.filter(r => r.id !== id);
    save(db);
  },
  // Muuntaa vanhat kierrokset nykyiseen muotoon.
  migrateRounds(fn) {
    const db = load();
    if (!db.rounds.some(r => !r.entries || !r.course)) return;
    db.rounds = db.rounds.map(r => (r.entries && r.course ? r : fn(r)));
    save(db);
  },
  // Lisää valmiit kentät kerran. Jos käyttäjä poistaa tai muokkaa kenttää, sitä ei palauteta.
  seedPresets(presets) {
    const SEEDED = 'rgolf.presets';
    let seeded;
    try { seeded = JSON.parse(localStorage.getItem(SEEDED)) || []; } catch { seeded = []; }
    const db = load();
    let changed = false;
    for (const c of presets) {
      if (seeded.includes(c.id)) continue;
      if (!db.courses.some(x => x.id === c.id)) { db.courses.push(structuredClone(c)); changed = true; }
      seeded.push(c.id);
    }
    if (changed) save(db);
    localStorage.setItem(SEEDED, JSON.stringify(seeded));
  },
};
