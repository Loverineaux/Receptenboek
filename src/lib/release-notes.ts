export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.0',
    date: '23 april 2026',
    highlights: [
      'Kookmodus onthoudt nu bij welke stap je bent als je tussendoor naar een andere app wisselt — je komt terug op dezelfde plek',
      'Aangevinkte ingrediënten blijven staan als je de app even wegklikt: wat je al hebt gepakt in de keuken hoef je niet opnieuw af te vinken',
      'Bij het drukken op "Klaar!" wordt de voortgang gewist, dus de volgende keer begin je fris',
    ],
  },
  {
    version: '1.17.1',
    date: '23 april 2026',
    highlights: [
      'Opgeslagen recepten verschijnen nu écht direct bij openen (hotfix: de laadindicator overschreef eerder abusievelijk de uit cache getoonde lijst)',
    ],
  },
];
