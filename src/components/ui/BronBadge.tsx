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

// Generate a consistent color from bron name for unknown sources
function hashColor(str: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return { bg: `hsl(${hue}, 60%, 92%)`, text: `hsl(${hue}, 60%, 30%)` };
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
