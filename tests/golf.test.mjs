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
