export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.22.5',
    date: '20 oktober 2026',
    highlights: [
      'Recepten van Albert Heijn (Allerhande) worden weer volledig geïmporteerd, ook via een gedeelde link uit de AH-app',
      'Je krijgt de foto, introductie, porties, bereidingstijd, alle ingrediënten met hoeveelheden en de stappen',
      'Ook de voedingswaarden per portie en labels zoals vegetarisch of snel komen mee',
    ],
  },
  {
    version: '1.22.4',
    date: '20 oktober 2026',
    highlights: [
      'Recepten van sites die de app eerst blokkeerden, zoals Miljuschka, komen nu compleet binnen, inclusief foto',
      'Heeft een recept zelf geen introductie, dan neemt de app de korte omschrijving van de website over',
    ],
  },
  {
    version: '1.22.3',
    date: '20 oktober 2026',
    highlights: [
      'De terugknop brengt je nu altijd één stap omhoog: van een instelling naar Instellingen, dan naar je profiel en dan naar de recepten',
      'Heen en weer klikken tussen instellingen zorgt niet meer voor een lange omweg terug',
      'Je profielpagina heeft nu ook een terugknop naar de recepten',
    ],
  },
];
