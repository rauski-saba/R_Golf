import { test } from 'node:test';
import assert from 'node:assert/strict';
import { courseHandicap, strokesReceived, stablefordPoints, playerSummary } from '../js/golf.js';
import { normalizeHoles } from '../js/osm.js';

const holes18 = Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, handicap: i + 1 })); // par 72

test('pelitasoitus WHS-kaavalla', () => {
  // 18.4 × 125 / 113 + (71.2 − 72) = 19.55 → 20
  assert.equal(courseHandicap(18.4, holes18, { slope: 125, rating: 71.2 }), 20);
  assert.equal(courseHandicap(0, holes18, { slope: 113, rating: 72 }), 0);
  // Ilman tiitietoja käytetään tasoitusindeksiä sellaisenaan
  assert.equal(courseHandicap(12.6, holes18, {}), 13);
});

test('yhdeksän reiän kentällä puolikas indeksi', () => {
  const holes9 = holes18.slice(0, 9); // par 36
  assert.equal(courseHandicap(20, holes9, { slope: 113, rating: 36 }), 10);
});

test('tasoituslyönnit jaetaan väylähcp:n mukaan', () => {
  const r = strokesReceived(20, holes18);
  assert.equal(r[0], 2);  // hcp 1
  assert.equal(r[1], 2);  // hcp 2
  assert.equal(r[2], 1);  // hcp 3
  assert.equal(r.reduce((a, b) => a + b, 0), 20);
});

test('plus-tasoitus antaa lyöntejä takaisin helpoimmilta väyliltä', () => {
  const r = strokesReceived(-2, holes18);
  assert.equal(r[17], -1);
  assert.equal(r[16], -1);
  assert.equal(r[15], 0);
});

test('pistebogey', () => {
  assert.equal(stablefordPoints(4, 4, 0), 2);  // par
  assert.equal(stablefordPoints(5, 4, 1), 2);  // nettopar
  assert.equal(stablefordPoints(3, 4, 1), 4);  // nettoeagle
  assert.equal(stablefordPoints(8, 4, 0), 0);  // ei negatiivisia
  assert.equal(stablefordPoints(null, 4, 0), 0); // nosto
});

test('pelaajan yhteenveto', () => {
  const p = { hcp: 18, scores: holes18.map(() => 5) };
  const s = playerSummary(p, holes18, { slope: 113, rating: 72 });
  assert.equal(s.courseHcp, 18);
  assert.equal(s.gross, 90);
  assert.equal(s.net, 72);
  assert.equal(s.points, 36);
  assert.equal(s.complete, true);
});

test('keskeneräinen kierros', () => {
  const p = { hcp: 18, scores: [5, 5, null, ...Array(15).fill(null)] };
  const s = playerSummary(p, holes18, {});
  assert.equal(s.played, 2);
  assert.equal(s.net, null);
  assert.equal(s.points, 4);
});

test('OSM-väylien normalisointi', () => {
  const holes = normalizeHoles([
    { ref: '2', par: '3', handicap: '17' },
    { ref: '1', par: '4', handicap: '5' },
    { ref: '1', par: '5' },          // 27-reikäisen kentän toinen ykkönen ohitetaan
    { name: 'ilman numeroa' },
  ]);
  assert.deepEqual(holes, [
    { number: 1, par: 4, handicap: 5 },
    { number: 2, par: 3, handicap: 17 },
  ]);
});

test('kenttähaku sanojen alkujen perusteella', async () => {
  const { filterCourses, normalize } = await import('../js/osm.js');
  const list = [
    { name: 'Tuusulan Golfklubi', search: normalize('Tuusulan Golfklubi Tuusula') },
    { name: 'Talma Golf', search: normalize('Talma Golf Sipoo') },
    { name: 'Gloria Golf', search: normalize('Gloria Golf Belek') },
  ];
  assert.deepEqual(filterCourses(list, 'Tuusula Golf').map(c => c.name), ['Tuusulan Golfklubi']);
  assert.deepEqual(filterCourses(list, 'sipoo').map(c => c.name), ['Talma Golf']);
  assert.equal(filterCourses(list, '').length, 3);
  assert.equal(filterCourses(list, 'olf').length, 0);
});

