export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.10.0',
    date: '14 april 2026',
    highlights: [
      'Nieuwe gebruikers krijgen een interactieve rondleiding door de app',
      'De rondleiding laat stap voor stap zien wat je kunt doen: recepten zoeken, beoordelen, favorieten opslaan, collecties maken en meer',
      'Je wordt meegenomen langs de receptdetailpagina, collecties, suggesties, ingrediënten en het aanmaken van nieuwe recepten',
      'De rondleiding is altijd te skippen en opnieuw te starten via Instellingen',
    ],
  },
  {
    version: '1.9.1',
    date: '14 april 2026',
    highlights: [
      'Pagina\'s laden sneller na een periode van inactiviteit',
      'Je inloggegevens worden nu slimmer gecontroleerd — minder wachttijd',
      'Een fout bij het gelijktijdig openen van de app in meerdere tabbladen is opgelost',
    ],
  },
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
];
