export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.16.6',
    date: '23 april 2026',
    highlights: [
      'Als het laden van recepten mislukt of te lang duurt, zie je nu een duidelijke foutmelding in plaats van een eindeloos ladend scherm',
      'Nieuwe meetpunten zodat we precies zien welk deel van de fetch faalt als er iets stuk gaat',
    ],
  },
  {
    version: '1.16.5',
    date: '23 april 2026',
    highlights: [
      'Recepten-lijst haalt tags nu via een aparte snelle query op in plaats van gecombineerd, wat veel latency kan schelen',
    ],
  },
];