import { PRESET_COURSES } from '../js/presets.js';
import { coursePar } from '../js/golf.js';

test('valmiiden kenttien tiedot ovat eheät', () => {
  const expectedPar = { 'preset-el-kantaoui-sea': 73, 'preset-el-kantaoui-panorama': 72 };
  for (const c of PRESET_COURSES) {
    assert.equal(c.holes.length, 18, c.name);
    assert.equal(coursePar(c.holes), expectedPar[c.id], c.name);
    // Väylähcp:t 1–18, jokainen kerran
    assert.deepEqual(c.holes.map(h => h.handicap).sort((a, b) => a - b), Array.from({ length: 18 }, (_, i) => i + 1), c.name);
    assert.ok(c.tees.every(t => t.rating && t.slope), c.name);
  }
});

import { resultPoints, holePoints, pointsSummary } from '../js/golf.js';

test('Points: tuloksen pisteet', () => {
  assert.equal(resultPoints(1, 3), 5);  // hole in one
  assert.equal(resultPoints(1, 4), 5);  // hole in one par 4:llä
  assert.equal(resultPoints(3, 5), 3);  // eagle
  assert.equal(resultPoints(2, 5), 4);  // albatrossi
  assert.equal(resultPoints(3, 4), 2);  // birdie
  assert.equal(resultPoints(4, 4), 1);  // par
  assert.equal(resultPoints(5, 4), 0);  // bogey
  assert.equal(resultPoints(null, 4), 0);
});

test('Points: par 3 -väylällä ei väyläpistettä', () => {
  assert.equal(holePoints({ s: 3, f: true, g: true }, 3), 2);   // GIR + par
  assert.equal(holePoints({ s: 4, f: true, g: true }, 4), 3);   // väylä + GIR + par
  assert.equal(holePoints({ s: 1, f: false, g: true }, 3), 6);  // HIO + GIR
  assert.equal(holePoints({ s: null, f: true, g: false }, 5), 1); // väylä merkitty, tulos puuttuu
});

test('Points: yhteenveto', () => {
  const holes = [{ par: 4 }, { par: 3 }, { par: 5 }];
  const s = pointsSummary([{ s: 4, f: true, g: true }, { s: 4, g: false }, { s: 4, f: true, g: true }], holes);
  assert.equal(s.points, 3 + 0 + 4);
  assert.equal(s.gross, 12);
  assert.equal(s.toPar, 0);
  assert.equal(s.fairways, 2);
  assert.equal(s.fairwayHoles, 2);
  assert.equal(s.greens, 2);
  assert.ok(s.complete);
});

import { setEntry, getEntry, migrateRound, playerScores } from '../js/round.js';

test('merkinnän aikaleima kasvaa ja merkintä on lähettämätön', () => {
  const r = { entries: {} };
  const a = setEntry(r, 'p1', 0, { s: 4 }, 1000);
  const b = setEntry(r, 'p1', 0, { f: true }, 900); // kello jäljessä
  assert.equal(a.t, 1000);
  assert.equal(b.t, 1001);
  assert.deepEqual(getEntry(r, 'p1', 0), { s: 4, f: true, g: false, t: 1001, d: true });
});

test('vanhan kierroksen muunnos', () => {
  const course = { id: 'c', name: 'K', holes: [{ par: 4 }, { par: 3 }], tees: [{ name: 'Kelt', rating: 70, slope: 120 }] };
  const r = migrateRound({ id: 'r', courseId: 'c', tee: 0, players: [{ name: 'A', hcp: 10, scores: [5, null] }] }, () => course);
  assert.equal(r.game, 'stableford');
  assert.equal(r.course.name, 'K');
  assert.equal(r.teeData.slope, 120);
  assert.equal(r.players[0].id, 'p1');
  assert.deepEqual(playerScores(r, 'p1', 2), [5, null]);
});
