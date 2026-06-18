export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.20',
    date: '18 juni 2026',
    highlights: [
      'Inloggen met Google geeft nu meteen feedback: de knop toont "Doorsturen naar Google…" zodra je erop klikt, in plaats van dat er ogenschijnlijk niets gebeurt',
      'Je kunt niet meer per ongeluk dubbelklikken op de Google-knop terwijl je wordt doorgestuurd',
    ],
  },
  {
    version: '1.18.19',
    date: '18 juni 2026',
    highlights: [
      'De app opent nu een stuk sneller: je gegevens zijn meteen bekend bij het openen, zodat je direct door recepten kunt zoeken en ze kunt openen zonder eerst te wachten',
      'Geen onnodige wachttijd meer na inloggen — de receptenlijst is meteen bruikbaar in plaats van alleen zichtbaar',
    ],
  },
  {
    version: '1.18.18',
    date: '3 mei 2026',
    highlights: [
      'Recept-import wacht nog maximaal 5 seconden op de Googlebot-poging in plaats van 15, zodat sites die ons toch blokkeren niet onnodig lang vasthouden — de logregels laten nu ook duidelijk zien of de poging slaagde of mislukte',
    ],
  },
];
