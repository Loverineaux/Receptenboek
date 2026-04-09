export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.4.1',
    date: '9 april 2026',
    highlights: [
      'Ingrediënten zoals "1-2 paprika\'s" worden nu correct herkend met het juiste aantal',
      'Apostrofs in ingrediëntnamen (zoals paprika\'s, avocado\'s) worden nu goed weergegeven',
      'Bij het bewerken van een recept kun je nu kiezen uit alle bronnen die in de app bestaan',
      'Recepten importeren van websites werkt beter voor ingrediënten zonder eenheid',
      'Diverse verbeteringen aan de stabiliteit van de app',
    ],
  },
  {
    version: '0.4.0',
    date: '8 april 2026',
    highlights: [
      'Veranderingen van andere gebruikers verschijnen nu direct op je scherm',
      'Nieuwe reacties, favorieten en beoordelingen zie je zonder te refreshen',
      'Meldingen komen nu instant binnen in plaats van met vertraging',
      'Nieuwe recepten en collecties verschijnen automatisch in de lijst',
    ],
  },
  {
    version: '0.3.0',
    date: '8 april 2026',
    highlights: [
      'Admin paneel: beheer gebruikers, recepten, reacties, collecties en ingrediënten vanuit één plek',
      'Admins kunnen gebruikers blokkeren, wachtwoorden resetten en rollen toewijzen',
      'Je kunt nu producten verwijderen en verplaatsen naar een ander ingrediënt',
      'Bij het scannen van een barcode kun je de ingrediënt-suggestie wijzigen',
      'Recepten importeren herkent nu meer eenheden zoals snuf, scheut en teentje',
      'Alle ingrediënten hebben nu een afbeelding',
    ],
  },
];
