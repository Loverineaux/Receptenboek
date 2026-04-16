# Receptenboek Component Documentatie

Deze documentatie beschrijft alle React componenten en hooks van het Receptenboek project, gestructureerd naar functionaliteit.

## Layout Componenten

### GoogleLogo
**Locatie:** `src/components/icons/GoogleLogo.tsx`

**Beschrijving:** 
Simpel SVG icoon component voor de Google logo, gebruikt bij OAuth authenticatie.

**Props:**
- `className?: string` - CSS classes voor styling (default: 'h-5 w-5')

**State:** Geen

**Afhankelijkheden:** Geen

---

### FabButton
**Locatie:** `src/components/layout/FabButton.tsx`

**Beschrijving:** 
Floating Action Button die contextafhankelijk verschillende acties toont. Positioneert zich rechtsonder en past zich aan per pagina.

**Props:** Geen

**State:** Geen

**Afhankelijkheden:**
- `usePathname` van Next.js
- Custom event dispatching voor collecties

**Gedrag per route:**
- `/collecties` - Dispatcht 'fab:new-collection' event
- `/recepten` - Navigeert naar nieuwe recept pagina
- Andere routes - Toont geen FAB

---

### Footer
**Locatie:** `src/components/layout/Footer.tsx`

**Beschrijving:** 
Lege footer component, momenteel geen content.

**Props:** Geen

**State:** Geen

**Afhankelijkheden:** Geen

---

### Header
**Locatie:** `src/components/layout/Header.tsx`

**Beschrijving:** 
Hoofdnavigatie met logo, desktop/mobile navigatie, notificatie bel en gebruikersmenu. Sticky header met responsive gedrag.

**Props:** Geen

**State:**
- `userMenuOpen: boolean` - Status van gebruikersmenu dropdown
- `userMenuRef: RefObject` - Reference voor outside-click detection

**Afhankelijkheden:**
- `useAuth` hook voor gebruikersgegevens
- `useAdmin` hook voor admin status
- `NotificationBell` component
- `usePathname` voor actieve navigatie styling

**Features:**
- Desktop horizontale navigatie
- Mobile hamburger menu (geïmpliceerd)
- User avatar/naam dropdown
- Admin panel toegang voor beheerders

---

### NavigationProgress
**Locatie:** `src/components/layout/NavigationProgress.tsx`

**Beschrijving:** 
Toont een loading bar bovenaan de pagina tijdens route navigatie. Intercepteert link clicks en toont progressieve loading animatie.

**Props:** Geen

**State:**
- `loading: boolean` - Of er momenteel wordt genavigeerd
- `progress: number` - Progress percentage (0-100)
- `prevPathname: useRef<string>` - Vorige pathname voor change detection

**Afhankelijkheden:**
- `usePathname` van Next.js

**Gedrag:**
- Start loading op link clicks
- Simuleert progressieve loading tot 90%
- Completeert bij pathname change

---

### PWAInstall
**Locatie:** `src/components/layout/PWAInstall.tsx`

**Beschrijving:** 
Toont een installatie banner voor Progressive Web App functionaliteit. Registreert Service Worker en toont install prompt.

**Props:** Geen

**State:**
- `deferredPrompt: BeforeInstallPromptEvent | null` - Browser install prompt
- `showBanner: boolean` - Of banner getoond moet worden

**Afhankelijkheden:**
- Browser BeforeInstallPromptEvent API
- Service Worker registratie
- LocalStorage voor dismiss state

**Features:**
- Automatische Service Worker registratie (alleen productie)
- Native install prompt handling
- Permanente dismiss functionaliteit

---

## Notifications Componenten

### NotificationBell
**Locatie:** `src/components/notifications/NotificationBell.tsx`

**Beschrijving:** 
Notificatie bel icoon met badge counter en dropdown panel. Toont lijst van notificaties met acties voor lezen/verwijderen.

**Props:** Geen

**State:**
- `open: boolean` - Status van notificatie panel
- `confirmDeleteAll: boolean` - Confirmatie dialog voor alles verwijderen
- `panelRef: RefObject` - Outside click detection

**Afhankelijkheden:**
- `useNotifications` hook voor notificatie data
- `useRouter` voor navigatie naar gerelateerde content
- `ConfirmDialog` component

**Features:**
- Real-time unread count badge
- Uitklapbaar notificatie panel
- Bulk acties (alles markeren als gelezen/verwijderen)
- Individuele notificatie acties
- Navigatie naar gerelateerde content

**Notificatie types:**
- comment, reply, favorite, rating, comment_like
- collection_follow, collection_invite, share

---

## Recipes Componenten

### AddToCollectionModal
**Locatie:** `src/components/recipes/AddToCollectionModal.tsx`

