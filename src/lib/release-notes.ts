export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.8.3',
    date: '13 april 2026',
    highlights: [
      'Recepten worden nu direct geladen zonder te wachten op het inloggen',
      'De wachttijd bij het openen van de receptenbibliotheek is hierdoor fors verminderd',
      'Beoordelingen en favorieten verschijnen kort na de receptkaarten',
    ],
  },
  {
    version: '1.8.2',
    date: '13 april 2026',
    highlights: [
      'Receptkaarten verschijnen nu direct met foto en titel — je hoeft niet meer te wachten op alle gegevens',
      'Beoordelingen, reacties en favorieten vullen zich op de achtergrond aan',
      'De laadtijd van de receptenbibliotheek is hierdoor flink verkort',
    ],
  },
  {
    version: '1.8.1',
    date: '13 april 2026',
    highlights: [
      'De receptenbibliotheek laadt nu aanzienlijk sneller door een lichtere database-query',
      'Beoordelingen, reacties en favorieten worden nu parallel opgehaald in plaats van na elkaar',
      'Zoeken op ingrediënten is sneller — alle zoekwoorden worden tegelijk verwerkt',
      'Geen vertraging meer doordat favorieten pas laden nadat de recepten klaar zijn',
    ],
  },
];
