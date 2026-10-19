import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/admin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Registers that the logged-in user finished cooking this recipe. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ongeldig recept' }, { status: 400 });
  }

  const { error } = await supabase
    .from('cooked_recipes')
    .insert({ recipe_id: id, user_id: user.id });

  if (error) {
    console.error('cooked_recipes insert failed:', error.message);
    return NextResponse.json({ error: 'Opslaan mislukt' }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
