export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.16.5',
    date: '23 april 2026',
    highlights: [
      'Recepten-lijst haalt tags nu via een aparte snelle query op in plaats van gecombineerd, wat veel latency kan schelen',
    ],
  },
  {
    version: '1.16.4',
    date: '23 april 2026',
    highlights: [
      'Receptenlijst laadt nu fors sneller bij koude start: de zwaarste query gaat via onze warm gehouden server in plaats van direct vanaf je telefoon',
      'Ingrediëntzoek, filters en sortering blijven onveranderd werken',
    ],
  },
];
