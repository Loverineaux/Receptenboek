import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ valid: false });
  }

  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'registration_access_code')
    .single();

  const valid = data?.value === code;
  return NextResponse.json({ valid });
}
