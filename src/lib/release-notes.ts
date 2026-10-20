export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.22.2',
    date: '20 oktober 2026',
    highlights: [
      'Bij elk recept zie je nu hoeveel mensen het hebben beoordeeld',
      'De instellingen hebben een nieuwe, rustigere bovenkant in dezelfde stijl als de rest van de app',
      'De terugknop bij de instellingen is groter en makkelijker aan te tikken',
      'Bovenaan de instellingen schuift er niets meer half onder de terugknop door',
    ],
  },
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
];
