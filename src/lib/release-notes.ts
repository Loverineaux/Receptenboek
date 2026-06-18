export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.22',
    date: '18 juni 2026',
    highlights: [
      'Een recept openen gaat nu een stuk sneller: het recept wordt direct meegeladen met de pagina in plaats van pas erna apart op te halen, dus je ziet meteen de inhoud in plaats van een laadcirkel',
    ],
  },
  {
    version: '1.18.21',
    date: '18 juni 2026',
    highlights: [
      'De app draait nu vanaf een Europese server (Dublin) vlak naast de database, in plaats van vanuit de Verenigde Staten — dat scheelt bij elke handeling een reis over de oceaan en maakt openen, zoeken en laden merkbaar sneller',
    ],
  },
  {
    version: '1.18.20',
    date: '18 juni 2026',
    highlights: [
      'Inloggen met Google geeft nu meteen feedback: de knop toont "Doorsturen naar Google…" zodra je erop klikt, in plaats van dat er ogenschijnlijk niets gebeurt',
      'Je kunt niet meer per ongeluk dubbelklikken op de Google-knop terwijl je wordt doorgestuurd',
    ],
  },
];
