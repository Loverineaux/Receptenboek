export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.0',
    date: '22 april 2026',
    highlights: [
      'Kon de automatische extractie geen foto vinden? In de voorbeeldweergave staat nu een "Foto toevoegen"-knop waarmee je zelf een foto kiest',
      'De geüploade foto verschijnt meteen in het voorbeeld en wordt na bevestiging mee opgeslagen in je receptenboek',
      'Ook bij een gelukte foto-extractie kun je de foto nog vervangen via de "Vervang foto"-knop rechtsonder in het voorbeeld',
    ],
  },
  {
    version: '1.14.14',
    date: '22 april 2026',
    highlights: [
      'Recept-foto wordt eerst gecontroleerd: als de URL niet werkt wordt er automatisch doorgezocht naar een andere foto van hetzelfde recept',
      'De AI mag geen fotourl meer gokken op basis van de receptnaam — alleen echte, geverifieerde og:image links worden geaccepteerd',
      'Geen broken-image icoontjes meer: mislukt alles dan staat er niets in plaats van een kapot plaatje',
    ],
  },
  {
    version: '1.14.13',
    date: '22 april 2026',
    highlights: [
      'Recept-foto\'s van websites die onze server blokkeren worden nu alsnog opgehaald via een publieke image-proxy en opgeslagen in je receptenboek',
      'Geen kapotte fotoicoontjes meer bij import — er is altijd een werkende weergave-URL, ook als de originele bron onze server blokkeert',
    ],
  },
];