**Beschrijving:** 
Modal voor het toevoegen van recepten aan collecties. Toont lijst van gebruikerscolecties met status (bevat recept al of niet).

**Props:**
- `recipeId: string` - ID van het toe te voegen recept
- `open: boolean` - Modal open status
- `onClose: () => void` - Close callback

**State:**
- `collections: CollectionItem[]` - Lijst van gebruikerscolecties
- `loading: boolean` - Laadstatus
- `creating: boolean` - Status nieuwe collectie aanmaken
- `newTitle: string` - Titel voor nieuwe collectie
- `togglingId: string | null` - ID van collectie die getoggeld wordt
- `removeTarget: CollectionItem | null` - Collectie voor remove confirmatie

**Afhankelijkheden:**
- `useAuth` voor gebruikersdata
- `Modal`, `Button`, `ConfirmDialog` components
- Collections API endpoints

**Features:**
- Tonen van eigen + collaborator collecties
- Visuele indicatie of recept al in collectie zit
- Nieuwe collectie aanmaken inline
- Confirmatie bij verwijderen uit collectie
- Auto-close na succesvolle actie

---

### CollectionCard
**Locatie:** `src/components/recipes/CollectionCard.tsx`

**Beschrijving:** 
Card component voor collectie weergave in grid/lijst. Toont 2x2 preview van recept afbeeldingen en collectie metadata.

**Props:**
- `collection: CollectionWithDetails` - Collectie data
- `onRate?: (collectionId: string, rating: number) => void` - Rating callback
- `userRating?: number` - Huidige gebruiker rating
- `initialUserRating?: number` - Initiële rating voor live berekening

**State:** Geen (controlled component)

**Afhankelijkheden:**
- `useRouter` voor navigatie
- `StarRating` component
- Next.js Image optimizatie

**Features:**
- 2x2 grid van recept preview afbeeldingen
- Status badges (Volgend, Sous-chef)
- Click-to-navigate naar collectie detail
- Interactive star rating (indien onRate provided)
- Responsive hover effects

---

### CookMode
**Locatie:** `src/components/recipes/CookMode.tsx`

**Beschrijving:** 
Fullscreen kookstand voor het volgen van recept stappen. Inclusief ingredient overzicht, stap-voor-stap navigatie en optionele AI chat.

**Props:**
- `title: string` - Recept titel
- `steps: Array<{titel?: string, beschrijving: string}>` - Recept stappen
- `ingredients: Array<{hoeveelheid?: string, eenheid?: string, naam: string}>` - Ingrediënten
- `portions: number` - Aantal porties
- `onClose: () => void` - Sluit kookstand
- `recipe?: RecipeWithRelations` - Volledige recept data voor chat
- `chatMessages?: ChatMessage[]` - Chat berichten
- `onChatMessagesChange?: (messages: ChatMessage[]) => void` - Chat update callback

**State:**
- `currentStep: number` - Huidige stap (-1 = ingrediënten overzicht)
- `chatOpen: boolean` - Status van AI chat panel

**Afhankelijkheden:**
- `RecipeChat` component voor AI integratie
- Wake Lock API voor scherm aan houden

**Features:**
- Wake lock om scherm actief te houden
- Keyboard navigatie (pijltjestoetsen, spatie, escape)
- Touch swipe navigatie (alleen als chat gesloten)
- Ingrediënten overzicht met porties aanpassing
- Stap-voor-stap weergave met navigatie
- Optionele AI chat integratie
- Progress indicator

---

### RecipeCard
**Locatie:** `src/components/recipes/RecipeCard.tsx`

**Beschrijving:** 
Hoofdcomponent voor recept weergave in lijsten en grids. Toont afbeelding, metadata, ratings, en actie buttons.

**Props:**
- `recipe: RecipeWithRelations` - Recept data
- `onFavoriteToggle?: (recipeId: string, isFavorited: boolean) => void` - Favoriet toggle
- `onRate?: (recipeId: string, rating: number) => void` - Rating callback
- `userRating?: number` - Huidige gebruiker rating  
- `onAddToCollection?: (recipeId: string) => void` - Collectie toevoeg callback
- `isInCollection?: boolean` - Of recept in collectie zit
- `initialUserRating?: number` - Initiële rating
- `onShare?: (recipeId: string) => void` - Deel callback

**State:**
- Live rating berekening gebaseerd op API data en user input

**Afhankelijkheden:**
- `useRouter` voor navigatie
- `BronBadge`, `StarRating` components
- Next.js Image component

**Features:**
- Responsive afbeelding met fallback
- Live gemiddelde rating berekening
- Categorie tag filtering badges
- Favorite hartje toggle
- Collectie toevoegen/verwijderen
- Deel functionaliteit
- Click-to-navigate naar detail
- Bron badge weergave
- Tijd en metadata badges

