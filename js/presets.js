// Valmiiksi syötetyt kentät, jotta ne ovat käytössä ilman OpenStreetMap-hakua ja verkkoyhteyttä.
// Lähde: Hole19-tuloskortit (väylät, par, väylähcp) ja tiitiedot (CR, slope). Tarkista paikan päällä.

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
];
