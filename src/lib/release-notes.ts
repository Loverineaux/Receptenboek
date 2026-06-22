export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.23',
    date: '22 juni 2026',
    highlights: [
      'Je wordt niet langer zomaar tussendoor uitgelogd — je blijft ingelogd zoals het hoort',
      'Recepten die soms eindeloos bleven laden met een draaiend cirkeltje openen nu gewoon weer netjes',
      'Het snelle inloggen en openen van de vorige versies blijft volledig behouden',
    ],
  },
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
];
