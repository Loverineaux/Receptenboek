export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.18.17',
    date: '2 mei 2026',
    highlights: [
      'Recept-import probeert bij websites met bot-detectie nu eerst de pagina op te halen alsof we de Google-zoekrobot zijn — daarmee komen vaak alsnog alle hoeveelheden en de juiste foto binnen',
    ],
  },
];
