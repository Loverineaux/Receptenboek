export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
];
