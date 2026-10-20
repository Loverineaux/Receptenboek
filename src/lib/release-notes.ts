export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.21.0',
    date: '19 oktober 2026',
    highlights: [
      'De knop naast het linkveld heet nu "Importeren" en haalt het recept meteen op',
      'Is het veld nog leeg, dan plakt de knop wat je net gekopieerd hebt en importeert hij direct: één tik is genoeg',
      'Je kunt ook een heel deelbericht plakken, bijvoorbeeld uit de Picnic-app; de link wordt er vanzelf uitgehaald',
      'Achter de schermen is een overbodige taak opgeruimd, zodat de app zuiniger draait',
    ],
  },
];
