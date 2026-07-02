export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.25',
    date: '2 juli 2026',
    highlights: [
      'Privé-recepten van andere gebruikers zijn nu écht privé — ze kunnen niet langer door anderen worden opgevraagd',
      'Beheerfuncties zoals opschoon- en migratieacties zijn nu alleen nog voor beheerders toegankelijk',
      'Recepten importeren en producten scannen kan voortaan alleen wanneer je bent ingelogd, wat misbruik voorkomt',
      'Het inladen van recepten en afbeeldingen via een link is beter beveiligd tegen misbruik van onze servers',
      'Na het inloggen kom je altijd op een pagina binnen de app terecht, nooit op een onbekende externe website',
    ],
  },
  {
    version: '1.18.24',
    date: '22 juni 2026',
    highlights: [
      'De melding "Mogelijk duplicaat" verschijnt nu alleen nog als een recept écht al bestaat — niet meer onterecht bij elk recept van dezelfde website',
      'De controle kijkt voortaan naar een vrijwel identieke titel of dezelfde foto, in plaats van enkel naar de website waar het recept vandaan komt',
    ],
  },
  {
    version: '1.18.23',
    date: '22 juni 2026',
    highlights: [
      'Je wordt niet langer zomaar tussendoor uitgelogd — je blijft ingelogd zoals het hoort',
      'Recepten die soms eindeloos bleven laden met een draaiend cirkeltje openen nu gewoon weer netjes',
      'Het snelle inloggen en openen van de vorige versies blijft volledig behouden',
    ],
  },
];
