// Kenttätiedot OpenStreetMapista Overpass-rajapinnan kautta.
// Data © OpenStreetMap contributors, ODbL 1.0.

// Useampi julkinen Overpass-palvelin; jos ensimmäinen on ruuhkainen, kokeillaan seuraavaa.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export const COUNTRIES = [
  { code: 'FI', name: 'Suomi' },
  { code: 'TR', name: 'Turkki' },
  { code: 'TN', name: 'Tunisia' },
];

async function overpass(query) {
  let lastError;
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body: new URLSearchParams({ data: query }) });
      if (!res.ok) throw new Error(`OpenStreetMap-haku epäonnistui (${res.status})`);
      return (await res.json()).elements;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError?.message?.startsWith('OpenStreetMap') ? lastError : new Error('OpenStreetMapiin ei saatu yhteyttä. Yritä hetken päästä uudelleen.');
}

const CACHE_DAYS = 7;

// Hakee maan kaikki golfkentät kerralla ja pitää ne välimuistissa viikon.
export async function listCourses(country) {
  const key = `rgolf.courses.${country}`;
  try {
    const cached = JSON.parse(localStorage.getItem(key));
    if (cached && Date.now() - cached.at < CACHE_DAYS * 864e5) return cached.list;
  } catch { /* välimuisti ei ole käytössä */ }

  const elements = await overpass(`[out:json][timeout:60];
area["ISO3166-1"="${country}"][admin_level=2]->.a;
nwr["leisure"="golf_course"](area.a);
out center tags qt;`);
  const list = elements
    .filter(e => e.tags?.name)
    .map(e => ({
      osmType: e.type,
      osmId: e.id,
      name: e.tags.name,
      city: e.tags['addr:city'] || '',
      search: normalize([e.tags.name, e.tags['name:fi'], e.tags['name:en'], e.tags.alt_name, e.tags.official_name,
        e.tags.operator, e.tags['addr:city']].filter(Boolean).join(' ')),
      lat: e.lat ?? e.center?.lat,
      lon: e.lon ?? e.center?.lon,
      country,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fi'));
  try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), list })); } catch { /* täynnä */ }
  return list;
}

export function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9ıçğşü ]+/g, ' ');
}

// Jokaisen hakusanan pitää olla jonkin nimen sanan alku, joten "Tuusula Golf" löytää "Tuusulan Golfklubin".
export function filterCourses(list, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter(c => {
    const nameWords = c.search.split(/\s+/);
    return words.every(w => nameWords.some(n => n.startsWith(w)));
  });
}

// Hakee kentän väylät. Ensin kentän alueen sisältä, ja jos kenttä on pelkkä piste, 1,5 km säteellä.
export async function fetchHoles(course) {
  let elements = [];
  if (course.osmType === 'way' || course.osmType === 'relation') {
    elements = await overpass(`[out:json][timeout:25];
${course.osmType}(${course.osmId});map_to_area->.c;
way["golf"="hole"](area.c);
out tags;`);
  }
  if (!elements.length && course.lat != null) {
    elements = await overpass(`[out:json][timeout:25];
way["golf"="hole"](around:1500,${course.lat},${course.lon});
out tags;`);
  }
  return normalizeHoles(elements.map(e => e.tags || {}));
}

// Muuntaa OSM-tagit väylälistaksi. 27-reikäisillä kentillä samaa numeroa voi olla useita;
// pidetään ensimmäinen, ja käyttäjä voi korjata tiedot ennen tallennusta.
export function normalizeHoles(tagList) {
  const byRef = new Map();
  for (const t of tagList) {
    const ref = parseInt(t.ref, 10);
    if (!Number.isFinite(ref) || byRef.has(ref)) continue;
    byRef.set(ref, {
      number: ref,
      par: parseInt(t.par, 10) || null,
      handicap: parseInt(t.handicap, 10) || null,
    });
  }
  return [...byRef.values()].sort((a, b) => a.number - b.number);
}
