export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.2',
    date: '22 april 2026',
    highlights: [
      'Recept-extractie werkt nu binnen een ruimere tijdslimiet van 2 minuten — geen "duurde te lang"-meldingen meer voor normale imports',
      'Een overbodige extra zoekactie is geschrapt, zodat de import 10-15 seconden sneller is',
    ],
  },
  {
    version: '1.15.1',
    date: '22 april 2026',
    highlights: [
      'Snellere recept-extractie: het structureren van de data gebeurt nu met een snellere AI, zodat imports ruim binnen de tijdslimiet blijven',
      'Begrijpelijke Nederlandse foutmelding bij een te lang durende import in plaats van een cryptische JSON-fout',
    ],
  },
  {
    version: '1.15.0',
    date: '22 april 2026',
    highlights: [
      'Kon de automatische extractie geen foto vinden? In de voorbeeldweergave staat nu een "Foto toevoegen"-knop waarmee je zelf een foto kiest',
      'De geüploade foto verschijnt meteen in het voorbeeld en wordt na bevestiging mee opgeslagen in je receptenboek',
      'Ook bij een gelukte foto-extractie kun je de foto nog vervangen via de "Vervang foto"-knop rechtsonder in het voorbeeld',
    ],
  },
];
