// Valmiiksi syötetyt kentät, jotta ne ovat käytössä ilman OpenStreetMap-hakua ja verkkoyhteyttä.
// Lähde: Hole19-, Golfpass- ja AllSquare-tuloskortit (väylät, par, väylähcp) ja tiitiedot (CR, slope). Tarkista paikan päällä.

const holes = (pars, hcps) => pars.map((par, i) => ({ number: i + 1, par, handicap: hcps[i] }));

export const PRESET_COURSES = [
  {
    id: 'preset-el-kantaoui-sea',
    name: 'El Kantaoui – Sea Course',
    country: 'TN',
    source: 'preset',
    holes: holes(
      [5, 4, 4, 3, 4, 4, 5, 4, 4, 4, 5, 4, 3, 4, 5, 3, 4, 4],
      [10, 18, 16, 12, 14, 6, 8, 2, 4, 1, 9, 11, 15, 7, 5, 17, 13, 3],
    ),
    tees: [
      { name: 'Valkoinen', rating: 73, slope: 136 },
      { name: 'Keltainen', rating: 72, slope: 133 },
      { name: 'Sininen', rating: 72.8, slope: 132 },
      { name: 'Punainen', rating: 73.3, slope: 131 },
    ],
  },
  {
    id: 'preset-el-kantaoui-panorama',
    name: 'El Kantaoui – Panorama Course',
    country: 'TN',
    source: 'preset',
    holes: holes(
      [4, 4, 3, 4, 5, 3, 4, 4, 5, 4, 4, 3, 4, 4, 3, 5, 4, 5],
      [12, 8, 18, 4, 10, 14, 2, 6, 16, 17, 15, 7, 5, 11, 9, 3, 13, 1],
    ),
    tees: [
      { name: 'Valkoinen', rating: 72, slope: 136 },
      { name: 'Keltainen', rating: 72.3, slope: 134 },
      { name: 'Sininen', rating: 73.4, slope: 133 },
      { name: 'Punainen', rating: 74.2, slope: 132 },
    ],
  },
  {
    id: 'preset-linna-golf',
    name: 'Linna Golf',
    country: 'FI',
    source: 'preset',
    holes: holes(
      [4, 5, 3, 4, 4, 4, 3, 4, 4, 5, 4, 4, 3, 4, 5, 3, 5, 4],
      [5, 9, 15, 13, 11, 7, 17, 1, 3, 6, 14, 2, 16, 12, 8, 18, 4, 10],
    ),
    tees: [
      { name: 'Valkoinen', rating: 76.1, slope: 145 },
      { name: 'Keltainen', rating: 72.8, slope: 138 },
      { name: 'Sininen', rating: 71.3, slope: 135 },
      { name: 'Punainen', rating: 67.8, slope: 128 },
    ],
  },
  {
    id: 'preset-tuusulan-golfklubi',
    name: 'Tuusulan Golfklubi',
    country: 'FI',
    source: 'preset',
    holes: holes(
      [4, 3, 4, 5, 4, 4, 5, 5, 3, 4, 4, 3, 4, 3, 4, 5, 3, 4],
      [5, 13, 17, 3, 11, 9, 1, 7, 15, 6, 10, 14, 2, 18, 12, 16, 8, 4],
    ),
    // Kerhon virallinen tuloskortti (tgk.fi/kentta/tuloskortti), miesten CR/slope
    tees: [
      { name: 'Valkoinen', rating: 71.6, slope: 133 },
      { name: 'Keltainen', rating: 70.2, slope: 130 },
      { name: 'Sininen', rating: 67.9, slope: 125 },
      { name: 'Punainen', rating: 66.3, slope: 122 },
    ],
  },
];
