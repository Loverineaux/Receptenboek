// ──────────────────────────────────────────────
// Enums / union types
// ──────────────────────────────────────────────

export type Source = string;

export type Difficulty = "Makkelijk" | "Gemiddeld" | "Moeilijk";

// ──────────────────────────────────────────────
// Core domain models (match DB column names)
// ──────────────────────────────────────────────

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  tijd: string | null;
  moeilijkheid: Difficulty | null;
  categorie: string | null;
  bron: Source | null;
  basis_porties: number;
  is_public: boolean;
  weetje: string | null;
  allergenen: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ingredient {
  id: string;
  recipe_id: string;
  hoeveelheid: string | null;
  eenheid: string | null;
  naam: string;
  sort_order: number;
}

export interface Step {
  id: string;
  recipe_id: string;
  titel: string | null;
  beschrijving: string;
  afbeelding_url: string | null;
  sort_order: number;
}

export interface Tag {
  id: string;
  name: string;
  created_by: string | null;
}

export interface RecipeTag {
  recipe_id: string;
  tag_id: string;
}

export interface Nutrition {
  recipe_id: string;
  energie_kcal: string | null;
  energie_kj: string | null;
  vetten: string | null;
  verzadigd: string | null;
  koolhydraten: string | null;
  suikers: string | null;
  vezels: string | null;
  eiwitten: string | null;
  zout: string | null;
}

export interface Rating {
  id: string;
  recipe_id: string;
  user_id: string;
  sterren: number; // 1-5
  created_at: string;
}

export interface Comment {
  id: string;
  recipe_id: string;
  user_id: string;
  parent_id: string | null;
  tekst: string;
  created_at: string;
}

export interface Favorite {
  user_id: string;
  recipe_id: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

// ──────────────────────────────────────────────
// Composite / joined types
// ──────────────────────────────────────────────

export interface RecipeWithRelations extends Recipe {
  ingredients: Ingredient[];
  steps: Step[];
  tags: Tag[];
  nutrition: Nutrition | null;
  ratings: Rating[];
  comments: Comment[];
  user: UserProfile | null;
  average_rating: number | null;
  is_favorited?: boolean;
}

// ──────────────────────────────────────────────
// AI extraction
// ──────────────────────────────────────────────

export interface ExtractedIngredient {
  hoeveelheid: string | null;
  eenheid: string | null;
  naam: string;
}

export interface ExtractedStep {
  titel: string | null;
  beschrijving: string;
}

export interface ExtractedRecipe {
  title: string;
  subtitle: string | null;
  bron: Source | null;
  basis_porties: number | null;
  tijd: string | null;
  moeilijkheid: Difficulty | null;
  ingredients: ExtractedIngredient[];
  steps: ExtractedStep[];
  tags: string[];
  nutrition: Omit<Nutrition, "recipe_id"> | null;
}
