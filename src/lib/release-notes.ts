export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.8',
    date: '22 april 2026',
    highlights: [
      'Ruimere tijdslimiet voor recept-extractie (tot 2 minuten) zodat de AI altijd alle hoeveelheden kan vinden zonder tussentijdse timeouts',
      'Volledige zoekdiepte en preciezere structurering behouden — kwaliteit blijft op niveau van het origineel',
    ],
  },
  {
    version: '1.15.7',
    date: '22 april 2026',
    highlights: [
      'Hoeveelheden van ingrediënten worden weer compleet overgenomen — de AI die het recept structureert is teruggezet naar de preciezere versie',
      'Dankzij de parallelle zoekacties blijft de totale import-tijd ruim binnen de 60 seconden',
    ],
  },
];
