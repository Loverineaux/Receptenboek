export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.22.1',
    date: '20 oktober 2026',
    highlights: [
      'Op de foto van elk recept zie je weer van welke website of bron het komt',
      'Ook in de lijstweergave en bij het uitgelichte recept staat de bron er weer bij',
    ],
  },
  {
    version: '1.22.0',
    date: '20 oktober 2026',
    highlights: [
      'Filter je recepten snel op Ontbijt, Lunch, Diner of Dessert met de knoppen bovenaan',
      'Onder Diner vind je alle recepten die geen ontbijt, lunch of dessert zijn',
      'Je ziet nu 60 recepten tegelijk in plaats van 24',
      'Scroll je naar beneden, dan worden er vanzelf meer recepten bijgeladen',
    ],
  },
  {
    version: '1.21.2',
    date: '20 oktober 2026',
    highlights: [
      'Het oude adres stuurt je nu vanzelf door naar receptenboek.loofhub.nl',
      'Ook een bewaarde link naar een specifiek recept komt op de juiste pagina uit',
    ],
  },
];
