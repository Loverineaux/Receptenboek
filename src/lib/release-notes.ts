export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.3',
    date: '1 mei 2026',
    highlights: [
      'Tijdelijke uitgebreide logging op de "Ingrediënten herstellen"-knop, zodat we precies zien waarom een specifieke rij niet wordt gesplitst',
    ],
  },
  {
    version: '1.18.2',
    date: '23 april 2026',
    highlights: [
      'Ingrediënten-herstel begrijpt nu beide antwoordvormen van de AI, dus geen stille mislukkingen meer wanneer een rij niet gesplitst kon worden',
    ],
  },
];
