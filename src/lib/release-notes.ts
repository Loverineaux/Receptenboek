export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.5',
    date: '1 mei 2026',
    highlights: [
      '"Ingrediënten herstellen" doorzoekt nu álle ingrediënten in één keer (was beperkt tot de eerste 1000 rijen) — kapotte rijen verderop in de lijst worden weer gevonden',
    ],
  },
  {
    version: '1.18.4',
    date: '1 mei 2026',
    highlights: [
      'Admin → Onderhoud → "Ingrediënten herstellen" toont nu per rij wat de AI heeft besloten en welke wijziging is doorgevoerd, handig om te controleren waarom een specifieke rij wel/niet werd gesplitst',
    ],
  },
];
