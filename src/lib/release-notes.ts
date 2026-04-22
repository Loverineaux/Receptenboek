export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.6',
    date: '22 april 2026',
    highlights: [
      'Volledige zoekdiepte hersteld voor recept-extractie — Claude heeft weer ruim de tijd om alle ingrediënten met hoeveelheden te vinden',
      'Dankzij de parallelle zoekacties uit v1.15.4 blijft de totale extractietijd binnen de 60 seconden',
    ],
  },
  {
    version: '1.15.5',
    date: '22 april 2026',
    highlights: [
      'Ingrediënten met hoeveelheden worden weer betrouwbaar gevonden — de zoekactie heeft voldoende ruimte om alle maten te vinden',
      'Snelheidswinst uit de parallelle zoekacties blijft behouden, dus de extractie blijft binnen 30-40 seconden',
    ],
  },
];
