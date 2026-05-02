export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.9',
    date: '2 mei 2026',
    highlights: [
      'Foto\'s van een recept worden nu in de browser verkleind voordat ze naar de AI gaan — voorkomt dat grote telefoonfoto\'s door de AI-server worden geweigerd en versnelt de upload',
    ],
  },
  {
    version: '1.18.8',
    date: '2 mei 2026',
    highlights: [
      'AH-recepten importeren werkt weer correct: een verkeerde redirect-volg op canonieke URLs leidde tot een totaal ander recept (oa "macaroni met paprika-saus" werd "pasta ricotta met tomaatjes")',
    ],
  },
];
