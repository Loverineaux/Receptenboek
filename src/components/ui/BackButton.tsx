'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

interface BackButtonProps {
  /** Vaste bestemming; zonder href gaat de knop terug in de geschiedenis */
  href?: string;
  label?: string;
}

/** Terugknop bovenaan een scherm (design v2): 44×44 crème vierkant met pijl. */
export default function BackButton({ href, label = 'Terug' }: BackButtonProps) {
  const router = useRouter();
  return (
    <IconButton label={label} onClick={() => (href ? router.push(href) : router.back())}>
      <ArrowLeft className="h-5 w-5" strokeWidth={2} />
    </IconButton>
  );
}
