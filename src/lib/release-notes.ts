export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.5.0',
    date: '9 april 2026',
    highlights: [
      'De app laadt nu veel sneller — pagina\'s en afbeeldingen worden geoptimaliseerd geladen',
      'Recepten worden in groepen van 24 getoond met een "Laad meer" knop voor een vlottere ervaring',
      'Zoeken werkt nu met meerdere woorden: "kip pasta" vindt alle recepten met beide woorden',
      'Zoekresultaten omvatten nu ook de beschrijving van recepten',
      'Nieuwe recepten en favorieten worden sneller bijgewerkt op je scherm',
    ],
  },
  {
    version: '0.4.2',
    date: '9 april 2026',
    highlights: [
      'Bereidingsstappen worden nu netjes weergegeven zonder dubbele tekst',
      'De staptitel herhaalt niet meer dezelfde tekst als de beschrijving',
      'Recepten importeren van websites levert nu schonere bereidingsstappen op',
    ],
  },
  {
    version: '0.4.1',
    date: '9 april 2026',
    highlights: [
      'Ingrediënten zoals "1-2 paprika\'s" worden nu correct herkend met het juiste aantal',
      'Apostrofs in ingrediëntnamen (zoals paprika\'s, avocado\'s) worden nu goed weergegeven',
      'Bij het bewerken van een recept kun je nu kiezen uit alle bronnen die in de app bestaan',
      'Recepten importeren van websites werkt beter voor ingrediënten zonder eenheid',
    ],
  },
];
