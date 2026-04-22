export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.14.7',
    date: '22 april 2026',
    highlights: [
      'De receptenlijst laadt sneller na een periode van inactiviteit — de keep-warm ping warmt nu ook de belangrijkste recepten-route',
    ],
  },
  {
    version: '1.14.6',
    date: '22 april 2026',
    highlights: [
      'Recept-foto\'s van websites die hun afbeeldingen beschermen (zoals Eef Kookt Zo) worden nu gewoon getoond',
      'Bij het importeren van een recept wordt de foto meteen in je eigen receptenboek opgeslagen, zodat hij altijd blijft werken — ook als de bron later de foto verwijdert',
      'Geldt ook voor bulk-import: meerdere recepten tegelijk toevoegen krijgt nu dezelfde slimme foto-opslag',
    ],
  },
  {
    version: '1.14.5',
    date: '15 april 2026',
    highlights: [
      'Nieuw admin-tabblad "Onderhoud" met handige tools voor het beheer van recepten',
      'Duplicaten worden nu als paren getoond: links het origineel, rechts het duplicaat — makkelijk te vergelijken',
      'Temperaturen invullen: vul automatisch ontbrekende oven- en kerntemperaturen aan',
      'Ingrediënten herstellen: herstel automatisch hoeveelheden die verkeerd zijn geëxtraheerd',
    ],
  },
];
