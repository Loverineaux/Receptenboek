export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.2',
    date: '23 april 2026',
    highlights: [
      'Ingrediënten-herstel begrijpt nu beide antwoordvormen van de AI, dus geen stille mislukkingen meer wanneer een rij niet gesplitst kon worden',
    ],
  },
  {
    version: '1.18.1',
    date: '23 april 2026',
    highlights: [
      'De "Ingrediënten herstellen"-knop in Onderhoud splitst nu ook recepten waar twee ingrediënten in één rij zijn beland (bijv. "200 gram sojasaus 40 ml aspergetips") in twee correcte regels',
      'Detecteert ook hoeveelheden in de naam wanneer de hoeveelheid-kolom al gevuld was — die werden eerder overgeslagen',
    ],
  },
];