---

### RecipeChat
**Locatie:** `src/components/recipes/RecipeChat.tsx`

**Beschrijving:** 
AI chat component voor recepten met contextual suggestions. Integreert met OpenAI voor receptgerelateerde vragen.

**Props:**
- `recipe: RecipeWithRelations` - Recept data voor context
- `compact?: boolean` - Compacte modus voor cook mode
- `cookModeContext?: CookModeContext` - Huidige kookstap context
- `messages?: ChatMessage[]` - Externe berichten state
- `onMessagesChange?: (messages: ChatMessage[]) => void` - Berichten update

**State:**
- `messages: ChatMessage[]` - Chat berichten (user/assistant)
- `input: string` - Huidige input tekst
- `loading: boolean` - Wacht op AI response
- `error: string | null` - Error state

**Afhankelijkheden:**
- Chat API endpoint
- Recipe context voor slimme suggestions

**Features:**
- Contextual suggestion chips gebaseerd op:
  - Ingrediënten (vervangingen, gebruik)
  - Kookstap (technieken, timing)
  - Algemene receptvragen
- Real-time AI chat met OpenAI
- Persistent berichten geschiedenis
- Ingredient extraction voor slimme vragen
- Error handling en retry logica
- Compact modus voor kookstand

---

### RecipeForm
**Locatie:** `src/components/recipes/RecipeForm.tsx`

**Beschrijving:** 
Complexe form component voor het aanmaken/bewerken van recepten. Ondersteunt alle recept velden inclusief ingrediënten, stappen, nutritie.

**Props:**
- `initialData?: RecipeWithRelations | ExtractedRecipe | null` - Initiële data
- `onSubmit: (data: RecipeFormData) => Promise<void>` - Submit callback

**State:**
- Uitgebreide form state voor alle recept velden:
  - `title, subtitle, image_url, tijd, moeilijkheid`
  - `ingredients: IngredientRow[]`
  - `steps: StepRow[]` 
  - `nutrition: NutritionState`
  - `benodigdheden, tags`
  - En meer...

**Afhankelijkheden:**
- `Button`, `Input`, `BronInput` components
- Supabase client voor afbeelding uploads
- Verschillende UI helpers

**Features:**
- Dynamische ingrediënten lijst (toevoegen/verwijderen rijen)
- Dynamische stappen lijst met afbeelding upload per stap
- Nutritie informatie formulier
- Tag systeem met voorgestelde categorieën  
- Benodigdheden lijst
- Afbeelding upload voor hoofd + stap afbeeldingen
- Form validatie en error handling
- Collapsible secties voor overzicht

---

## Ingredients Componenten

### BarcodeScanner
**Locatie:** `src/components/ingredients/BarcodeScanner.tsx`

**Beschrijving:** 
Camera-gebaseerde barcode scanner voor product identificatie. Gebruikt native BarcodeDetector API waar mogelijk, valt terug op ZXing library.

**Props:**
- `onScan: (barcode: string) => void` - Callback bij succesvolle scan
- `onClose: () => void` - Sluit scanner

**State:**
- `manualBarcode: string` - Handmatig ingevoerde barcode
- `error: string | null` - Error state
- `isStarting: boolean` - Initialisatie status
- `isNative: boolean` - Of native BarcodeDetector gebruikt wordt

**Afhankelijkheden:**
- Browser BarcodeDetector API (Chrome Android)
- ZXing-js library als fallback
- Camera API (getUserMedia)

**Features:**
- Native BarcodeDetector voor optimale performance
- ZXing fallback voor andere browsers
- Real-time camera scanning
- Handmatige barcode invoer optie
- Error handling voor camera/permission problemen
- Ondersteuning voor EAN-13, EAN-8, UPC-A, UPC-E, Code-128

---

### IngredientCard  
**Locatie:** `src/components/ingredients/IngredientCard.tsx`

**Beschrijving:**
Card component voor ingrediënt weergave. Toont afbeelding, naam, categorie en statistieken.

**Props:**
- `ingredient: GenericIngredient & { recipe_count?: number }` - Ingrediënt data

**State:** Geen

**Afhankelijkheden:**
- `useRouter` voor navigatie
- Next.js Image component

**Features:**
- Categorie emoji badges
- Product count en recept count weergave
- Gemiddelde kcal weergave
- Click-to-navigate naar detail
- Responsive hover effects
- Fallback emoji per categorie

---

### NutritionBar
**Locatie:** `src/components/ingredients/NutritionBar.tsx`

**Beschrijving:**
Visuele weergave van voedingswaarden met macro nutriënt verdeling en coverage indicator.

**Props:**
- `calculation: NutritionCalculation` - Nutritie berekening data

