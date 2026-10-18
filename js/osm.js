// Kenttätiedot OpenStreetMapista Overpass-rajapinnan kautta.
// Data © OpenStreetMap contributors, ODbL 1.0.

const ENDPOINT = 'https://overpass-api.de/api/interpreter';

export const COUNTRIES = [
  { code: 'FI', name: 'Suomi' },
  { code: 'TR', name: 'Turkki' },
  { code: 'TN', name: 'Tunisia' },
];

async function overpass(query) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: new URLSearchParams({ data: query }),
  });
  if (!res.ok) throw new Error(`OpenStreetMap-haku epäonnistui (${res.status})`);
  return (await res.json()).elements;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\"]/g, '\\$&');
}

export async function searchCourses(name, country) {
  const q = `[out:json][timeout:25];
area["ISO3166-1"="${country}"][admin_level=2]->.a;
nwr["leisure"="golf_course"]["name"~"${escapeRegex(name)}",i](area.a);
out center tags;`;
  const elements = await overpass(q);
  return elements.map(e => ({
    osmType: e.type,
    osmId: e.id,
    name: e.tags?.name || 'Nimetön kenttä',
    lat: e.lat ?? e.center?.lat,
    lon: e.lon ?? e.center?.lon,
    country,
  }));
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
