import Tag from '@/components/ui/Tag';

interface BronBadgeProps {
  bron: string | null;
}

/** Bron-label (design v2): groen getinte tag. Eén stijl voor alle bronnen. */
export default function BronBadge({ bron }: BronBadgeProps) {
  if (!bron) return null;
  return <Tag variant="tint">{bron}</Tag>;
}
