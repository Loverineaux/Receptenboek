export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.4.0',
    date: '12 april 2026',
    highlights: [
      'De donatie-melding toont nu een persoonlijke boodschap van Robin, de maker van de app',
      'Als admin kun je donaties registreren per gebruiker en het overzicht bekijken op het dashboard',
      'Na een donatie verdwijnt de melding voor een aantal extracties (€1 = 10 extracties vrij)',
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
  {
    version: '1.3.0',
    date: '11 april 2026',
    highlights: [
      'Bij websites die niet volledig uitgelezen kunnen worden krijg je nu een melding met het advies om een foto te uploaden',
      'Het aantal porties wordt nu beter overgenomen bij het importeren',
      'Na het bewerken van een recept gaat de terugknop nu naar de receptenbibliotheek',
      'Je kunt nu een afbeelding uploaden bij het aanmaken of bewerken van een recept',
    ],
  },
];
