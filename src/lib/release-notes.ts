export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.20.0',
    date: '19 oktober 2026',
    highlights: [
      'Een compleet nieuw uiterlijk: rustiger, warmer en makkelijker te lezen, met een nieuwe menubalk en een grote groene plusknop om snel een recept toe te voegen',
      'De kookmodus is vernieuwd: timers per stap die vanzelf uit het recept komen, de ingrediënten per stap in beeld en een knop om de stap hardop te laten voorlezen',
      'Bij elk ingrediënt zie je nu in welke maanden het in het seizoen is, en op het overzicht staat wat er deze maand lekker vers is',
      'In een collectie kun je sorteren op snelste of best beoordeeld, en laat je de app met één tik een recept voor je kiezen',
      'Je profiel toont hoeveel recepten en collecties je hebt en hoe vaak je al gekookt hebt, en is vanaf elk scherm bereikbaar',
      'Alles laadt sneller, en als je teruggaat naar een pagina staat die er meteen weer',
    ],
  },
  {
    version: '1.19.2',
    date: '19 oktober 2026',
    highlights: [
      'Na het inloggen met Google blijf je niet meer seconden lang op het Google-scherm hangen',
      'Het receptenoverzicht verschijnt direct na het inloggen, je profielgegevens laden op de achtergrond',
      'De app reageert ook sneller als hij een tijdje niet gebruikt is',
      'Achter de schermen worden je recepten en inloggegevens klaargehouden, zodat het eerste openen vlotter gaat',
    ],
  },
  {
    version: '1.19.1',
    date: '19 oktober 2026',
    highlights: [
      'Inloggen gaat een stuk sneller, ook met je Google-account',
      'Na het inloggen verschijnen je recepten veel vlotter in beeld',
      'Achter de schermen staat de app niet meer onnodig te werken, waardoor alles soepeler reageert',
      'Het receptenoverzicht laadt bij het openen niet meer dubbel',
    ],
  },
];