**State:**
- `showMissing: boolean` - Toon ontbrekende ingrediënten lijst

**Afhankelijkheden:** Geen

**Features:**
- Prominente kcal weergave per portie
- Macro nutriënt bars (eiwit/vet/koolhydraten)
- Coverage percentage indicator
- Collapsible lijst van ontbrekende ingrediënten
- Kleurgecodeerde coverage status

---

### ProductCard
**Locatie:** `src/components/ingredients/ProductCard.tsx`

**Beschrijving:**
Bewerkbare card voor product weergave met inline editing, afbeelding lightbox en admin functies.

**Props:**
- `product: Product` - Product data
- `onUpdated?: (product: Product) => void` - Update callback
- `onDeleted?: (productId: string) => void` - Delete callback  
- `onTransfer?: (productId: string) => void` - Transfer callback
- `canEdit?: boolean` - Edit permissies

**State:**
- `editing: boolean` - Edit modus status
- `saving: boolean` - Save status
- `lightboxOpen: boolean` - Afbeelding lightbox
- `confirmDelete: boolean` - Delete confirmatie
- `form: object` - Edit form data
- `imgPreview: string | null` - Afbeelding preview

**Afhankelijkheden:**
- `ConfirmDialog` component
- Supabase client voor updates
- Next.js Image component

**Features:**
- Inline editing van alle product velden
- Afbeelding lightbox met ESC/click-outside sluiten
- Bron badges (Open Food Facts, User scan, etc.)
- Delete confirmatie dialog
- Transfer functionaliteit naar andere gebruikers
- Real-time form updates
- Afbeelding upload via camera/file

---

## UI Componenten

### AvatarCropModal
**Locatie:** `src/components/ui/AvatarCropModal.tsx`

**Beschrijving:**
Modal voor het bijsnijden van profielafbeeldingen tot cirkelvorm met zoom en rotatie controls.

**Props:**
- `open: boolean` - Modal status
- `imageSrc: string` - Bron afbeelding URL
- `onClose: () => void` - Close callback
- `onCropComplete: (croppedBlob: Blob) => void` - Crop result callback

**State:**
- `crop: {x, y}` - Crop positie
- `zoom: number` - Zoom level (1-3)
- `rotation: number` - Rotatie in graden
- `croppedAreaPixels: Area | null` - Crop gebied
- `saving: boolean` - Processing status

**Afhankelijkheden:**
- `react-easy-crop` library
- `Modal`, `Button` components
- Canvas API voor afbeelding processing

**Features:**
- Circulaire crop vorm voor avatars
- Zoom controls (slider + buttons)
- 90° rotatie functionaliteit  
- Real-time preview
- Output optimalisatie (400x400 JPEG)
- Touch/mouse gesture support

---

### BronBadge
**Locatie:** `src/components/ui/BronBadge.tsx`

**Beschrijving:**
Badge component voor recept bronnen met voorgedefinieerde kleuren per bron.

**Props:**
- `bron: string | null` - Bron naam

**State:** Geen

**Afhankelijkheden:** Geen

**Features:**
- Voorgedefinieerde kleuren voor bekende bronnen (HelloFresh, AH, etc.)
- Hash-based kleur selectie voor onbekende bronnen
- Null-safe rendering

---

### BronInput  
**Locatie:** `src/components/ui/BronInput.tsx`

**Beschrijving:**
Autocomplete input voor recept bronnen met suggesties uit bestaande recepten.

**Props:**
- `value: string` - Huidige waarde
- `onChange: (value: string) => void` - Change callback
- `disabled?: boolean` - Disabled status

**State:**
- `suggestions: string[]` - Suggestie lijst
- `allBronnen: string[]` - Alle bekende bronnen
- `open: boolean` - Dropdown status
- `activeIndex: number` - Keyboard navigation index

**Afhankelijkheden:**
- Supabase client voor bronnen ophalen
- Outside click detection

**Features:**
- Real-time filtering van suggesties
- Keyboard navigatie (pijltjes, enter, escape)
- Mouse hover selection
- Automatisch laden van bestaande bronnen
- Outside click sluiten

---

### Button
**Locatie:** `src/components/ui/Button.tsx`

**Beschrijving:**
Basis button component met variants, sizes en loading states.

**Props:**
- `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'` - Stijl variant
- `size?: 'sm' | 'md' | 'lg'` - Grootte
- `loading?: boolean` - Loading state met spinner
- Plus alle native button props

**State:** Geen

**Afhankelijkheden:**
- Lucide React voor loading icon

**Features:**
- Voorgedefinieerde stijl variants
- Loading state met spinner icon
- Disabled handling
- Forward ref support
- Tailwind CSS styling

---

### CategoryFilter
**Locatie:** `src/components/ui/CategoryFilter.tsx`

