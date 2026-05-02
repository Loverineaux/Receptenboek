export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.7',
    date: '1 mei 2026',
    highlights: [
      'Foto\'s extraheren krijgt meer tijd (2 minuten i.p.v. 1) zodat complexere kookboekpagina\'s niet halverwege worden afgekapt',
      'Bij een mislukte foto-extractie krijg je nu een duidelijke uitleg in plaats van alleen "geen recept geëxtraheerd"',
    ],
  },
  {
    version: '1.18.6',
    date: '1 mei 2026',
    highlights: [
      '"Ingrediënten herstellen" doorzoekt nu écht álle rijen via paginatie — de eerdere range-bump werd door de database server genegeerd, daarom werden ingrediënten verderop in de tabel niet gevonden',
    ],
  },
];
