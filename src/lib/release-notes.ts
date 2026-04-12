export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.6.0',
    date: '12 april 2026',
    highlights: [
      'Oventemperatuur en kerntemperatuur worden nu apart getoond bij het recept',
      'Bij het bewerken van een recept kun je nu de oven- en kerntemperatuur invullen',
      'De temperatuur gaat niet meer verloren als je een recept bewerkt',
      'De AI herkent nu het verschil tussen oventemperatuur en kerntemperatuur',
      'Bestaande recepten kun je als admin bijwerken via "Temperaturen invullen"',
    ],
  },
  {
    version: '1.5.0',
    date: '12 april 2026',
    highlights: [
      'Oventemperatuur en BBQ-instellingen worden nu automatisch herkend en getoond bij het recept',
      'De zoekbalk blijft nu altijd zichtbaar als je door recepten scrollt',
      'Bij de filters kun je nu met één knop alle filters wissen',
      'De knop "Toepassen" bij filters is niet meer verstopt achter de navigatiebalk',
      'De app blijft nu warm draaien zodat je geen lange wachttijd meer hebt bij het openen',
      'Een fout waardoor de hele app soms niet laadde (504 timeout) is opgelost',
    ],
  },
];
