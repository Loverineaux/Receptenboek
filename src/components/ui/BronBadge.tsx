interface BronBadgeProps {
  bron: string | null;
}

const bronStyles: Record<string, { bg: string; text: string }> = {
  hellofresh: { bg: '#e8f5e9', text: '#2e7d32' },
  'albert heijn': { bg: '#e3f2fd', text: '#1565c0' },
  appie: { bg: '#e3f2fd', text: '#1565c0' },
  jumbo: { bg: '#fff8e1', text: '#f57f17' },
  'broodje dunner': { bg: '#fce4ec', text: '#c62828' },
  'eigen recept': { bg: '#f3e5f5', text: '#6a1b9a' },
  bbq: { bg: '#fff3e0', text: '#e65100' },
  'eef kookt zo': { bg: '#fff9c4', text: '#f9a825' },
  'skinny six': { bg: '#e0f7fa', text: '#00838f' },
  ah: { bg: '#e3f2fd', text: '#1565c0' },
};

// Predefined distinct colors for unknown sources — cycles through these to avoid similar hues
const DISTINCT_COLORS = [
  { bg: '#fce4ec', text: '#ad1457' }, // roze
  { bg: '#e8eaf6', text: '#283593' }, // indigo
  { bg: '#fff3e0', text: '#e65100' }, // oranje
  { bg: '#e0f2f1', text: '#00695c' }, // teal
  { bg: '#f3e5f5', text: '#7b1fa2' }, // paars
  { bg: '#fffde7', text: '#f57f17' }, // geel
  { bg: '#efebe9', text: '#4e342e' }, // bruin
  { bg: '#e1f5fe', text: '#0277bd' }, // lichtblauw
  { bg: '#fbe9e7', text: '#bf360c' }, // dieporanje
  { bg: '#e8f5e9', text: '#2e7d32' }, // groen
];

function hashColor(str: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = ((hash % DISTINCT_COLORS.length) + DISTINCT_COLORS.length) % DISTINCT_COLORS.length;
  return DISTINCT_COLORS[idx];
}

const defaultStyle = { bg: '#f1f5f9', text: '#475569' };

export default function BronBadge({ bron }: BronBadgeProps) {
  if (!bron) return null;
  const style = bronStyles[bron.toLowerCase()] || hashColor(bron.toLowerCase());

  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {bron}
    </span>
  );
}
