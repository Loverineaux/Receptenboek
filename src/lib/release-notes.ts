export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.13',
    date: '2 mei 2026',
    highlights: [
      'Bij websites die ons als bot detecteren probeert de import nu eerst de werkelijke pagina-tekst te lezen — vaak staat het volledige recept met alle hoeveelheden gewoon in de paginabron, ook als de structured data verkeerd is',
      'Foto wordt gericht opgehaald van de bron-website als de eerste poging er geen vond',
    ],
  },
  {
    version: '1.18.12',
    date: '2 mei 2026',
    highlights: [
      'Recept-import ontmaskert nu bot-detectie van websites: als de gevonden recepttitel niet matcht met de URL, wordt automatisch een online zoekactie gestart om het juiste recept op te halen',
    ],
  },
];
