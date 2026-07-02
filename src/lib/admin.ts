import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Vereis een ingelogde gebruiker. Geeft de user terug, of null wanneer er
 * geen geldige sessie is. Gebruikt getSession() — consistent met de rest van
 * de API-routes; RLS blijft de uiteindelijke backstop op elke query.
 */
export async function requireUser(
  supabase: SupabaseClient
): Promise<{ id: string } | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ? { id: session.user.id } : null;
}

/**
 * Check if the current user is an admin.
 */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return data?.role === 'admin';
}

/**
 * Get user ID + admin status. Returns null if not logged in.
 */
export async function getAuthWithAdmin(supabase: SupabaseClient): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { userId: user.id, isAdmin: data?.role === 'admin' };
}
