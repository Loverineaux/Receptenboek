export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.2.2',
    date: '11 april 2026',
    highlights: [
      'Bij het importeren van een recept wordt nu uitsluitend de opgegeven website als bron gebruikt',
      'Na het bewerken van een recept gaat de terugknop nu correct naar de receptenbibliotheek',
      'De zoekopdracht bij het importeren vraagt nu nadrukkelijker om alle ingrediënten met hoeveelheden',
    ],
  },
  {
    version: '1.2.1',
    date: '11 april 2026',
    highlights: [
      'Recepten importeren van app-websites zoals Project Gezond werkt nu goed',
      'Websites met een #-URL (zoals app.projectgezond.nl) worden nu herkend en correct doorzocht',
      'De receptnaam wordt nu beter uit de URL gehaald voor een nauwkeuriger zoekresultaat',
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
