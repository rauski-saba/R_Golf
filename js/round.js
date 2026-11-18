// Kierroksen tietomalli. Jokainen pelaajan väylämerkintä on oma tietueensa aikaleimalla,
// jotta usean puhelimen muutokset voidaan yhdistää: uusin muutos voittaa.
// round.entries["<pelaajaId>:<väyläIndeksi>"] = { s: lyönnit, f: väyläosuma, g: green (GIR), t: aika, d: lähettämättä }

export const GAMES = { points: 'Points', stableford: 'Pistebogey' };

export const entryKey = (playerId, hole) => `${playerId}:${hole}`;

export function getEntry(round, playerId, hole) {
  return round.entries?.[entryKey(playerId, hole)] || null;
}

export function setEntry(round, playerId, hole, patch, now = Date.now()) {
  round.entries ||= {};
  const key = entryKey(playerId, hole);
  const prev = round.entries[key] || { s: null, f: false, g: false };
  // Aikaleima kasvaa aina, vaikka puhelimen kello olisi jäljessä edellisestä muutoksesta.
  const t = Math.max(now, (prev.t || 0) + 1);
  round.entries[key] = { ...prev, ...patch, t, d: true };
  return round.entries[key];
}

export function playerEntries(round, playerId, holeCount) {
  return Array.from({ length: holeCount }, (_, i) => getEntry(round, playerId, i));
}

export function playerScores(round, playerId, holeCount) {
  return playerEntries(round, playerId, holeCount).map(e => e?.s ?? null);
}

export const flights = round => [...new Set(round.players.map(p => p.flight || 1))].sort((a, b) => a - b);

// Vanhan muodon kierros (pelaajilla scores-taulukko, kenttä viittauksena) uuteen muotoon.
export function migrateRound(round, findCourse) {
  if (!round.course && round.courseId) {
    const c = findCourse(round.courseId);
    if (c) round.course = { id: c.id, name: c.name, country: c.country, holes: c.holes };
    if (c && !round.teeData) round.teeData = c.tees?.[round.tee] || null;
  }
  round.game ||= 'stableford';
  round.entries ||= {};
  round.players = round.players.map((p, i) => {
    const id = p.id || `p${i + 1}`;
    (p.scores || []).forEach((s, h) => {
      if (s != null && !round.entries[entryKey(id, h)]) round.entries[entryKey(id, h)] = { s, f: false, g: false, t: 0 };
    });
    const { scores, ...rest } = p;
    return { ...rest, id, flight: p.flight || 1 };
  });
  return round;
}