**Beschrijving:**
Horizontaal scrollbare filter chips voor recept categorieën.

**Props:**
- `selected: string | null` - Geselecteerde categorie
- `onChange: (category: string | null) => void` - Change callback

**State:** Geen

**Afhankelijkheden:** Geen

**Features:**
- Horizontaal scrollbare chip layout
- "Alles" optie voor geen filter
- Active state styling
- Tour integration (data-tour attribuut)

---

### ConfirmDialog
**Locatie:** `src/components/ui/ConfirmDialog.tsx`

**Beschrijving:**
Modal bevestigingsdialoag voor destructieve acties.

**Props:**
- `open: boolean` - Dialog status
- `title: string` - Dialog titel
- `message: string` - Bevestigingsbericht
- `confirmLabel?: string` - Bevestig button tekst
- `cancelLabel?: string` - Annuleer button tekst
- `variant?: 'danger' | 'primary'` - Button variant
- `onConfirm: () => void` - Bevestig callback
- `onCancel: () => void` - Annuleer callback

**State:** Geen

**Afhankelijkheden:**
- `Button` component

**Features:**
- Backdrop overlay
- Configurable labels en variant
- Keyboard accessible
- Mobile responsive

---

### DonationCard
**Locatie:** `src/components/ui/DonationCard.tsx`

**Beschrijving:**
Card die donation opties toont gebaseerd op gebruikersactiviteit (recept extracties).

**Props:**
- `extractionCount: number` - Aantal uitgevoerde extracties  
- `compact?: boolean` - Compacte weergave modus

**State:**
- `dismissed: boolean` - Of card weggedrukt is
- `creatorAvatar: string | null` - Avatar van app maker

**Afhankelijkheden:**
- Supabase client voor admin avatar
- PayPal externe links

**Features:**
- Dynamische messaging gebaseerd op extraction count
- Maker avatar ophalen uit admin profiel
- PayPal integratie met bedrag suggesties
- Dismissible met X button
- Persoonlijke toon ("Robin, de maker van...")

---

### IngredientChips
**Locatie:** `src/components/ui/IngredientChips.tsx`

**Beschrijving:**
Tag-style ingredient selector met autocomplete suggesties.

**Props:**
- `items: string[]` - Geselecteerde ingrediënten
- `onAdd: (item: string) => void` - Toevoeg callback
- `onRemove: (item: string) => void` - Verwijder callback

**State:**
- `input: string` - Huidige input waarde
- `suggestions: string[]` - Ingrediënt suggesties

**Afhankelijkheden:**
- Supabase client voor ingrediënt suggesties
- Plus icon component

**Features:**
- Chip-based weergave van geselecteerde items
- Real-time input met enter/comma toevoegen
- Backspace verwijdering van laatste item
- Suggestie buttons voor snelle selectie
- Duplicate prevention
- Willekeurige ingredient suggesties uit database

---

### Input
**Locatie:** `src/components/ui/Input.tsx`

**Beschrijving:**
Basis input component met label, error states en icon ondersteuning.

**Props:**
- `label?: string` - Input label
- `error?: string` - Error bericht
- `icon?: ReactNode` - Links icon
- `endIcon?: ReactNode` - Rechts icon
- Plus alle native input props

**State:** Geen

**Afhankelijkheden:**
- Forward ref support

**Features:**
- Automatische label-input koppeling
- Error state styling en bericht
- Icon positioning (links/rechts)
- Focus states en transitions
- Enter key blur (behalve search type)

---

### MobileFilterSheet
**Locatie:** `src/components/ui/MobileFilterSheet.tsx`

**Beschrijving:**
Mobile bottom sheet voor geavanceerde filter opties met desktop inline variant.

**Props:**
- `source: string` - Bron filter
- `onSourceChange, sourceOptions` - Bron filter handling
- `includedSources, excludedSources` - Include/exclude filters
- `sort, sortOptions` - Sorteer opties
- En meer filter related props...

**State:**
- `open: boolean` - Sheet open status op mobile

**Afhankelijkheden:**
- `Button` component
- Body scroll lock tijdens sheet open

**Features:**
- Responsive: sheet op mobile, inline op desktop
- Active filter count badge
- Include/exclude source filtering
- Sort options
- Reset all filters functionaliteit
- Body scroll prevention op mobile
- Chip-based filter weergave

---

### Modal
**Locatie:** `src/components/ui/Modal.tsx`

**Beschrijving:**
Basis modal component met backdrop, header en optional footer.

**Props:**
- `open: boolean` - Modal status
- `onClose: () => void` - Close callback
- `title: string` - Modal titel
- `children: ReactNode` - Modal content
- `footer?: ReactNode` - Optional footer content

**State:** Geen

