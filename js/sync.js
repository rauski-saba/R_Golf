// Kierrosten synkronointi Supabaseen. Kaikki muutokset tallentuvat ensin puhelimeen,
// ja ne lähetetään palvelimelle aina kun yhteys on olemassa. Uusin muutos voittaa.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
import { store } from './storage.js';

export const syncEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function api(path, { method = 'GET', body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      // Vanha anon-avain (JWT) lähetetään myös Authorization-otsakkeessa; uusi publishable-avain riittää apikey-otsakkeessa.
      ...(SUPABASE_ANON_KEY.startsWith('eyJ') ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } : {}),
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Palvelinvirhe ${res.status}`);
  return res.status === 204 || method !== 'GET' && !prefer?.includes('return=representation') ? null : res.json();
}

// Koodissa ei ole helposti sekoittuvia merkkejä (0/O, 1/I).
export function newCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map(b => chars[b % chars.length]).join('');
}

function gameRow(round) {
  return { id: round.id, code: round.code, game: round.game, date: round.date,
    course: round.course, tee: round.teeData || null, players: round.players, t: round.t || 0 };
}

// Merkitsee kierroksen jaetuksi. Lähetys tapahtuu seuraavassa synkronoinnissa.
export function shareRound(round) {
  round.code = newCode();
  round.gameDirty = true;
  store.saveRound(round);
  return syncRound(round.id);
}

// Hakee kierroksen koodilla ja tallentaa sen puhelimeen.
export async function joinRound(code) {
  const rows = await api(`games?code=eq.${encodeURIComponent(code.trim().toUpperCase())}&select=*`);
  if (!rows?.length) throw new Error('Kierrosta ei löytynyt. Tarkista koodi.');
  const g = rows[0];
  const existing = store.round(g.id);
  const round = existing || { id: g.id, entries: {}, currentHole: 0 };
  Object.assign(round, { code: g.code, game: g.game, date: g.date, course: g.course, teeData: g.tee, players: g.players, t: g.t });
  store.saveRound(round);
  await syncRound(round.id);
  return round;
}

let running = null;

// Lähettää kierroksen muutokset ja hakee muiden muutokset.
export async function syncRound(id) {
  if (!syncEnabled() || !navigator.onLine) return false;
  const round = store.round(id);
  if (!round?.code) return false;

  // 1. Kierroksen perustiedot (pelaajat jne.)
  if (round.gameDirty) {
    await api('games?on_conflict=id', { method: 'POST', body: gameRow(round), prefer: 'resolution=merge-duplicates' });
  }
  // 2. Omat muutokset
  const dirty = Object.entries(round.entries || {}).filter(([, e]) => e.d);
  if (dirty.length) {
    await api('entries?on_conflict=game_id,player_id,hole', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: dirty.map(([key, e]) => {
        const [pid, hole] = key.split(':');
        return { game_id: round.id, player_id: pid, hole: Number(hole), strokes: e.s ?? null, fairway: !!e.f, green: !!e.g, t: e.t };
      }),
    });
  }
  // 3. Muiden muutokset
  const [games, rows] = await Promise.all([
    api(`games?id=eq.${encodeURIComponent(round.id)}&select=*`),
    api(`entries?game_id=eq.${encodeURIComponent(round.id)}&select=*`),
  ]);

  // Yhdistetään tuoreimpaan paikalliseen versioon: käyttäjä on voinut muokata sillä välin.
  const latest = store.round(id);
  if (latest.gameDirty && (latest.t || 0) === (round.t || 0)) latest.gameDirty = false;
  for (const [key, e] of dirty) {
    const now = latest.entries[key];
    if (now && now.t === e.t) delete now.d;
  }
  const g = games?.[0];
  if (g && (g.t || 0) > (latest.t || 0) && !latest.gameDirty) {
    Object.assign(latest, { players: g.players, date: g.date, course: g.course, teeData: g.tee, t: g.t });
  }
  let changed = false;
  for (const r of rows || []) {
    const key = `${r.player_id}:${r.hole}`;
    const local = latest.entries[key];
    if (!local || (!local.d && r.t > local.t)) {
      latest.entries[key] = { s: r.strokes, f: r.fairway, g: r.green, t: Number(r.t) };
      changed = true;
    }
  }
  latest.syncedAt = Date.now();
  store.saveRound(latest);
  return changed;
}

// Synkronoi kaikki jaetut kierrokset. Samanaikaisia ajoja on vain yksi.
export function syncAll() {
  if (running) return running;
  running = (async () => {
    let changed = false;
    for (const r of store.rounds().filter(r => r.code)) {
      try { changed = (await syncRound(r.id)) || changed; } catch { /* yritetään myöhemmin uudelleen */ }
    }
    return changed;
  })().finally(() => { running = null; });
  return running;
}

export function pendingCount(round) {
  return Object.values(round.entries || {}).filter(e => e.d).length + (round.gameDirty ? 1 : 0);
}
