export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.9',
    date: '22 april 2026',
    highlights: [
      'De recept-extractie is teruggezet naar de originele, beproefde versie — snel en betrouwbaar',
      'De "Foto toevoegen"-knop in het voorbeeld blijft beschikbaar: vind de AI geen foto, dan voeg je \'m zelf toe',
    ],
  },
  {
    version: '1.15.8',
    date: '22 april 2026',
    highlights: [
      'Ruimere tijdslimiet voor recept-extractie (tot 2 minuten) zodat de AI altijd alle hoeveelheden kan vinden zonder tussentijdse timeouts',
      'Volledige zoekdiepte en preciezere structurering behouden — kwaliteit blijft op niveau van het origineel',
    ],
  },
];
