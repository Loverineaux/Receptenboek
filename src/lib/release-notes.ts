export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.8.4',
    date: '13 april 2026',
    highlights: [
      'De inlogcontrole is versneld waardoor de app veel sneller opstart',
      'Recepten, beoordelingen en favorieten laden nu merkbaar sneller',
      'Zoeken op ingrediënten verwerkt alle zoekwoorden tegelijk',
    ],
  },
];
