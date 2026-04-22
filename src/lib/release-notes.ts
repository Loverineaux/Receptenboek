export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.14.13',
    date: '22 april 2026',
    highlights: [
      'Recept-foto\'s van websites die onze server blokkeren worden nu alsnog opgehaald via een publieke image-proxy en opgeslagen in je receptenboek',
      'Geen kapotte fotoicoontjes meer bij import — er is altijd een werkende weergave-URL, ook als de originele bron onze server blokkeert',
    ],
  },
  {
    version: '1.14.12',
    date: '22 april 2026',
    highlights: [
      'Geen timeout-foutmeldingen meer bij het importeren van recepten — de foto-zoekactie haakt op tijd af als het te lang duurt',
    ],
  },
  {
    version: '1.14.11',
    date: '22 april 2026',
    highlights: [
      'Recept-foto wordt betrouwbaarder gevonden voor websites die onze server blokkeren — de zoekactie haalt nu expliciet de og:image van de bronpagina op',
    ],
  },
];
