export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.16',
    date: '2 mei 2026',
    highlights: [
      'Snellere import van bot-detected websites: als zowel de structured data als de paginatekst bot-stub zijn, slaan we 25 seconden onnodige AI-verwerking over en gaan direct naar online zoeken',
    ],
  },
  {
    version: '1.18.15',
    date: '2 mei 2026',
    highlights: [
      'Bij langdurige recept-imports zie je nu duidelijke voortgangsstappen, inclusief "Foto opzoeken — dit kan even duren..." zodat duidelijk is waarom de import langer duurt',
    ],
  },
];
