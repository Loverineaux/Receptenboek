import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/notifications';

// POST /api/share — share a recipe or collection with a user (sends notification)
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  const { recipient_id, type, item_id } = await request.json();

  if (!recipient_id || !type || !item_id) {
    return NextResponse.json({ error: 'Ontbrekende gegevens' }, { status: 400 });
  }

  if (recipient_id === user.id) {
    return NextResponse.json({ error: 'Je kunt niet met jezelf delen' }, { status: 400 });
  }

  // Get sender name
  const { data: sender } = await supabaseAdmin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();
  const senderName = sender?.display_name || 'Iemand';

  let message = '';
  let link = '';

  if (type === 'recipe') {
    const { data: recipe } = await supabaseAdmin
      .from('recipes')
      .select('title')
      .eq('id', item_id)
      .single();
    message = `${senderName} heeft het recept "${recipe?.title || 'een recept'}" met je gedeeld`;
    link = `/recepten/${item_id}`;
  } else if (type === 'collection') {
    const { data: collection } = await supabaseAdmin
      .from('collections')
      .select('title')
      .eq('id', item_id)
      .single();
    message = `${senderName} heeft de collectie "${collection?.title || 'een collectie'}" met je gedeeld`;
    link = `/collecties/${item_id}`;
  } else {
    return NextResponse.json({ error: 'Ongeldig type' }, { status: 400 });
  }

  await createNotification({
    recipientId: recipient_id,
    actorId: user.id,
    type: 'share',
    message,
    link,
  });

  return NextResponse.json({ success: true });
}
