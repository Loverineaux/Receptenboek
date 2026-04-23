export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.11',
    date: '23 april 2026',
    highlights: [
      'Label-scan werkt weer voor al bekende producten — de voedingswaarden van een nieuw gefotografeerd label worden nu toegevoegd aan het bestaande product in plaats van te proberen een duplicaat aan te maken',
    ],
  },
  {
    version: '1.15.10',
    date: '23 april 2026',
    highlights: [
      'Picnic-recepten worden weer volledig geïmporteerd — als de eerste poging maar een deel van het recept oplevert, wordt automatisch een grondiger zoekactie uitgevoerd',
    ],
  },
];
