export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.10',
    date: '23 april 2026',
    highlights: [
      'Picnic-recepten worden weer volledig geïmporteerd — als de eerste poging maar een deel van het recept oplevert, wordt automatisch een grondiger zoekactie uitgevoerd',
    ],
  },
  {
    version: '1.15.9',
    date: '22 april 2026',
    highlights: [
      'De recept-extractie is teruggezet naar de originele, beproefde versie — snel en betrouwbaar',
      'De "Foto toevoegen"-knop in het voorbeeld blijft beschikbaar: vind de AI geen foto, dan voeg je \'m zelf toe',
    ],
  },
];
