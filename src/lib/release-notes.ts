export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.17.1',
    date: '23 april 2026',
    highlights: [
      'Opgeslagen recepten verschijnen nu écht direct bij openen (hotfix: de laadindicator overschreef eerder abusievelijk de uit cache getoonde lijst)',
    ],
  },
  {
    version: '1.17.0',
    date: '23 april 2026',
    highlights: [
      'Receptenlijst is meteen zichtbaar bij openen: de laatst bekeken recepten verschijnen direct terwijl de nieuwste versie stilletjes in de achtergrond wordt opgehaald',
      'Geen vervelende "harde refresh" meer — als de achtergrond-ophaling lang duurt, blijft je lijst gewoon zichtbaar en wordt hij pas stil bijgewerkt als de nieuwe data binnen is',
    ],
  },
];
