export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.9.0',
    date: '14 april 2026',
    highlights: [
      'De app draait nu op een nieuwere, snellere versie van het platform',
      'Pagina\'s laden merkbaar sneller tijdens het ontwikkelen en gebruik',
      'Een terugkerend probleem waarbij de app bleef hangen bij het laden is opgelost',
      'De favorietenteller telde soms dubbel — dit is verholpen',
      'Alle onderdelen zijn bijgewerkt naar de nieuwste versies',
    ],
  },
  {
    version: '1.8.7',
    date: '13 april 2026',
    highlights: [
      'Beoordelingen, reacties en favorieten laden nu rechtstreeks — zonder omweg via de server',
      'De wachttijd na inactiviteit is hierdoor fors korter geworden',
      'Een fout bij het lezen van je sessiegegevens is verholpen',
    ],
  },
  {
    version: '1.8.6',
    date: '13 april 2026',
    highlights: [
      'De app start nu veel sneller op na een periode van inactiviteit',
      'Je inloggegevens worden nog maar één keer gecontroleerd in plaats van meerdere keren tegelijk',
      'Je profiel en profielfoto laden sneller bij het openen van de app',
      'Minder belasting op de server bij het openen van de app',
    ],
  },
];
