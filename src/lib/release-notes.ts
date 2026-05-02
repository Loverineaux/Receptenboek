export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.10',
    date: '2 mei 2026',
    highlights: [
      'Recept-import van AH allerhande en andere sites met meerdere recepten op één pagina pakt nu het juiste recept (was eerder soms een gerelateerd recept dat eerst in de paginabron stond)',
    ],
  },
  {
    version: '1.18.9',
    date: '2 mei 2026',
    highlights: [
      'Foto\'s van een recept worden nu in de browser verkleind voordat ze naar de AI gaan — voorkomt dat grote telefoonfoto\'s door de AI-server worden geweigerd en versnelt de upload',
    ],
  },
];