**Afhankelijkheden:**
- Lucide React voor close icon
- Keyboard event handling

**Features:**
- Backdrop click-to-close
- ESC key sluiten
- Body scroll lock
- Header met title en close button
- Optional footer area
- Mobile responsive sizing

---

### PortieSelector
**Locatie:** `src/components/ui/PortieSelector.tsx`

**Beschrijving:**
Numeric stepper voor het selecteren van aantal porties.

**Props:**
- `value: number` - Huidige waarde
- `onChange: (value: number) => void` - Change callback

**State:** Geen

**Afhankelijkheden:**
- Lucide React voor plus/minus icons

**Features:**
- Plus/minus buttons met disabled states
- Range beperking (1-20)
- Center-aligned value display
- Accessibility support

---

### PullToRefresh
**Locatie:** `src/components/ui/PullToRefresh.tsx`

**Beschrijving:**
Native mobile pull-to-refresh functionaliteit voor content verversing.

**Props:**
- `onRefresh: () => Promise<void>` - Refresh callback
- `children: ReactNode` - Content om te wrappen

**State:**
- `pulling: boolean` - Of er getrokken wordt
- `pullDistance: number` - Trek afstand
- `refreshing: boolean` - Refresh status

**Afhankelijkheden:**
- Touch event handling
- Scroll position detection

**Features:**
- Touch gesture detection
- Visual feedback met afstand-based scaling
- Threshold-based trigger (80px)
- Damped pull distance voor natuurlijk gevoel
- Loading indicator tijdens refresh
- Scroll position check (alleen aan top)

---

### SearchBar
**Locatie:** `src/components/ui/SearchBar.tsx`

**Beschrijving:**
Search input met debouncing en optionele ingrediënt zoek toggle.

**Props:**
- `value?: string` - Controlled value
- `onChange: (value: string) => void` - Change callback  
- `placeholder?: string` - Placeholder tekst
- `searchIngredients?: boolean` - Of ook in ingrediënten gezocht wordt
- `onSearchIngredientsChange?: (value: boolean) => void` - Ingredient toggle callback

**State:**
- `internalValue: string` - Interne input waarde
- Debounce timer voor onChange

**Afhankelijkheden:**
- Lucide React voor search/clear icons
- Timeout debouncing

**Features:**
- 400ms debounced onChange
- Clear button wanneer waarde aanwezig
- Optional ingredient search checkbox
- Enter key blur
- Tour integration marker
- Placeholder switching gebaseerd op search mode

---

### ShareModal
**Locatie:** `src/components/ui/ShareModal.tsx`

**Beschrijving:**
Modal voor het delen van recepten/collecties via link of direct naar gebruikers.

**Props:**
- `open: boolean` - Modal status
- `title: string` - Item titel
- `url: string` - Share URL
- `shareType: 'recipe' | 'collection'` - Type content
- `itemId: string` - Item ID
- `excludeUserIds?: string[]` - Gebruikers om uit te sluiten van search

**State:**
- `search: string` - Gebruiker zoek query
- `users: UserResult[]` - Zoekresultaten
- `searching: boolean` - Search status
- `sentTo: Set<string>` - Gebruikers waarnaar verzonden
- `copied: boolean` - Link copy status
- `toast: string | null` - Toast notificatie

**Afhankelijkheden:**
- `useAuth` hook
- Supabase client
- User search API
- Clipboard API

**Features:**
- Copy-to-clipboard link sharing
- User search met debouncing
- Direct delen naar specifieke gebruikers
- Toast notifications voor feedback
- Exclude list voor eigenaren/collaborators
- Send status tracking per gebruiker

---

### SignOutButton
**Locatie:** `src/components/ui/SignOutButton.tsx`

**Beschrijving:**
Simple sign out button met redirect naar login.

**Props:** Geen

**State:** Geen

**Afhankelijkheden:**
- `useAuth` hook

**Features:**
- Sign out via auth hook
- Automatische redirect naar /login

---

### StarRating
**Locatie:** `src/components/ui/StarRating.tsx`

**Beschrijving:**
Interactive of read-only sterren rating component met hover states.

**Props:**
- Interactive variant:
  - `value: number` - Huidige rating
  - `onChange: (rating: number) => void` - Rating callback
  - `readOnly?: false`
- Read-only variant:
  - `value: number` - Rating waarde
  - `readOnly: true`  
  - `count?: number` - Aantal ratings
  - `small?: boolean` - Kleine weergave

**State:**
- `hovered: number` - Hovered rating voor preview

**Afhankelijkheden:**
- Lucide React voor star icons

**Features:**
- Interactive mode met hover preview
- Read-only mode met count weergave
- Half-star ondersteuning (visueel)
- Small size variant
- Filled/empty states met smooth transitions

