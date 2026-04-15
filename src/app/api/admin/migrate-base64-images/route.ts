import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// One-time migration: upload base64 images to Supabase Storage
export async function POST() {
  const { data: recipes, error } = await supabaseAdmin
    .from('recipes')
    .select('id, title, image_url')
    .like('image_url', 'data:%');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!recipes?.length) return NextResponse.json({ message: 'No base64 images found', migrated: 0 });

  const results = [];

  for (const recipe of recipes) {
    try {
      const base64Data = recipe.image_url.split(',')[1];
      const mimeMatch = recipe.image_url.match(/data:(image\/\w+);/);
      const mime = mimeMatch?.[1] || 'image/jpeg';
      const ext = mime.split('/')[1] || 'jpg';

      const buffer = Buffer.from(base64Data, 'base64');
      const path = `recipes/migrated-${recipe.id}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('recipe-images')
        .upload(path, buffer, { contentType: mime, upsert: true });

      if (uploadError) {
        results.push({ id: recipe.id, title: recipe.title, error: uploadError.message });
        continue;
      }

      const { data: publicUrl } = supabaseAdmin.storage
        .from('recipe-images')
        .getPublicUrl(path);

      const { error: updateError } = await supabaseAdmin
        .from('recipes')
        .update({ image_url: publicUrl.publicUrl })
        .eq('id', recipe.id);

      if (updateError) {
        results.push({ id: recipe.id, title: recipe.title, error: updateError.message });
      } else {
        results.push({ id: recipe.id, title: recipe.title, newUrl: publicUrl.publicUrl });
      }
    } catch (err: any) {
      results.push({ id: recipe.id, title: recipe.title, error: err.message });
    }
  }

  return NextResponse.json({ migrated: results.length, results });
}
