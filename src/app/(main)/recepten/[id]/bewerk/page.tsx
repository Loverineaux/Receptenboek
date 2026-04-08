'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import Button from '@/components/ui/Button';
import RecipeForm, { RecipeFormData } from '@/components/recipes/RecipeForm';
import type { RecipeWithRelations } from '@/types';

export default function BewerkReceptPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin: isAdminUser, loading: adminLoading } = useAdmin();
  const supabase = createClient();

  const [recipe, setRecipe] = useState<RecipeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecipe = useCallback(async () => {
    const { data } = await supabase
      .from('recipes')
      .select(
        `
        *,
        ingredients(*),
        steps(*),
        tags:recipe_tags(tag:tags(*)),
        nutrition(*),
        benodigdheden(*),
        ratings(*),
        comments(*),
        user:profiles!recipes_user_id_fkey(id, display_name, avatar_url)
      `
      )
      .eq('id', params.id)
      .single();

    if (!data) {
      setError('Recept niet gevonden');
      setLoading(false);
      return;
    }

    if (user && data.user_id !== user.id && !isAdminUser) {
      setError('Je hebt geen toegang om dit recept te bewerken');
      setLoading(false);
      return;
    }

    const flatTags = (data.tags ?? []).map((rt: any) => rt.tag).filter(Boolean);

    const r: RecipeWithRelations = {
      ...data,
      tags: flatTags,
      average_rating: null,
      nutrition: Array.isArray(data.nutrition)
        ? data.nutrition[0] ?? null
        : data.nutrition,
      ingredients: (data.ingredients ?? []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
      steps: (data.steps ?? []).sort(
        (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ),
      comments: data.comments ?? [],
      user: data.user as any,
    };

    setRecipe(r);
    setLoading(false);
  }, [supabase, params.id, user, isAdminUser]);

  useEffect(() => {
    if (authLoading || adminLoading) return;
    if (!user) { router.push('/login'); return; }
    fetchRecipe();
  }, [authLoading, adminLoading, user, fetchRecipe, router]);

  const handleSubmit = async (data: RecipeFormData) => {
    const res = await fetch(`/api/recipes/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      router.push(`/recepten/${params.id}`);
    } else {
      const err = await res.json();
      setError(err.error || 'Kon recept niet bijwerken');
    }
  };

  if (loading || authLoading || adminLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-xl font-semibold text-text-primary">{error}</h2>
        <Link href="/recepten">
          <Button variant="primary" className="mt-4">
            Terug naar recepten
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Recept bewerken</h1>

      {recipe && <RecipeForm initialData={recipe} onSubmit={handleSubmit} />}
    </div>
  );
}
