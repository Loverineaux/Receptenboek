'use client';

import { Ban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function GeblokkeerdPage() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <Ban className="h-8 w-8 text-red-500" />
      </div>
      <h1 className="mt-6 text-2xl font-bold text-text-primary">Account geblokkeerd</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Je account is geblokkeerd door een beheerder. Neem contact op als je denkt dat dit een vergissing is.
      </p>
      <button
        onClick={async () => { await signOut(); window.location.href = '/login'; }}
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        Uitloggen
      </button>
    </div>
  );
}
