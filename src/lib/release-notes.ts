export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.23',
    date: '21 juni 2026',
    highlights: [
      'Als het importeren van een recept onverwacht mislukt — bijvoorbeeld doordat de website niet leesbaar is of de AI-dienst kortstondig hapert — krijg je geen foutmelding meer, maar een lege receptkaart met de titel en bron alvast ingevuld op basis van de link',
      'Bij zo\'n mislukte import zie je een duidelijke uitleg dat je het recept handmatig kunt aanvullen, of het opnieuw kunt proberen via een foto of PDF',
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
