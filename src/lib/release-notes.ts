export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '0.2.0',
    date: '7 april 2026',
    highlights: [
      'Je krijgt nu meldingen als iemand je recept beoordeelt, een reactie plaatst of als favoriet opslaat',
      'Nieuwe instellingenpagina waar je je profiel, meldingen en account kunt beheren',
      'Het hartje op receptkaarten werkt nu direct — geen vertraging meer',
      'Je kunt nu je wachtwoord wijzigen via een e-mail link',
      'Alle meldingen en foutberichten zijn nu in het Nederlands',
    ],
  },
];
