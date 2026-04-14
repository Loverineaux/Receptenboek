export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.12.1',
    date: '14 april 2026',
    highlights: [
      'Gedeelde receptlinks tonen nu de foto en titel van het recept in WhatsApp, iMessage en andere apps',
      'Wanneer iemand op een gedeelde link klikt en niet is ingelogd, wordt diegene eerst naar het inlogscherm gestuurd en daarna automatisch doorverwezen naar het recept',
      'Je wordt niet meer onterecht uitgelogd bij een trage verbinding',
    ],
  },
  {
    version: '1.10.1',
    date: '14 april 2026',
    highlights: [
      'De app is nu alleen toegankelijk voor ingelogde gebruikers — bezoekers zonder account worden doorgestuurd naar het inlogscherm',
      'Bij een recept onthouden we nu op welk tabblad je zat en hoeveel porties je had ingesteld, ook als je even wegschakelt naar een andere app',
      'Er is een subtiele laadbalk bovenaan zichtbaar bij het wisselen tussen pagina\'s',
    ],
  },
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
];
