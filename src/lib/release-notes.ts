export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.19.0',
    date: '19 oktober 2026',
    highlights: [
      'Recepten van Picnic worden nu compleet geïmporteerd: met alle ingrediënten, hoeveelheden, bereidingsstappen en foto',
      'Picnic-recepten staan meteen goed op 2 porties, zodat je ze direct kunt omrekenen naar meer of minder personen',
      'Een Picnic-recept importeren duurt nu ongeveer een seconde in plaats van tientallen seconden',
      'De receptherkenning voor links, foto’s, PDF’s en geplakte tekst gebruikt de nieuwste AI-modellen',
      'De receptchat, het omrekenen van porties en het automatisch indelen in categorieën werken sneller',
    ],
  },
];
