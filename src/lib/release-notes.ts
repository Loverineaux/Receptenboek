export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.16.4',
    date: '23 april 2026',
    highlights: [
      'Receptenlijst laadt nu fors sneller bij koude start: de zwaarste query gaat via onze warm gehouden server in plaats van direct vanaf je telefoon',
      'Ingrediëntzoek, filters en sortering blijven onveranderd werken',
    ],
  },
  {
    version: '1.16.3',
    date: '23 april 2026',
    highlights: [
      'App opent sneller na inactiviteit: de trage verificatie bij de server draait nu in de achtergrond in plaats van te wachten',
      'Verbinding met onze database wordt alvast warm gehouden zodra je de app opent',
    ],
  },
];
