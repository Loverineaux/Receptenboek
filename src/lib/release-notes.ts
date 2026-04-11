export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.2.0',
    date: '11 april 2026',
    highlights: [
      'Je kunt nu een afbeelding uploaden bij het aanmaken of bewerken van een recept',
      'Naast een URL plakken kun je ook direct een foto vanaf je telefoon of computer kiezen',
      'Tijdens het uploaden zie je een laadanimatie en daarna een preview van de afbeelding',
    ],
  },
  {
    version: '1.1.1',
    date: '11 april 2026',
    highlights: [
      'De app opent nu direct — recepten en afbeeldingen laden niet meer pas na je profiel',
      'Je profielfoto en naam verschijnen met een subtiele animatie zodra ze geladen zijn',
      'Geen lange wachttijd meer bij het openen van de app als de server even traag is',
    ],
  },
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
];
