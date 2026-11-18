// Golfin laskentasäännöt (WHS-tasoitus ja pistebogey). Ei riippuvuuksia DOM:iin, jotta voidaan testata Nodella.

export function coursePar(holes) {
  return holes.reduce((sum, h) => sum + (Number(h.par) || 0), 0);
}

// Pelitasoitus (course handicap) WHS:n kaavalla: HI × slope / 113 + (CR − par).
// Yhdeksän reiän kentällä käytetään puolikasta tasoitusindeksiä.
// Jos slopea tai CR:ää ei tiedetä, käytetään oletuksia slope 113 ja CR = par.
export function courseHandicap(handicapIndex, holes, tee = {}) {
  const hi = Number(handicapIndex);
  if (!Number.isFinite(hi)) return 0;
  const par = coursePar(holes);
  const slope = Number(tee.slope) || 113;
  const cr = Number(tee.rating) || par;
  const index = holes.length <= 9 ? hi / 2 : hi;
  return Math.round(index * slope / 113 + (cr - par));
}

// Järjestää väylät vaikeusjärjestykseen väylähcp:n mukaan (1 = vaikein).
// Puuttuva väylähcp sijoitetaan loppuun väylänumeron mukaan.
function difficultyRank(holes) {
  const order = holes
    .map((h, i) => ({ i, si: Number(h.handicap) || Infinity }))
    .sort((a, b) => a.si - b.si || a.i - b.i);
  const rank = new Array(holes.length);
  order.forEach((o, r) => { rank[o.i] = r + 1; });
  return rank;
}

// Tasoituslyönnit väylittäin. Plus-tasoituksella lyönnit annetaan takaisin helpoimmilta väyliltä.
export function strokesReceived(courseHcp, holes) {
  const n = holes.length;
  if (!n) return [];
  const rank = difficultyRank(holes);
  const abs = Math.abs(courseHcp);
  const base = Math.floor(abs / n);
  const extra = abs % n;
  return rank.map(r => {
    if (courseHcp >= 0) return base + (r <= extra ? 1 : 0);
    const back = base + (r > n - extra ? 1 : 0);
    return back ? -back : 0;
  });
}

// Pistebogey-pisteet yhdeltä väylältä. Tyhjä tulos (nosto) = 0 pistettä.
export function stablefordPoints(strokes, par, received) {
  if (strokes == null || strokes === '' || !Number.isFinite(Number(strokes))) return 0;
  return Math.max(0, Number(par) + received - Number(strokes) + 2);
}

// Pelaajan yhteenveto kierrokselta.
export function playerSummary(player, holes, tee) {
  const ch = courseHandicap(player.hcp, holes, tee);
  const received = strokesReceived(ch, holes);
  let gross = 0, points = 0, played = 0, complete = true;
  holes.forEach((h, i) => {
    const s = player.scores?.[i];
    if (s == null || s === '') { complete = false; return; }
    gross += Number(s);
    played += 1;
    points += stablefordPoints(s, h.par, received[i]);
  });
  return { courseHcp: ch, received, gross, net: complete ? gross - ch : null, points, played, complete };
}

// ---------- Points-peli ----------
// Ei tasoituksia. Väyläosuma 1 p (ei par 3 -väylillä), GIR 1 p, ja tuloksesta:
// hole in one, albatrossi (tai parempi), eagle, birdie ja par.
export const POINTS = { fairway: 1, green: 1, holeInOne: 5, albatross: 4, eagle: 3, birdie: 2, par: 1 };

export const hasFairway = par => Number(par) > 3;

// Tuloksen pisteet yhdeltä väylältä.
export function resultPoints(strokes, par) {
  const s = Number(strokes);
  if (strokes == null || strokes === '' || !Number.isFinite(s) || s < 1) return 0;
  if (s === 1) return POINTS.holeInOne;
  const diff = s - Number(par);
  if (diff <= -3) return POINTS.albatross;
  if (diff === -2) return POINTS.eagle;
  if (diff === -1) return POINTS.birdie;
  if (diff === 0) return POINTS.par;
  return 0;
}

// Väylän kokonaispisteet. entry = { s: lyönnit, f: väyläosuma, g: green (GIR) }.
export function holePoints(entry, par) {
  if (!entry) return 0;
  return (entry.f && hasFairway(par) ? POINTS.fairway : 0)
    + (entry.g ? POINTS.green : 0)
    + resultPoints(entry.s, par);
}

// Pelaajan yhteenveto Points-pelistä. entries = väylittäinen taulukko merkinnöistä.
export function pointsSummary(entries, holes) {
  let points = 0, gross = 0, parPlayed = 0, played = 0, fairways = 0, fairwayHoles = 0, greens = 0;
  holes.forEach((h, i) => {
    const e = entries[i];
    points += holePoints(e, h.par);
    if (e?.s != null) { gross += Number(e.s); parPlayed += Number(h.par); played += 1; }
    if (hasFairway(h.par)) { fairwayHoles += 1; if (e?.f) fairways += 1; }
    if (e?.g) greens += 1;
  });
  return { points, gross, toPar: gross - parPlayed, played, complete: played === holes.length, fairways, fairwayHoles, greens };
}
