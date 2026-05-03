export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.18.16',
    date: '2 mei 2026',
    highlights: [
      'Snellere import van bot-detected websites: als zowel de structured data als de paginatekst bot-stub zijn, slaan we 25 seconden onnodige AI-verwerking over en gaan direct naar online zoeken',
    ],
  },
];
