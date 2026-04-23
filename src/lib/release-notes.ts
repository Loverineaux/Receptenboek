export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.16.3',
    date: '23 april 2026',
    highlights: [
      'App opent sneller na inactiviteit: de trage verificatie bij de server draait nu in de achtergrond in plaats van te wachten',
      'Verbinding met onze database wordt alvast warm gehouden zodra je de app opent',
    ],
  },
  {
    version: '1.16.2',
    date: '23 april 2026',
    highlights: [
      'App laadt nu in 1-2 seconden i.p.v. 6+ seconden na inactiviteit',
      'Middleware-check is versneld: leest de ingelogde gebruiker uit de cookie in plaats van elke keer Supabase te bellen',
      'Recepten-overzicht laadt sneller: het tellen van alle recepten is versneld van ~4s naar milliseconden',
    ],
  },
];
