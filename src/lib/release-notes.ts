export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.14.10',
    date: '22 april 2026',
    highlights: [
      'Recept-foto wordt nu altijd gezocht van de bron zelf — nooit een willekeurige afbeelding van een andere website',
      'Alleen de echte foto van het recept op de bronpagina wordt overgenomen (ook via WordPress-CDN van de bron)',
    ],
  },
  {
    version: '1.14.9',
    date: '22 april 2026',
    highlights: [
      'Recept-foto\'s worden nu ook gevonden voor websites die onze server blokkeren — via een gerichte online zoekactie als laatste redmiddel',
    ],
  },
  {
    version: '1.14.8',
    date: '22 april 2026',
    highlights: [
      'Extra vangnet voor recept-foto\'s: als de normale extractie geen afbeelding vindt, wordt de og:image van de pagina nog één keer rechtstreeks opgehaald',
    ],
  },
];
