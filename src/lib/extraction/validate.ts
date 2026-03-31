/**
 * Validate an extracted recipe and return quality issues.
 * Does NOT invent or modify data — only reports what's missing or wrong.
 */

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ValidationResult {
  score: number; // 0-100
  issues: ValidationIssue[];
}

export function validateRecipe(recipe: any): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Title
  if (!recipe.title?.trim()) {
    issues.push({ field: 'title', severity: 'error', message: 'Geen titel gevonden' });
  }

  // Image
  if (!recipe.image_url) {
    issues.push({ field: 'image_url', severity: 'warning', message: 'Geen afbeelding gevonden' });
  }

  // Ingredients
  const ings = recipe.ingredients || [];
  if (ings.length === 0) {
    issues.push({ field: 'ingredients', severity: 'error', message: 'Geen ingrediënten gevonden' });
  } else {
    // Ingredients that naturally don't need quantities
    const noQtyNeeded = /^(olie|olijfolie|zonnebloemolie|boter|peper|zout|peper en zout|peper & zout|naar smaak|water|bakvet|roomboter|sesamolie)/i;
    const needsQty = ings.filter((i: any) => !noQtyNeeded.test((i.naam || '').trim()));
    const missingQty = needsQty.filter((i: any) => !i.hoeveelheid).length;

    if (missingQty === needsQty.length && needsQty.length > 0) {
      issues.push({ field: 'ingredients', severity: 'error', message: 'Geen enkele hoeveelheid bij ingrediënten — porties aanpassen werkt niet' });
    } else if (missingQty > 0) {
      issues.push({ field: 'ingredients', severity: 'warning', message: `${missingQty} van ${needsQty.length} ingrediënten missen een hoeveelheid` });
    }

    // Units: only flag if a numeric quantity has no unit AND the name doesn't imply a countable item
    // "2 uien" = fine (countable), "600 kippendijen" = needs "gram"
    const noUnitOk = /^(ui|uien|ei|eieren|tomaat|tomaten|paprika|aardappel|aardappelen|wortel|wortelen|citroen|limoen|avocado|banaan|bananen|appel|peer|mango|kaneelstokje|kruidnagel|kruidnagels|laurierblad|laurierbladeren|blaadjes?|teentje|teentjes|takje|takjes)/i;
    const needsUnit = ings.filter((i: any) => {
      if (!i.hoeveelheid || i.eenheid) return false;
      const naam = (i.naam || '').trim();
      if (noQtyNeeded.test(naam)) return false;
      if (noUnitOk.test(naam)) return false;
      // Large numbers (>10) usually need a unit (gram, ml)
      const num = parseFloat(i.hoeveelheid);
      return !isNaN(num) && num > 10;
    });
    if (needsUnit.length > 0) {
      issues.push({ field: 'ingredients', severity: 'info', message: `${needsUnit.length} ingrediënten missen mogelijk een eenheid (gram, ml, stuks etc.)` });
    }
  }

  // Steps
  const steps = recipe.steps || [];
  if (steps.length === 0) {
    issues.push({ field: 'steps', severity: 'error', message: 'Geen bereidingsstappen gevonden' });
  } else if (steps.length === 1) {
    issues.push({ field: 'steps', severity: 'warning', message: 'Slechts 1 bereidingsstap — mogelijk onvolledig' });
  }

  // Portions
  if (!recipe.basis_porties) {
    issues.push({ field: 'basis_porties', severity: 'warning', message: 'Aantal porties onbekend — porties aanpassen werkt mogelijk niet correct' });
  }

  // Subtitle/intro
  if (!recipe.subtitle) {
    issues.push({ field: 'subtitle', severity: 'info', message: 'Geen introductietekst gevonden' });
  }

  // Nutrition
  if (!recipe.nutrition || Object.values(recipe.nutrition).every((v: any) => !v)) {
    issues.push({ field: 'nutrition', severity: 'info', message: 'Geen voedingswaarden gevonden' });
  }

  // Time
  if (!recipe.tijd) {
    issues.push({ field: 'tijd', severity: 'info', message: 'Geen bereidingstijd gevonden' });
  }

  // Bron
  if (!recipe.bron || recipe.bron === 'Eigen recept') {
    issues.push({ field: 'bron', severity: 'info', message: 'Geen bron gedetecteerd' });
  }

  // Calculate score
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  let score = 100;
  score -= errorCount * 25;
  score -= warningCount * 10;
  score -= infoCount * 3;
  score = Math.max(0, Math.min(100, score));

  return { score, issues };
}
