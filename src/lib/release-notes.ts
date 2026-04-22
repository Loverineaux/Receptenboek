export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.14.11',
    date: '22 april 2026',
    highlights: [
      'Recept-foto wordt betrouwbaarder gevonden voor websites die onze server blokkeren — de zoekactie haalt nu expliciet de og:image van de bronpagina op',
    ],
  },
  {
    version: '1.14.10',
    date: '22 april 2026',
    highlights: [
      'Recept-foto wordt nu altijd gezocht van de bron zelf — nooit een willekeurige afbeelding van een andere website',
      'Alleen de echte foto van het recept op de bronpagina wordt overgenomen (ook via WordPress-CDN van de bron)',
    ],
  },
];