---

### UserPicker
**Locatie:** `src/components/ui/UserPicker.tsx`

**Beschrijving:**
User selector met search functionaliteit voor team/collaborator toevoeging.

**Props:**
- `selectedUsers: UserProfile[]` - Geselecteerde gebruikers
- `onAdd, onRemove` - Add/remove callbacks
- `maxUsers?: number` - Maximum aantal (default 10)
- `excludeIds?: string[]` - Uit te sluiten user IDs

**State:**
- `query: string` - Zoek query
- `results: UserProfile[]` - Zoekresultaten  
- `loading: boolean` - Search status
- `open: boolean` - Dropdown status

**Afhankelijkheden:**
- User search API endpoint
- Outside click detection
- Debounced search

**Features:**
- Chip-based selected users weergave
- Real-time user search (2+ characters)
- Exclude logic voor duplicates
- Maximum users enforcement
- Avatar + display name weergave
- Dropdown results met click selection

---

## Tour Componenten

### TourOverlay
**Locatie:** `src/components/tour/TourOverlay.tsx`

**Beschrijving:**
SVG overlay voor tour spotlight effect dat specifieke elementen uitlicht.

**Props:**
- `targetRect: DOMRect | null` - Positie van uit te lichten element
- `padding?: number` - Padding rond target (default 8px)

**State:**
- `rect: DOMRect | null` - Interne rect state voor smooth transitions

**Afhankelijkheden:** Geen

**Features:**
- SVG mask-based spotlight effect
- Smooth transitions tussen targets
- Rounded corner uitlichtingen
- Full dark overlay zonder target
- Click-through prevention op overlay

---

### TourProvider
**Locatie:** `src/components/tour/TourProvider.tsx`

**Beschrijving:**
Context provider voor app-wide tour functionaliteit met step management en navigatie.

**Props:**
- `children: ReactNode` - App content

**State:**
- `isActive: boolean` - Of tour actief is
- `currentStep: number` - Huidige tour step index
- `targetRect: DOMRect | null` - Positie van huidige target
- `firstRecipeId: string | null` - ID van eerste recept voor dynamic routing
- `transitioning: boolean` - Page transition status

**Afhankelijkheden:**
- `useAuth` voor gebruikersdata
- Tour steps configuratie
- `TourOverlay`, `TourTooltip` components
- Supabase voor tour completion tracking

**Features:**
- Auto-start tour voor nieuwe gebruikers
- Dynamic page navigation tijdens tour
- Element polling tot target beschikbaar
- Responsive selector resolution
- Tour completion persistentie
- Context voor child components

---

### TourTooltip
**Locatie:** `src/components/tour/TourTooltip.tsx`

**Beschrijving:**
Positioneerbare tooltip voor tour steps met navigatie controls.

**Props:**
- `targetRect: DOMRect | null` - Target element positie
- `title, description` - Content
- `position?: 'top' | 'bottom' | 'left' | 'right'` - Gewenste positie
- `currentStep, totalSteps` - Progress info
- `onNext, onPrev, onSkip` - Navigatie callbacks
- `isFirst, isLast, isWelcome, isFinish` - State flags

**State:**
- `pos: {top, left}` - Berekende tooltip positie

**Afhankelijkheden:**
- Dynamic positioning berekeningen
- Viewport collision detection

**Features:**
- Intelligente positionering met fallbacks
- Viewport edge collision avoidance
- Progress dots voor step tracking
- Contextual navigation buttons
- Welcome/finish screen ondersteuning
- Smooth position transitions

---

## Hooks

### useAdmin
**Locatie:** `src/hooks/useAdmin.ts`

**Beschrijving:**
Hook voor admin status checking gebaseerd op user profile role.

**Return:**
- `isAdmin: boolean` - Of gebruiker admin is
- `loading: boolean` - Loading status

**Afhankelijkheden:**
- `useAuth` hook voor profile data

**Features:**
- Derived state van user profile
- Loading status tot profile beschikbaar

---

### useAuth  
**Locatie:** `src/hooks/useAuth.ts`

**Beschrijving:**
Hook voor toegang tot authentication context.

**Return:**
- Alle waarden van `AuthContextValue`

**Afhankelijkheden:**
- `AuthContext` context

**Features:**
- Type-safe context access
- Error bij gebruik buiten provider

---

### useCollectionRecipeIds
**Locatie:** `src/hooks/useCollectionRecipeIds.ts`

**Beschrijving:**
Hook die Set van recept IDs returnt die in gebruiker collecties zitten.

**Return:**
- `Set<string>` - Set van recept IDs in collecties

**State:**
- `ids: Set<string>` - Collectie recept IDs

**Afhankelijkheden:**
- `useAuth` voor user data
- Collections API endpoint

