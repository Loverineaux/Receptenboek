'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import IconButton from '@/components/ui/IconButton';

interface BackButtonProps {
  /** Bovenliggende pagina (een niveau omhoog) */
  href: string;
  label?: string;
}

/**
 * Terugknop bovenaan een scherm (design v2): 44×44 crème vierkant met pijl.
 * Gaat altijd een niveau omhoog in plaats van terug in de geschiedenis, en
 * vervangt de huidige pagina zodat heen-en-weer navigeren zich niet opstapelt.
 */
export default function BackButton({ href, label = 'Terug' }: BackButtonProps) {
  const router = useRouter();
  return (
    <IconButton label={label} onClick={() => router.replace(href)}>
      <ArrowLeft className="h-5 w-5" strokeWidth={2} />
    </IconButton>
  );
}
