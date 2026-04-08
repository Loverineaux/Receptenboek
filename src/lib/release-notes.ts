export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '0.1.0',
    date: '4 april 2026',
    highlights: [
      'Scan een barcode om ingrediënten snel toe te voegen',
      'Voedingswaarden worden automatisch berekend op basis van je ingrediënten',
      'Importeer meerdere recepten tegelijk via een link',
      'Organiseer je recepten in collecties, net als Pinterest-borden',
      'HelloFresh recepten kunnen nu ook geïmporteerd worden',
    ],
  },
  {
    version: '0.0.1',
    date: '27 maart 2026',
    highlights: [
      'De eerste versie van Receptenboek is live!',
      'Voeg recepten toe of importeer ze vanuit een PDF',
      'Geef sterren en plaats reacties op recepten van anderen',
      'Sla je favoriete recepten op en vind ze snel terug',
      'Maak een profiel aan en deel je kookkunsten',
    ],
  },
];
