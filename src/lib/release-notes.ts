export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.13.0',
    date: '15 april 2026',
    highlights: [
      'Bij het toevoegen van een recept wordt nu gecontroleerd of het al bestaat — op basis van titel, bron en afbeelding',
      'Als er een mogelijk duplicaat wordt gevonden, zie je een preview met foto en titel van het bestaande recept',
      'Je kunt het bestaande recept bekijken of toch opslaan als het geen echt duplicaat is',
      'Admins kunnen nu via het dashboard alle duplicaten in de database opsporen en opruimen',
    ],
  },
  {
    version: '1.12.2',
    date: '15 april 2026',
    highlights: [
      'De app laadt nu veel sneller na een periode van inactiviteit — serverless functions worden warm gehouden',
      'Bij het laden van recepten zie je nu een duidelijke spinner in plaats van grijze blokken',
      'De interne communicatie tussen app en server is geoptimaliseerd voor snellere laadtijden',
    ],
  },
  {
    version: '1.12.1',
    date: '14 april 2026',
    highlights: [
      'Gedeelde receptlinks tonen nu de foto en titel van het recept in WhatsApp, iMessage en andere apps',
      'Wanneer iemand op een gedeelde link klikt en niet is ingelogd, wordt diegene eerst naar het inlogscherm gestuurd en daarna automatisch doorverwezen naar het recept',
      'Je wordt niet meer onterecht uitgelogd bij een trage verbinding',
    ],
  },
];
