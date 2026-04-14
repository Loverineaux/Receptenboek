import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { data } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', 'registration_access_code')
    .single();

  return NextResponse.json({ code: data?.value ?? '' });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 });
  }

  const { code } = await request.json();
  if (!code || code.length < 4) {
    return NextResponse.json({ error: 'Code moet minimaal 4 tekens zijn' }, { status: 400 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  await supabaseAdmin
    .from('app_settings')
    .upsert({
      key: 'registration_access_code',
      value: code,
      updated_at: new Date().toISOString(),
      updated_by: user?.id,
    });

  return NextResponse.json({ success: true });
}
