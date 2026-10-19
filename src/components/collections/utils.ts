/** Haal het aantal minuten uit vrije tekst als "25 min", "1 uur 15 min", "1,5 uur", "1:30". */
export function parseMinutes(tijd: string | null | undefined): number | null {
  if (!tijd) return null;
  const t = tijd.toLowerCase().replace(',', '.');
  const clock = t.match(/(\d+):(\d{2})/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  let total = 0;
  let found = false;
  const hours = t.match(/(\d+(?:\.\d+)?)\s*(?:uur|u\b|h\b)/);
  if (hours) {
    total += Math.round(parseFloat(hours[1]) * 60);
    found = true;
  }
  const mins = t.match(/(\d+)\s*(?:min|m\b)/);
  if (mins) {
    total += Number(mins[1]);
    found = true;
  }
  if (!found) {
    const plain = t.match(/^\s*(\d+)\s*$/);
    return plain ? Number(plain[1]) : null;
  }
  return total;
}

export function recipeCountLabel(n: number): string {
  return `${n} ${n === 1 ? 'recept' : 'recepten'}`;
}

/** "Tom", "Tom en Lieke", "Tom, Lieke en Piet", "Tom, Lieke en 2 anderen" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} en ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} en ${names[2]}`;
  return `${names[0]}, ${names[1]} en ${names.length - 2} anderen`;
}