**Features:**
- Auto-fetch bij user change
- Empty set voor niet-ingelogde gebruikers
- Efficient Set voor O(1) lookups

---

### useFavorites
**Locatie:** `src/hooks/useFavorites.ts`

**Beschrijving:**
SWR-based hook voor favorite recipes management met optimistic updates.

**Return:**
- `favoriteIds: Set<string>` - Set van favorite recept IDs
- `toggleFavorite: (recipeId, isFavorited) => void` - Toggle functie
- `mutateFavorites: Function` - Manual revalidation

**Afhankelijkheden:**
- SWR voor caching/revalidation
- `useAuth` voor user data
- Supabase client
- Favorites API endpoint

**Features:**
- Optimistic UI updates
- Automatic rollback op API failure
- SWR caching met 60s deduping
- Set-based voor efficiënte lookups

---

### useNotifications
**Locatie:** `src/hooks/useNotifications.ts`

**Beschrijving:**
Comprehensive hook voor notification management met real-time updates.

**Return:**
- `unreadCount: number` - Aantal ongelezen notificaties
- `notifications: AppNotification[]` - Alle notificaties
- `loading: boolean` - Fetch status
- Diverse actie functies (markAsRead, delete, etc.)

**State:**
- `unreadCount, notifications, loading` - Core notification state

**Afhankelijkheden:**
- `useAuth` voor user data  
- `useRealtimeSubscription` voor live updates
- Notifications API endpoints

**Features:**
- Real-time count updates via Supabase subscriptions
- Bulk operations (mark all read, delete all)
- Optimistic updates voor snelle UI
- Lazy loading van notification details

---

### useRealtimeSubscription
**Locatie:** `src/hooks/useRealtimeSubscription.ts`

**Beschrijving:**
Generic hook voor Supabase Realtime subscriptions met ref-based callbacks.

**Props:**
- `table: string` - Database tabel
- `filter?: string` - Row Level Security filter
- `onInsert, onUpdate, onDelete` - Event callbacks
- `enabled?: boolean` - Toggle subscription

**Afhankelijkheden:**
- Supabase Realtime client
- Ref-based callback storage tegen stale closures

**Features:**
- Generic table subscription
- Stale closure prevention via refs
- Automatic cleanup op unmount
- Conditional subscriptions
- Helper `useRealtimeRefresh` voor simple refresh patterns

---

### useTour
**Locatie:** `src/hooks/useTour.ts`

**Beschrijving:**
Hook voor toegang tot tour context.

**Return:**
- `startTour: () => void` - Start tour functie
- `isActive: boolean` - Of tour momenteel actief is

**Afhankelijkheden:**
- `TourContext` context

**Features:**
- Simple context access
- Tour control interface

---

### useUserRatings
**Locatie:** `src/hooks/useUserRatings.ts`

**Beschrijving:**
SWR-based hook voor user recipe ratings met confirmed state tracking.

**Return:**
- `userRatings: Record<string, number>` - User ratings (optimistic)
- `confirmedRatings: Record<string, number>` - DB-confirmed ratings  
- `rate: (recipeId, sterren) => void` - Rate functie
- `mutateRatings: Function` - Manual revalidation

**State:**
- `confirmedRatings: useRef` - Ref voor confirmed ratings tracking

**Afhankelijkheden:**
- SWR voor caching
- `useAuth` voor user data
- Ratings API endpoint
- Ref voor confirmed state tracking

**Features:**
- Dual state: optimistic + confirmed ratings
- Confirmed ratings voor accurate live calculations
- Optimistic updates voor snelle UI
- SWR caching met 60s deduping
- Zero rating = delete functionality

---

## Architectuur Overwegingen

### State Management
- **SWR** voor server state met automatische caching/revalidation
- **Local state** met useState voor UI state
- **Refs** voor preventing stale closures in subscriptions
- **Optimistic updates** voor betere UX

### Real-time Features  
- **Supabase Realtime** voor live notifications/updates
- **Generic subscription hook** voor herbruikbaarheid
- **Ref-based callbacks** tegen stale closure problemen

### Performance
- **Next.js Image** voor geoptimaliseerde afbeeldingen
- **Debouncing** voor search inputs (300-400ms)
- **Set-based lookups** voor O(1) membership checks
- **Lazy loading** van heavy components

### Mobile Experience
- **Pull-to-refresh** voor native mobile gevoel
- **Touch gestures** in cook mode
- **Responsive design** met mobile-first benadering
- **PWA install prompts** voor app-like experience

### Developer Experience
- **TypeScript** overal voor type safety
- **Consistent prop interfaces** voor herbruikbaarheid  
- **Error boundaries** en graceful degradation
- **Comprehensive JSDoc** voor complexe components
