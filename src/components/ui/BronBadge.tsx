interface BronBadgeProps {
  bron: string;
}

const bronStyles: Record<string, { bg: string; text: string }> = {
  hellofresh: { bg: '#e8f5e9', text: '#2e7d32' },
  'albert heijn': { bg: '#e3f2fd', text: '#1565c0' },
  appie: { bg: '#e3f2fd', text: '#1565c0' },
  jumbo: { bg: '#fff8e1', text: '#f57f17' },
  'broodje dunner': { bg: '#fce4ec', text: '#c62828' },
  'eigen recept': { bg: '#f3e5f5', text: '#6a1b9a' },
};

const defaultStyle = { bg: '#f1f5f9', text: '#475569' };

export default function BronBadge({ bron }: BronBadgeProps) {
  const style = bronStyles[bron.toLowerCase()] || defaultStyle;

  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {bron}
    </span>
  );
}
