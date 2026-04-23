export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.16.1',
    date: '23 april 2026',
    highlights: [
      'Tijdelijke meetpunten toegevoegd om uit te vinden waar de app precies op wacht bij een koude start — deze diagnose wordt daarna weer weggehaald',
    ],
  },
  {
    version: '1.16.0',
    date: '23 april 2026',
    highlights: [
      'Bronnen worden automatisch samengevoegd: "eefkooktzo.nl" en "Eef Kookt Zo" zijn voortaan één en dezelfde bron in je filter',
      'Nieuwe knop "Bronnen samenvoegen" in Admin → Onderhoud om bestaande dubbele bronnen in één keer op te ruimen',
      'Werkt ook voor andere sites (picnic.app, ah.nl, jumbo.com, lekkerensimpel.com, ...)',
    ],
  },
];
