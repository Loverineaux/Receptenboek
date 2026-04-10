export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.1.0',
    date: '10 april 2026',
    highlights: [
      'De AI-kookassistent werkt nu weer — antwoorden worden correct weergegeven tijdens het chatten',
      'In de kookmodus kun je nu spaties typen in het chatveld zonder dat de stap wisselt',
      'Nieuw: een subtiele donatie-mogelijkheid om de AI-kosten te helpen dekken, zichtbaar na het extraheren van recepten',
      'Op de Over-pagina vind je nu ook een donatie-sectie',
      'Een fout bij het verversen van de receptenpagina is opgelost',
    ],
  },
  {
    version: '1.0.1',
    date: '10 april 2026',
    highlights: [
      'Je profielfoto, naam en admin-badge verschijnen nu direct bij het openen van de app',
      'Geen lege avatar of "Gebruiker" meer te zien terwijl je profiel laadt',
      'De admin-check is sneller doordat de app geen extra opvraging meer doet',
    ],
  },
  {
    version: '1.0.0',
    date: '10 april 2026',
    highlights: [
      'PDF-bestanden met alleen afbeeldingen (zoals gescande recepten of screenshots) worden nu herkend via slimme beeldherkenning',
      'Als de server een PDF niet kan lezen, wordt automatisch een andere methode geprobeerd zodat het importeren niet meer mislukt',
      'Een fout waardoor de app soms niet laadde bij het openen of verversen is opgelost',
      'Meerdere recepten uit één PDF worden nu betrouwbaarder herkend en gesplitst',
    ],
  },
];
