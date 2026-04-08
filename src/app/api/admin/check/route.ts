import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';

export async function GET() {
  const supabase = createClient();
  const admin = await isAdmin(supabase);
  return NextResponse.json({ isAdmin: admin });
}
