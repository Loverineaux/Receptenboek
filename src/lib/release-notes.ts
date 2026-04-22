export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.5',
    date: '22 april 2026',
    highlights: [
      'Ingrediënten met hoeveelheden worden weer betrouwbaar gevonden — de zoekactie heeft voldoende ruimte om alle maten te vinden',
      'Snelheidswinst uit de parallelle zoekacties blijft behouden, dus de extractie blijft binnen 30-40 seconden',
    ],
  },
  {
    version: '1.15.4',
    date: '22 april 2026',
    highlights: [
      'De twee zoekacties voor receptgegevens en ingrediënten draaien nu tegelijk in plaats van na elkaar — bespaart 10-15 seconden per import',
      'Main zoekactie doet nu maximaal 2 vervolgsearches (was 3), extra versnelling',
    ],
  },
  {
    version: '1.15.3',
    date: '22 april 2026',
    highlights: [
      'Recept-extractie is flink sneller: je ziet het voorbeeld nu binnen 30-40 seconden in plaats van bijna een minuut',
      'De extra AI-zoekactie voor foto\'s is weggehaald — als er geen foto gevonden wordt, voeg je hem zelf toe via de "Foto toevoegen"-knop in het voorbeeld',
      'De originele zoekactie naar hoeveelheden bij ingrediënten blijft gewoon actief voor volledige recepten',
    ],
  },
];
