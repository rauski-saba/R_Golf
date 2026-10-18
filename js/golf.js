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
