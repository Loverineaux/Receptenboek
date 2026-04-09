'use client';

import { useAuth } from '@/hooks/useAuth';

export default function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <button
      onClick={async () => { await signOut(); window.location.href = '/login'; }}
      className="mt-6 text-sm font-medium text-primary hover:underline"
    >
      Uitloggen
    </button>
  );
}
