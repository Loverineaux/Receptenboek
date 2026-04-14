export interface TourStep {
  id: string
  page: string
  targetSelector: string | null
  title: string
  description: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  padding?: number
  /** CSS selector of a button to click before showing this step (e.g. tab buttons) */
  clickBefore?: string
}

export const tourSteps: TourStep[] = [
  // ── Welcome modal ──
  {
    id: 'welcome',
    page: '/recepten',
    targetSelector: null,
    title: 'Welkom bij Receptenboek!',
    description: 'Fijn dat je er bent! Laten we samen even door de app lopen zodat je snel je weg kunt vinden.',
  },

  // ── Pagina 1: /recepten ──
  {
    id: 'navigation',
    page: '/recepten',
    targetSelector: '__responsive_nav__',
    title: 'Navigatie',
    description: 'Het menu waarmee je snel wisselt tussen alle onderdelen van de app: Recepten, Suggesties, Collecties, Favorieten en Ingrediënten.',
    position: 'bottom',
  },
  {
    id: 'search',
    page: '/recepten',
    targetSelector: '[data-tour="search-bar"]',
    title: 'Recepten zoeken',
    description: 'Zoek op titel, of vink "Zoek ook in ingrediënten" aan om te zoeken op recepten met specifieke ingrediënten.',
    position: 'bottom',
  },
  {
    id: 'filters',
    page: '/recepten',
    targetSelector: '[data-tour="category-filter"]',
    title: 'Categoriefilters',
    description: 'Filter snel op kip, vis, vegetarisch en meer. Tik op een categorie om te filteren.',
    position: 'bottom',
  },
  {
    id: 'recipe-card',
    page: '/recepten',
    targetSelector: '[data-tour="recipe-card"]',
    title: 'Receptkaarten',
    description: 'Elke kaart toont een recept met foto, titel en bereidingstijd. Tik op een kaart om het volledige recept te bekijken.',
    position: 'bottom',
  },
  {
    id: 'star-rating',
    page: '/recepten',
    targetSelector: '[data-tour="star-rating"]',
    title: 'Beoordeling',
    description: 'De sterren tonen het gemiddelde van alle beoordelingen. Klik om zelf een score te geven!',
    position: 'top',
  },
  {
    id: 'favorite',
    page: '/recepten',
    targetSelector: '[data-tour="favorite-button"]',
    title: 'Favorieten',
    description: 'Het hartje met het getal toont hoeveel mensen dit recept als favoriet hebben opgeslagen. Tik om het zelf op te slaan!',
    position: 'left',
  },
  {
    id: 'comments',
    page: '/recepten',
    targetSelector: '[data-tour="comment-count"]',
    title: 'Reacties',
    description: 'Dit getal toont hoeveel reacties er op een recept zijn geplaatst.',
    position: 'top',
  },
  {
    id: 'card-actions',
    page: '/recepten',
    targetSelector: '[data-tour="card-actions"]',
    title: 'Collecties en delen',
    description: 'Voeg recepten toe aan een collectie of deel ze met andere gebruikers via deze knoppen.',
    position: 'left',
  },
  {
    id: 'fab',
    page: '/recepten',
    targetSelector: '[data-tour="fab-button"]',
    title: 'Nieuw recept toevoegen',
    description: 'Tik op de groene + knop om een recept toe te voegen. Laten we even kijken hoe dat werkt!',
    position: 'left',
  },

  // ── Pagina: /recepten/nieuw ──
  {
    id: 'new-recipe-page',
    page: '/recepten/nieuw',
    targetSelector: '[data-tour="new-recipe-tabs"]',
    title: 'Recept aanmaken',
    description: 'Je kunt een recept op vier manieren toevoegen: plak een URL van een receptenwebsite, maak een foto van een recept, upload een PDF (bijv. een kookboek), of vul het handmatig in.',
    position: 'bottom',
    padding: 12,
  },
  {
    id: 'new-recipe-url',
    page: '/recepten/nieuw',
    targetSelector: '[data-tour="new-recipe-tabs"]',
    title: 'URL importeren',
    description: 'De makkelijkste manier! Plak een link van een receptenwebsite (bijv. Albert Heijn, HelloFresh) en het recept wordt automatisch overgenomen inclusief foto, ingrediënten en bereidingsstappen.',
    position: 'bottom',
    padding: 12,
  },

  {
    id: 'notifications',
    page: '/recepten',
    targetSelector: '[data-tour="notification-bell"]',
    title: 'Meldingen',
    description: 'Hier zie je nieuwe reacties, beoordelingen en andere updates. Het rode bolletje toont hoeveel ongelezen meldingen je hebt.',
    position: 'bottom',
  },

  // ── Pagina 2: /recepten/[id] ──
  {
    id: 'recipe-ingredients',
    page: '__first_recipe__',
    targetSelector: '[data-tour="recipe-ingredients"]',
    title: 'Ingrediënten & porties',
    description: 'Bekijk alle ingrediënten en pas het aantal porties aan. De hoeveelheden worden automatisch herberekend.',
    position: 'top',
  },
  {
    id: 'recipe-steps',
    page: '__first_recipe__',
    targetSelector: '[data-tour="recipe-steps"]',
    title: 'Bereidingsstappen',
    description: 'Hier vind je alle stappen om het recept te bereiden. Bij het aanpassen van porties worden de stappen automatisch herberekend.',
    position: 'top',
    clickBefore: '[data-tour="recipe-tabs"] button:nth-child(2)',
  },
  {
    id: 'recipe-nutrition',
    page: '__first_recipe__',
    targetSelector: '[data-tour="recipe-nutrition"]',
    title: 'Voedingswaarden',
    description: 'De voedingswaarden worden automatisch berekend op basis van de ingrediëntendatabase. Hoe meer producten daar zijn toegevoegd, hoe accurater deze waarden.',
    position: 'top',
    clickBefore: '[data-tour="recipe-tabs"] button:nth-child(3)',
  },
  {
    id: 'recipe-cook-mode',
    page: '__first_recipe__',
    targetSelector: '[data-tour="recipe-cook-mode"]',
    title: 'Kookmodus',
    description: 'Start de kookmodus: je scherm blijft aan en je kunt per bereidingsstap de AI om hulp vragen. Ideaal als je aan het koken bent!',
    position: 'bottom',
  },
  {
    id: 'recipe-comments',
    page: '__first_recipe__',
    targetSelector: '[data-tour="recipe-comments"]',
    title: 'Reacties',
    description: 'Plaats reacties en tips bij een recept. Andere gebruikers kunnen hierop reageren.',
    position: 'top',
  },
  {
    id: 'recipe-ai-chat',
    page: '__first_recipe__',
    targetSelector: '[data-tour="recipe-ai-chat"]',
    title: 'AI Assistent',
    description: 'Tik op deze knop om vragen te stellen over het recept. Bijvoorbeeld: "Kan ik de boter vervangen?" of "Hoe lang moet dit in de oven?"',
    position: 'left',
  },

  // ── Pagina 3: /collecties ──
  {
    id: 'collections',
    page: '/collecties',
    targetSelector: '[data-tour="collections-page"]',
    title: 'Collecties',
    description: 'Organiseer recepten in collecties. Je ziet hier alle collecties van alle gebruikers, en je eigen collecties. Je kunt collecties volgen, of dupliceren om er een eigen versie van te maken. Als een eigenaar je uitnodigt als Sous-chef kun je meewerken aan hun collectie.',
    position: 'top',
    padding: 16,
  },

  // ── Pagina 4: /suggesties ──
  {
    id: 'suggestions',
    page: '/suggesties',
    targetSelector: '[data-tour="suggesties-page"]',
    title: 'Wat koken?',
    description: 'Geen inspiratie? Krijg suggesties op basis van de ingrediënten die je in je koelkast hebt.',
    position: 'top',
    padding: 16,
  },

  // ── Pagina 5: /ingredienten ──
  {
    id: 'ingredients',
    page: '/ingredienten',
    targetSelector: '[data-tour="ingredienten-page"]',
    title: 'Ingrediënten',
    description: 'De ingrediëntendatabase achter de voedingswaarden. Hoe meer producten hier staan, hoe accurater de berekeningen. Je kunt producten scannen met je camera, nieuwe aanmaken en bijdragen aan de database.',
    position: 'top',
    padding: 16,
  },

  // ── Afsluiting ──
  {
    id: 'finish',
    page: '/recepten',
    targetSelector: null,
    title: 'Veel kookplezier!',
    description: 'Je kent nu alle mogelijkheden van Receptenboek. Je kunt de rondleiding altijd opnieuw starten via Instellingen.',
  },
]
