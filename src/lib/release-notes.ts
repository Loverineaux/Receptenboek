export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.2.0',
    date: '11 april 2026',
    highlights: [
      'Je kunt nu een afbeelding uploaden bij het aanmaken of bewerken van een recept',
      'Naast een URL plakken kun je ook direct een foto vanaf je telefoon of computer kiezen',
      'Tijdens het uploaden zie je een laadanimatie en daarna een preview van de afbeelding',
    ],
  },
];
