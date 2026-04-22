export interface ReleaseNote {
  version: string;
  date: string;
  highlights: string[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    version: '1.15.4',
    date: '22 april 2026',
    highlights: [
      'De twee zoekacties voor receptgegevens en ingrediënten draaien nu tegelijk in plaats van na elkaar — bespaart 10-15 seconden per import',
      'Main zoekactie doet nu maximaal 2 vervolgsearches (was 3), extra versnelling',
    ],
  },
  {
    version: '1.15.3',
    date: '22 april 2026',
    highlights: [
      'Recept-extractie is flink sneller: je ziet het voorbeeld nu binnen 30-40 seconden in plaats van bijna een minuut',
      'De extra AI-zoekactie voor foto\'s is weggehaald — als er geen foto gevonden wordt, voeg je hem zelf toe via de "Foto toevoegen"-knop in het voorbeeld',
      'De originele zoekactie naar hoeveelheden bij ingrediënten blijft gewoon actief voor volledige recepten',
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
