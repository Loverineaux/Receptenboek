export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
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
  {
    version: '1.18.28',
    date: '2 juli 2026',
    highlights: [
      'Picnic-recepten die eerder correct werden opgehaald werken gewoon weer — de automatische import blijft behouden',
      'Lukt een import toch niet, dan krijg je nu tenminste de titel terug om zelf aan te vullen, in plaats van een leeg recept',
      'Je kunt een heel gedeeld bericht plakken (met de link erin) — de titel wordt er automatisch uitgehaald',
    ],
  },
];
