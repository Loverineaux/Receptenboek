export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
];
