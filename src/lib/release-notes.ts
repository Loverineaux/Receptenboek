export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.8',
    date: '2 mei 2026',
    highlights: [
      'AH-recepten importeren werkt weer correct: een verkeerde redirect-volg op canonieke URLs leidde tot een totaal ander recept (oa "macaroni met paprika-saus" werd "pasta ricotta met tomaatjes")',
    ],
  },
  {
    version: '1.18.7',
    date: '1 mei 2026',
    highlights: [
      'Foto\'s extraheren krijgt meer tijd (2 minuten i.p.v. 1) zodat complexere kookboekpagina\'s niet halverwege worden afgekapt',
      'Bij een mislukte foto-extractie krijg je nu een duidelijke uitleg in plaats van alleen "geen recept geëxtraheerd"',
    ],
  },
];
