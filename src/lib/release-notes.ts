export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.3.1',
    date: '12 april 2026',
    highlights: [
      'Het toetsenbord verdwijnt nu als je op Enter drukt in een invoerveld',
      'Importeren van recepten geeft geen timeout meer bij lastige websites',
      'De voortgangsstappen bij het importeren zijn nu realistischer',
      'Bij de waarschuwing voor lastige websites kun je direct een foto of PDF uploaden',
    ],
  },
];
