export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.18.27',
    date: '2 juli 2026',
    highlights: [
      'Recepten van Picnic geven nu netjes de titel en foto terug, zodat je alleen de ingrediënten en stappen zelf hoeft aan te vullen',
      'Je kunt nu ook een heel gedeeld bericht plakken (met de link erin) — de titel wordt er automatisch uitgehaald',
      'Links van bronnen die alleen in hun eigen app werken blijven niet meer eindeloos laden, maar geven direct een bruikbaar startpunt',
    ],
  },
  {
    version: '1.18.26',
    date: '2 juli 2026',
    highlights: [
      'Recepten importeren via een link gaat nu sneller en verloopt betrouwbaarder',
      'De receptherkenning gebruikt een nieuwer, slimmer AI-model voor tekst, foto’s en PDF’s',
      'Moeilijke websites worden sneller afgehandeld in plaats van eindeloos te blijven laden',
      'Een zeldzame fout waarbij een import een leeg recept opleverde is verholpen',
    ],
  },
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
];
