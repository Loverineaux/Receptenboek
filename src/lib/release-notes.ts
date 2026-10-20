export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.22.0',
    date: '20 oktober 2026',
    highlights: [
      'Filter je recepten snel op Ontbijt, Lunch, Diner of Dessert met de knoppen bovenaan',
      'Onder Diner vind je alle recepten die geen ontbijt, lunch of dessert zijn',
      'Je ziet nu 60 recepten tegelijk in plaats van 24',
      'Scroll je naar beneden, dan worden er vanzelf meer recepten bijgeladen',
    ],
  },
  {
    version: '1.21.2',
    date: '20 oktober 2026',
    highlights: [
      'Het oude adres stuurt je nu vanzelf door naar receptenboek.loofhub.nl',
      'Ook een bewaarde link naar een specifiek recept komt op de juiste pagina uit',
    ],
  },
  {
    version: '1.21.1',
    date: '20 oktober 2026',
    highlights: [
      'Receptenboek heeft een nieuw adres: receptenboek.loofhub.nl',
      'Gedeelde recepten verwijzen voortaan naar het nieuwe adres',
      'Op het nieuwe adres log je één keer opnieuw in; staat de app op je telefoon, installeer hem dan opnieuw vanaf het nieuwe adres',
    ],
  },
];
