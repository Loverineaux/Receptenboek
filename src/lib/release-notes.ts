export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.17.0',
    date: '23 april 2026',
    highlights: [
      'Receptenlijst is meteen zichtbaar bij openen: de laatst bekeken recepten verschijnen direct terwijl de nieuwste versie stilletjes in de achtergrond wordt opgehaald',
      'Geen vervelende "harde refresh" meer — als de achtergrond-ophaling lang duurt, blijft je lijst gewoon zichtbaar en wordt hij pas stil bijgewerkt als de nieuwe data binnen is',
    ],
  },
  {
    version: '1.16.6',
    date: '23 april 2026',
    highlights: [
      'Als het laden van recepten mislukt of te lang duurt, zie je nu een duidelijke foutmelding in plaats van een eindeloos ladend scherm',
      'Nieuwe meetpunten zodat we precies zien welk deel van de fetch faalt als er iets stuk gaat',
    ],
  },
];
