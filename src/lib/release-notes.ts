export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.8.5',
    date: '13 april 2026',
    highlights: [
      'De app laadt na inactiviteit veel sneller — geen onnodige wachttijd meer',
      'Receptdetails openen nu direct, ook als je profiel nog aan het laden is',
      'Het favorieten-icoontje en de teller laden sneller bij het openen van een recept',
      'Je profiel wordt niet meer dubbel opgehaald bij het vernieuwen van je sessie',
    ],
  },
  {
    version: '1.8.4',
    date: '13 april 2026',
    highlights: [
      'De inlogcontrole is versneld waardoor de app veel sneller opstart',
      'Recepten, beoordelingen en favorieten laden nu merkbaar sneller',
      'Zoeken op ingrediënten verwerkt alle zoekwoorden tegelijk',
    ],
  },
  {
    version: '1.8.0',
    date: '12 april 2026',
    highlights: [
      'Recepten laden nu veel sneller — de lijst wacht niet meer op inloggen',
      'De hoeveelheid data bij het ophalen van recepten is met 70% verminderd',
      'Bij het scannen van producten kun je nu kiezen tussen camera en fotobibliotheek',
      'Als je sessie verloopt word je automatisch naar het loginscherm gestuurd',
      'Het label "Oven" of "BBQ / Grill" wordt nu automatisch bepaald',
      'Duidelijkere foutmeldingen bij het aanmaken van ingrediënten',
    ],
  },
];
