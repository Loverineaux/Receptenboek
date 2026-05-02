export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.15',
    date: '2 mei 2026',
    highlights: [
      'Bij langdurige recept-imports zie je nu duidelijke voortgangsstappen, inclusief "Foto opzoeken — dit kan even duren..." zodat duidelijk is waarom de import langer duurt',
    ],
  },
  {
    version: '1.18.14',
    date: '2 mei 2026',
    highlights: [
      'Recept-import krijgt langer de tijd (2 minuten) zodat pagina\'s die door bot-detectie afgevangen worden alsnog correct geïmporteerd kunnen worden',
      'Foto-rescue wordt overgeslagen als er weinig tijd over is, zodat het hele recept binnen het tijdsbudget terugkomt',
    ],
  },
];
