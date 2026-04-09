export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.6.0',
    date: '9 april 2026',
    highlights: [
      'Recepten importeren via foto werkt nu veel beter — Instagram-screenshots, handgeschreven recepten en kookboekpagina\'s worden nauwkeuriger herkend',
      'Websites met Cloudflare-beveiliging (zoals eefkooktzo.nl) worden nu automatisch omzeild bij het importeren van recepten via URL',
      'Ingrediënten worden nu slimmer gesplitst in hoeveelheid, eenheid en naam (bijv. "handje basilicum" wordt correct herkend)',
      'De receptenbibliotheek laadt nu sneller door recepten in kleine groepen op te halen in plaats van alles tegelijk',
      'Alle TypeScript-fouten in de app zijn opgelost voor een stabielere ervaring',
    ],
  },
  {
    version: '0.5.1',
    date: '9 april 2026',
    highlights: [
      'Alle pagina\'s laden nu sneller — de app wacht niet meer op je profiel voordat de inhoud verschijnt',
      'De ingrediëntenpagina laadt nu in groepen met een "Laad meer" knop',
      'Admin tabbladen schakelen nu sneller door vooraf te laden',
      'Kleine verbeteringen in laadtijd door slimmere gegevensopvraging',
    ],
  },
  {
    version: '0.5.0',
    date: '9 april 2026',
    highlights: [
      'De app laadt nu veel sneller — pagina\'s en afbeeldingen worden geoptimaliseerd geladen',
      'Recepten worden in groepen van 24 getoond met een "Laad meer" knop voor een vlottere ervaring',
      'Zoeken werkt nu met meerdere woorden: "kip pasta" vindt alle recepten met beide woorden',
      'Zoekresultaten omvatten nu ook de beschrijving van recepten',
      'Nieuwe recepten en favorieten worden sneller bijgewerkt op je scherm',
    ],
  },
];
