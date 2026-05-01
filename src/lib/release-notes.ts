export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.4',
    date: '1 mei 2026',
    highlights: [
      'Admin → Onderhoud → "Ingrediënten herstellen" toont nu per rij wat de AI heeft besloten en welke wijziging is doorgevoerd, handig om te controleren waarom een specifieke rij wel/niet werd gesplitst',
    ],
  },
  {
    version: '1.18.3',
    date: '1 mei 2026',
    highlights: [
      'Tijdelijke uitgebreide logging op de "Ingrediënten herstellen"-knop, zodat we precies zien waarom een specifieke rij niet wordt gesplitst',
    ],
  },
];
