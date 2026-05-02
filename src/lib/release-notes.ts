export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.11',
    date: '2 mei 2026',
    highlights: [
      'Recept-import van AH allerhande vindt nu het juiste recept ook als de pagina geen exact-match URL gebruikt — er wordt nu ook gematched op recept-ID (zoals R-R1190830) en gerelateerde recepten worden weggefilterd',
    ],
  },
  {
    version: '1.18.10',
    date: '2 mei 2026',
    highlights: [
      'Recept-import van AH allerhande en andere sites met meerdere recepten op één pagina pakt nu het juiste recept (was eerder soms een gerelateerd recept dat eerst in de paginabron stond)',
    ],
  },
];
