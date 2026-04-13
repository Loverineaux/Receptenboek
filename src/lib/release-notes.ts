export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.8.5',
    date: '13 april 2026',
    highlights: [
      'De app laadt na inactiviteit veel sneller — geen onnodige wachttijd meer',
      'Receptdetails openen nu direct, ook als je profiel nog aan het laden is',
      'Het favorieten-icoontje en de teller laden sneller bij het openen van een recept',
      'Je profiel wordt niet meer dubbel opgehaald bij het vernieuwen van je sessie',
    ],
  },
];
