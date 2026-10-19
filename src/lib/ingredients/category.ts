/** Categorie-helpers voor ingrediënten (tinten, labels, filtergroepen). */

export function categoryLabel(category: string | null | undefined): string {
  const c = (category ?? '').trim();
  if (!c) return 'Overig';
  return c.charAt(0).toUpperCase() + c.slice(1);
}

/** Tailwind-achtergrondklasse voor de initiaal-tegel. */
export function categoryTint(category: string | null | undefined): string {
  switch ((category ?? '').toLowerCase()) {
    case 'groente':
      return 'bg-cat-groente';
    case 'kruiden':
      return 'bg-cat-kruiden';
    case 'zuivel':
      return 'bg-cat-zuivel';
    case 'fruit':
      return 'bg-cat-fruit';
    case 'vlees':
    case 'vis':
      return 'bg-cat-vlees';
    default:
      return 'bg-sunk';
  }
}

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

/** Filterchips: `values` zijn de databasewaarden van `category` (komma-gescheiden naar de API). */
export const CATEGORY_FILTERS: { label: string; values: string[] }[] = [
  { label: 'Groente', values: ['groente'] },
  { label: 'Fruit', values: ['fruit'] },
  { label: 'Kruiden', values: ['kruiden'] },
  { label: 'Zuivel', values: ['zuivel'] },
  { label: 'Vlees & vis', values: ['vlees', 'vis'] },
  { label: 'Granen', values: ['granen'] },
  { label: 'Overig', values: ['overig'] },
];

/** Nederlandse komma-notatie, max. 1 decimaal. */
export function formatNumberNl(n: number): string {
  return n.toLocaleString('nl-NL', { maximumFractionDigits: 1 });
}
