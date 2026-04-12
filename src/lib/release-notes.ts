export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.4.0',
    date: '12 april 2026',
    highlights: [
      'De donatie-melding toont nu een persoonlijke boodschap van Robin, de maker van de app',
      'Als admin kun je donaties registreren per gebruiker en het overzicht bekijken op het dashboard',
      'Na een donatie verdwijnt de melding voor een aantal extracties',
      'Gebruikers die nog niet gedoneerd hebben zien de melding vaker',
    ],
  },
];
