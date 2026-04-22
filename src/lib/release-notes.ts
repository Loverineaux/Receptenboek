export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.7',
    date: '22 april 2026',
    highlights: [
      'Hoeveelheden van ingrediënten worden weer compleet overgenomen — de AI die het recept structureert is teruggezet naar de preciezere versie',
      'Dankzij de parallelle zoekacties blijft de totale import-tijd ruim binnen de 60 seconden',
    ],
  },
  {
    version: '1.15.6',
    date: '22 april 2026',
    highlights: [
      'Volledige zoekdiepte hersteld voor recept-extractie — Claude heeft weer ruim de tijd om alle ingrediënten met hoeveelheden te vinden',
      'Dankzij de parallelle zoekacties uit v1.15.4 blijft de totale extractietijd binnen de 60 seconden',
    ],
  },
];
