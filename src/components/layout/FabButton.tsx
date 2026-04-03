'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';

const FAB_CLASSES =
  'fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 md:bottom-6 md:right-6';

export default function FabButton() {
  const pathname = usePathname();

  // Collecties overview: open "Nieuwe collectie" modal via custom event
  if (pathname === '/collecties') {
    return (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('fab:new-collection'))}
        className={FAB_CLASSES}
      >
        <Plus className="h-6 w-6" />
      </button>
    );
  }

  // Recepten overview: new recipe
  if (pathname === '/recepten') {
    return (
      <Link href="/recepten/nieuw" className={FAB_CLASSES}>
        <Plus className="h-6 w-6" />
      </Link>
    );
  }

  // All other pages: no FAB
  return null;
}
