export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.12',
    date: '2 mei 2026',
    highlights: [
      'Recept-import ontmaskert nu bot-detectie van websites: als de gevonden recepttitel niet matcht met de URL, wordt automatisch een online zoekactie gestart om het juiste recept op te halen',
    ],
  },
  {
    version: '1.18.11',
    date: '2 mei 2026',
    highlights: [
      'Recept-import van AH allerhande vindt nu het juiste recept ook als de pagina geen exact-match URL gebruikt — er wordt nu ook gematched op recept-ID (zoals R-R1190830) en gerelateerde recepten worden weggefilterd',
    ],
  },
];
