export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.6',
    date: '1 mei 2026',
    highlights: [
      '"Ingrediënten herstellen" doorzoekt nu écht álle rijen via paginatie — de eerdere range-bump werd door de database server genegeerd, daarom werden ingrediënten verderop in de tabel niet gevonden',
    ],
  },
  {
    version: '1.18.5',
    date: '1 mei 2026',
    highlights: [
      '"Ingrediënten herstellen" doorzoekt nu álle ingrediënten in één keer (was beperkt tot de eerste 1000 rijen) — kapotte rijen verderop in de lijst worden weer gevonden',
    ],
  },
];
