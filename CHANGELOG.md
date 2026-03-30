# CookPilot — Build & Release Log

## [1.2.0] — 2026-03-30 — Audit Fixes: 8 Disconnections Resolved

### Priority 1 — Critical Fixes
- **P1.1 Cook mode resume** — now loads existing session on mount instead of always creating a new one. Fetches `/api/sessions/active`, finds session for current recipe, restores `currentStep` and marks prior steps as completed. Resume from Home actually works.
- **P1.2 Ask page auto-send** — reads `?message=` URL parameter on mount, auto-sends if present. Home "Try asking" prompts and Power buttons now work end-to-end (navigate → auto-send → see response). Wrapped in `Suspense` for `useSearchParams`.
- **P1.3 Edit intent wired** — added `case "edit":` to `/api/ask` route handler. Chat commands like "remove cream", "replace butter with olive oil", "add mushrooms" now call the recipe-edit engine with structured EditActions + AI impact explanation. Trace shows `structured_edit_used: true`.
- **P1.4 Saved recipes real** — `POST/GET /api/saved` route, `saveRecipe()` / `unsaveRecipe()` / `getSavedRecipes()` DB queries, Saved page fetches from Neon instead of hardcoded mock IDs.

### Priority 2 — Dead Code Connected
- **P2.1 Ingredient editing UI wired** — `IngredientActionMenu` (Replace/Remove/Explain) now renders on each ingredient row in recipe detail. `AddIngredientSheet` renders below the ingredient list. Both call `/api/recipe-edit`.
- **P2.2 RecipeOwnerBadge wired** — shows "Original Recipe" badge in recipe detail header alongside tags.
- **P2.3 Learning layer active** — substitution API now calls `adjustConfidence()` + `derivePersonalizationBias()` from the learning engine. Trace stage shows `baseScore`, `adjustedScore`, `feedbackMod`, `prefMod`. Wrapped in try/catch.
- **P2.4 Profile page real data** — fetches from `/api/preferences`, `/api/sessions/active`, `/api/saved`. Shows real dietary/cuisine badges, active session count, saved recipe count. Skeleton loading states. Empty states when no data.

### Dormant code eliminated
Previously built but unused components now wired: `IngredientActionMenu`, `AddIngredientSheet`, `RecipeOwnerBadge`, learning layer (`adjustConfidence`, `derivePersonalizationBias`). The `SubstitutionSheet` wrapper on ingredient rows replaced with `IngredientActionMenu` for direct edit actions.

### Built with parallel agents
- Agent A: Edit intent handler (ask/route.ts) | Agent B: Saved recipes (queries + API + UI) | Agent C: Learning layer (substitution/route.ts) | Agent D: Profile page | Lead: Cook mode resume, ask auto-send, ingredient UI wiring, owner badge

## [1.1.1] — 2026-03-30 — Saved Recipes (End-to-End)

### Added — Saved Recipes backed by Neon
- **`saveRecipe()` / `unsaveRecipe()` / `getSavedRecipes()`** in `src/lib/db/queries.ts`
  - `saveRecipe` — insert into `saved_recipes`, onConflict do nothing
  - `unsaveRecipe` — delete by userId + recipeId
  - `getSavedRecipes` — inner join with `recipes` table, returns title/slug/cuisine/rating/etc, ordered by savedAt desc
- **`GET /api/saved`** — returns `{ savedRecipeIds, savedRecipes }` from Neon
  - `savedRecipeIds` for quick client-side lookup, `savedRecipes` shaped to match `Recipe` type
- **`POST /api/saved`** — `{ recipeId, action: "save" | "unsave" }` toggle
  - Validates body, calls `saveRecipe` or `unsaveRecipe`, returns `{ ok: true }`
- **Saved page (`/saved`) now fetches from API** instead of hardcoded mock IDs
  - Loading spinner while fetching (matches My Versions tab pattern)
  - Empty state with "Browse recipes" CTA preserved
  - My Versions tab unchanged

### Removed
- Mock `savedRecipeIds` import removed from Saved page

## [1.1.0] — 2026-03-30 — Online Recipe Search (Real)

### Added — Online Recipe Search (replaces "coming soon" placeholder)
- **AI-powered recipe generation** — `ai.recipeGeneration()` task via Vercel AI Gateway
  - System prompt enforces strict JSON output: recipe array with title, ingredients[], steps[], cuisine, calories
  - Generates 3 structured recipe candidates per query using Claude Sonnet 4.6
- **`POST /api/recipes/search`** — online search endpoint
  - Accepts `{ query }`, calls AI, parses JSON response, returns `{ candidates[] }`
  - Graceful error handling: empty array on JSON parse failure
  - Debug trace + AI interaction logging
- **`POST /api/recipes/import`** — normalize and save to Neon
  - Inserts into `recipes` + `recipe_ingredients` + `recipe_steps`
  - Sets `is_published: false`, `source_url: "ai-generated"`
  - Returns `{ id, slug, title }`
- **`ImportPreviewSheet`** — full recipe preview before import
  - Title, cuisine/difficulty badges, stats, "AI Generated" purple badge
  - Ingredients list + expandable steps preview
  - Import button with loading/success states → navigates to recipe detail
- **SearchInput wired to real online search:**
  - No local results → "Search online with AI" primary button
  - Few local results → "Find more recipes online" link
  - Online results: purple-themed cards with Globe icon → Preview → Import

### Flow: "pad thai" end-to-end
```
Type "pad thai" → no local match → tap "Search online with AI"
  → AI generates 3 recipes → preview one → tap "Import to CookPilot"
  → saved to Neon → navigate to /recipe/{slug}
  → all intelligence works: rescue, substitution, modification, trust, editing
```

---

## [1.0.2] — 2026-03-30 — Search Quality & Discovery

### Added
- **Search ranking engine** — `lib/search/ranking.ts`
  - `rankRecipes()` — weighted scoring: title exact (10) > title starts-with (8) > title contains (6) > multi-word match (5) > cuisine (4) > tag (3) > ingredient (2) > description (1)
  - Quality multiplier: score × (rating / 5) — higher-rated recipes rank higher at equal relevance
  - Returns `ScoredRecipe[]` with score and `matchType` indicator
  - Shared between SearchInput dropdown and search results page
- **Recent searches** — persisted in `localStorage`
  - `getRecentSearches()` / `addRecentSearch()` — max 5 entries, deduped
  - Shown in dropdown when search input is focused with no query
  - Separate section above "Popular" suggestions
- **Match type indicators** — dropdown results show "matched by ingredient", "matched by cuisine", etc. when the match isn't a title match
- **Rating display** — star + rating number shown on each dropdown result

### Changed
- **SearchInput** — complete search UX upgrade:
  - Dropdown sections: "Best matches" (ranked results), "Recent" (localStorage), "Popular" (static)
  - No-results state: "No local recipes match 'X' — Online recipe search coming soon"
  - `onSubmit` now saves to recent searches
  - `handleSelect` saves to recent searches before navigating
- **Search results page** — now uses `rankRecipes()` instead of boolean filter + rating sort
  - Results sorted by relevance score, not just rating
  - Header text updated: "Ranked by relevance, rating & authenticity"
  - Category filter applied before ranking (narrows pool, then ranks within)

### Architecture — Online Recipe Ingestion (future design)
```
User types "pad thai" → no local results
  ↓
"Search online" button appears
  ↓
POST /api/recipes/import { query: "pad thai" }
  ↓
Server calls external API (Spoonacular / Edamam / AI-generated)
  ↓
Response normalized into CookPilot Recipe type:
  - title, description, cuisine, servings, calories
  - ingredients[] (name, amount, unit, category)
  - steps[] (number, instruction, duration, tip)
  - aiSummary generated by CookPilot AI
  ↓
Saved to recipes table:
  - is_published: false (pending user review)
  - source_url: "https://spoonacular.com/..."
  - is_user_recipe: false (imported, not user-created)
  ↓
User reviews imported recipe → "Save as My Recipe" converts to is_user_recipe: true
```

**Data model already supports this:**
- `recipes.source_url` — stores the original recipe URL
- `recipes.is_user_recipe` — false for imported, true after user saves
- `recipes.source_recipe_id` — links to the imported version if user modifies it
- `recipes.is_published` — false hides imported recipes from public search

**No external API integration built yet.** The search UX shows the entry point ("Online recipe search coming soon") and the data model is ready. Implementation requires choosing an API provider and handling rate limits/costs.

---

## [1.0.1] — 2026-03-30 — Continuity, Ownership & Safety

### Added
- **Cook mode session persistence** — step progress now saved to Neon in real time
  - On mount: `POST /api/session { action: "start" }` creates a cooking session
  - On step change: `POST /api/session { action: "step" }` updates current step
  - On finish: `POST /api/session { action: "complete" }` marks session complete
  - Resume Cooking card on Home page now shows real session data from Neon
- **RecipeOwnerBadge** — pill badge showing recipe ownership type:
  - Original Recipe (gray, BookOpen icon)
  - My Version (blue, Layers icon, optional "Based on {sourceName}")
  - My Recipe (amber, ChefHat icon, optional "Based on {sourceName}")
- **Fuzzy match confidence** in recipe edit engine:
  - `findIngredientWithConfidence()` returns `{ index, confidence: "exact" | "partial" | "none", matchedName }`
  - Exact: case-insensitive name match. Partial: substring inclusion in either direction
  - `applyRemove` and `applyReplace` now warn on partial matches: "Matched 'cream' to 'Heavy cream' (partial match) — verify this is correct"
  - No behavior change for existing callers — `findIngredient()` delegates to the new function internally

### Architecture
- Cook mode persistence is fire-and-forget — API calls don't block step transitions
- Session ID stored in `useRef` (not state) to avoid re-renders on persistence
- `finishCooking()` completes the session AND navigates back to recipe detail
- Fuzzy matching is a two-pass search: exact first, then partial. This prevents "butter" from partially matching "Paneer Butter Masala" when "Butter" exists as an exact ingredient

### Built with parallel agents
- Agent A: RecipeOwnerBadge component | Agent B: Fuzzy match confidence | Lead: Cook mode persistence, integration

---

## [1.0.0] — 2026-03-30 — Recipe Editing Intelligence

### Added — Recipe Edit Engine (`lib/engines/recipe-edit/`)
- **Edit action types** — `EditAction` with 4 types: `remove`, `replace`, `add`, `adjust-amount`
- **Deterministic edit engine** — `applyEdit()` and `applyEdits()` pure functions
  - Remove: fuzzy ingredient name matching, warns if protein/spice removed
  - Replace: swaps ingredient in-place with replacement
  - Add: appends new ingredient, auto-merges if duplicate found
  - Adjust-amount: updates quantity with validation
- **Impact assessment** — per-edit deterministic scoring (taste/texture/authenticity/calories) by ingredient category
- **Edit intent patterns** — 4 new categories in intent detection:
  - `edit/remove`: "remove cream", "take out the butter", "skip onion"
  - `edit/replace`: "replace butter with olive oil", "swap cream for yogurt"
  - `edit/add`: "add mushrooms", "throw in some garlic"
  - `edit/save`: "save as my recipe", "add to my recipes"

### Added — Schema (3 columns on `recipes` table)
- `source_recipe_id` (UUID) — for My Recipes: the original recipe it was derived from
- `owner_id` (TEXT) — null = system recipe, set = user-owned
- `is_user_recipe` (BOOLEAN default false) — separates user recipes from system recipes
- All 3 columns pushed to Neon via MCP and verified

### Added — API Routes (2 new, 11 total)
- **POST /api/recipe-edit** — apply structured edit action to a recipe
  - Runs edit engine deterministically, then AI explains impact
  - Trace: `structured_edit_used`, `ai_enrichment_used`, `ai_allowed_to_change_edit: false`
- **POST /api/my-recipes** — save full recipe as user-owned (ingredients + steps + auto-generated slug)
- **GET /api/my-recipes** — list user's custom recipes

### Added — UI Components (2 new)
- **IngredientActionMenu** — bottom sheet with Replace, Remove, Explain Impact actions per ingredient
- **AddIngredientSheet** — bottom sheet with name/amount/unit inputs, unit pills, category selector

### Architecture — Variants vs My Recipes
- **Variants**: delta from base recipe (JSONB changes), can't add new ingredients, tied to base
- **My Recipes**: standalone via `recipes` table with `is_user_recipe=true`, full ingredient/step rows, independent lifecycle
- All existing engines work on user recipes without parallel table structures

### Built with parallel agents
- Agent A: API routes (2 files) | Agent B: UI components (2 files) | Lead: schema, engine, intents, integration

## [0.9.2] — 2026-03-30 — Navigation, Resume Cooking & Search

### Added
- **Resume Cooking** — prominent card on Home page for active cooking sessions
  - `GET /api/sessions/active` — queries `cooking_sessions` in Neon for in-progress sessions, enriches with recipe name/cuisine from mock data
  - Home page fetches on mount, shows above all content when session exists
  - Displays: recipe name, current step / total steps, servings, time ago, progress bar
  - Taps directly to `/cook/{recipeId}` to resume at current step
  - Gradient border + Play icon for visual prominence
  - Graceful degradation: empty array when DB unavailable
- **Tappable Home logo** — CookPilot logo + name wrapped in `<Link href="/">`, always returns to Home from any page
- **Search-as-you-type** — instant local results as user types in search bar
  - Searches recipe titles, cuisines, tags, and ingredient names
  - Shows up to 4 instant results with emoji, cuisine, cooking time, difficulty
  - **Popular searches** dropdown when query is empty: "Butter Chicken", "Healthy dinner", "Quick meals", etc.
  - **No results** state with "Online recipe search coming soon" hint
  - Outside click dismisses dropdown
  - Debounce-free (useMemo on local array — instant, no network)

### Changed
- **Home page** — removed hardcoded `continueRecipes` mock data, now uses real Neon data via API
- **SearchInput component** — expanded from simple input to full type-ahead with dropdown, results, and suggestions. Backward compatible: `showSuggestions={false}` disables dropdown

### Architecture — Online Recipe Ingestion (future)
When local results are insufficient, the system is designed for a second search layer:
1. SearchInput shows "No local recipes match" → "Search online" button
2. Button calls `POST /api/recipes/import` with a query
3. API route calls an external recipe API (Spoonacular, Edamam, or AI-generated)
4. Response is normalized into CookPilot's `Recipe` type (ingredients, steps, substitutions)
5. Imported recipe is saved to `recipes` table with `source_url` and `is_published: false`
6. User sees imported recipe in search results immediately
No external API integration is built yet — the data model (`source_url` column) and the UX entry point ("coming soon" hint) are in place.

---

## [0.9.1] — 2026-03-30 — Scaling/Trust Logic Fix

### Fixed — 3 bugs in scaling behavior
- **Calorie calculation** — `transformRecipe()` was computing `(calories * targetServings) / originalServings`, turning per-serving calories into total calories. Scaling 4→8 doubled calories from 490 to 980. **Fix:** calories per serving now stays constant during scaling (`let calories = originalCaloriesPerServing`). Only total calories changes (computed downstream when needed).
- **Trust metrics on scaling** — `computeTrustMetrics()` was comparing scaled ingredients (1600g chicken for 8 servings) against original ingredients (800g chicken for 4 servings). Every ingredient looked "changed," tanking confidence from 95 to ~50 and authenticity from 100 to ~70. **Fix:** added `TransformationType` parameter — when `"scaling"`, trust metrics return fixed values: confidence 99, authenticity 100, risk "low".
- **Recipe detail page** — was passing scaled ingredients to trust metrics as if they were modifications. **Fix:** passes `transformationType: "scaling"` so trust layer skips penalty computation.

### Added
- `TransformationType` union type: `"scaling" | "substitution" | "modification"`
- Scaling-specific UX: green banner "Scaled to X servings — taste and authenticity unchanged" with per-serving calorie display
- Full trust layer (AuthenticityMeter, ConfidenceRiskBadge, BeforeAfterCard) only shows for real modifications, not scaling
- `scripts/test-calorie-fix.ts` — dedicated calorie verification (4 scenarios, all passing)

### Verified
- `transformRecipe()` returns 490 cal/serving for 4→8, 4→2, 4→4, 4→20 (all correct)
- Unit tests: 18/18 passing (no regressions)
- Build: clean, all routes intact

---

## [0.9.0] — 2026-03-30 — UX Polish & Launch Readiness

### Home Page — Redesigned
- **3 Powers onboarding** — three tappable cards (Rescue, Swap, Modify) replacing the old 4-card grid. Each card has a distinct color, icon, one-liner, and pre-filled prompt that navigates to `/ask`
- **"Try asking" prompts** — 5 contextual example prompts with emoji icons and arrow CTAs, replacing the generic "Ask CookPilot" section. Each navigates to `/ask?message=...` for one-tap demo
- **Tagline updated** — "Your AI cooking companion" (action-oriented) replacing "Never mess up a dish again" (passive)
- **Removed** — AiSuggestionCard grid (replaced by 3 Powers + Try Asking)

### Saved Page — Rebuilt with Tabs
- **Recipes + My Versions** segmented control tab bar
- **My Versions tab** — fetches saved variants from `/api/variants`, shows VariantCard with:
  - Variant name, servings, calories saved per serving
  - Authenticity score badge (green shield)
  - Confidence pill, change summary (2-line truncated)
  - Creation date
- **Improved empty states** — both tabs have action-oriented empty states with CTAs ("Browse recipes" / "Try modifying Butter Chicken")

### Ask Page — Follow-up Suggestions
- **Contextual follow-up chips** appear below every hybrid response:
  - Rescue: "What caused this?", "How do I prevent it next time?", "Will this change the taste?"
  - Substitution: "Any other alternatives?", "How does this affect authenticity?", "What about texture?"
  - Modification: "Keep it more authentic", "Reduce calories further", "What else can I change?"
- Chips are tappable — send the follow-up as a new message in the same chat

### Response Cards — "Why?" Affordance
- **"Why this recommendation?"** — collapsible section replacing the always-visible "CookPilot explains" block
  - Collapsed by default — keeps response cards compact
  - Tap to expand with smooth animation — shows the full AI explanation
  - Uses Bot icon + primary color for visual consistency

### Architecture
- No new API routes or engine changes — all UX work uses existing data and routes
- Home page prompts link to `/ask?message=...` which auto-sends via URL params (ready for future implementation)
- Saved page variants tab calls existing `GET /api/variants` endpoint
- Follow-up chips reuse the same `sendMessage()` function as manual input

---

## [0.8.0] — 2026-03-30 — Learning & Optimization Layer

### Added — Learning Engine (`lib/engines/learning/`)
- **Feedback aggregation** — `feedback.ts`
  - Queries `user_feedback` table, computes per-target-type metrics: helpful rate, negative rate, too_risky count
  - 5-minute in-memory cache to avoid DB hit on every request
  - `feedbackConfidenceModifier()` — deterministic formula: +3 for >80% helpful, -8 for >40% negative, -5 for >30% too_risky
  - `getScenarioMetrics()` — joins rescue_queries + ai_interactions for per-scenario analytics
- **Dynamic confidence adjustment** — `confidence.ts`
  - `adjustConfidence()` wraps base confidence from `computeTrustMetrics` with:
    - Feedback modifier: historical helpful/negative rate adjusts score ±8 points
    - Preference modifier: strict authenticity users get -3 on modifications, adventurous users get +2
  - Returns `ConfidenceAdjustment` with base, modifier breakdown, and reasons
  - Does NOT change the deterministic core — only adjusts the final number
- **Personalization bias** — `personalization.ts`
  - `derivePersonalizationBias()` converts raw user_preferences into actionable multipliers
  - Spice multiplier: 0.6 (mild) → 1.0 (medium) → 1.5 (very hot)
  - Authenticity strictness: 0.8 (adventurous) → 1.0 (flexible) → 1.2 (strict)
  - `personalizationContext()` generates AI prompt hint string from preferences

### Added — Dev Analytics
- **`GET /api/analytics`** — returns feedback aggregations, scenario metrics, and performance stats
- **`AnalyticsPanel`** component — emerald floating button in dev, opens overlay with:
  - Performance summary: avg AI latency, total scenarios, total feedback
  - Feedback by type: horizontal bars for helpful/not_helpful/too_risky/too_different per target type
  - Top rescue scenarios: sorted by query count with avg latency
  - Refresh button for live data
- Added to root layout alongside ProjectTracker

### Architecture
- Learning layer is read-only — it queries existing tables, never modifies core engine logic
- Confidence adjustment is a thin wrapper: `adjustedScore = baseScore + feedbackMod + prefMod`
- Feedback cache TTL is 5 minutes — stale data is acceptable for confidence nudges
- All learning functions are async and fail gracefully when DB is unavailable (return defaults)

---

## [0.7.0] — 2026-03-30 — Persistence & Personalization

### Added — Schema (3 new tables, 3 new columns)
- **`recipe_variants`** — save custom modified recipes with trust metrics snapshot
  - Fields: userId, baseRecipeId, name, servings, ingredientChanges (JSONB), trustMetrics (JSONB), changeSummary
  - Typed JSONB interfaces: `VariantChange`, `VariantTrustSnapshot`
- **`user_feedback`** — lightweight feedback on any intelligence response
  - Fields: userId, targetType (rescue/substitution/modification), targetId, rating (helpful/not_helpful/too_risky/too_different), notes
- **`user_preferences`** — personalization settings
  - Fields: userId (unique), spicePreference, dietary[], cuisines[], calorieGoal, authenticityPreference, unitSystem
- **`cooking_sessions`** enhanced — 3 new columns: `rescue_used`, `substitutions_used` (JSONB), `modifications_applied` (JSONB)

### Added — API Routes (3 new)
- `POST /api/variants` — save a named recipe variant with trust metrics. `GET /api/variants?recipeId=x` to list variants
- `POST /api/feedback` — submit feedback (helpful/not_helpful/too_risky/too_different) for any intelligence response
- `GET/POST /api/preferences` — read/upsert user preferences (uses dev-user for now)

### Added — UI Components (2 new)
- **`SaveVariantDialog`** — modal dialog for naming and saving a modified recipe
  - Shows change preview (ingredient diffs), authenticity score, save confirmation
  - Appears as save icon button in sticky action bar when recipe is modified
- **`FeedbackButtons`** — 4 feedback icons (thumbs up, thumbs down, too risky, too different)
  - Integrated below each hybrid response in Ask CookPilot page
  - Fires to `/api/feedback` on click, shows "Thanks" confirmation

### Added — Query Helpers (6 new functions)
- `saveVariant()`, `getUserVariants()`, `getVariantsForRecipe()`
- `submitFeedback()`
- `getPreferences()`, `upsertPreferences()`

### Database
- All 11 tables live in Neon (verified via MCP: recipes, recipe_ingredients, recipe_steps, saved_recipes, cooking_sessions, substitution_knowledge, ai_interactions, rescue_queries, recipe_variants, user_feedback, user_preferences)
- Schema pushed via Neon MCP tool (drizzle-kit push timed out on cold Neon instance)

---

## [0.6.0] — 2026-03-30 — Experience & Trust Layer

### Added
- **Trust metrics engine** — `lib/engines/transformation/trust.ts`
  - `computeTrustMetrics()` — pure function deriving confidence, risk, authenticity, change summary, and before/after comparison from transformation data
  - **Confidence score** (0-99): deducts for number of changes, calorie reduction %, critical/caution warnings
  - **Risk level** (low/medium/high): based on calorie %, removed ingredients, simultaneous changes, critical warnings
  - **Authenticity score** (0-100): per-ingredient analysis — protein removal costs 25 pts, dairy reduction costs 8 pts, spice changes cost 5 pts. Spice-profile-unchanged bonus +5
  - **Change summary**: per-ingredient before/after with direction (reduced/increased/unchanged/removed)
  - **Before/After comparison**: calories, key changes, taste/texture/authenticity summaries
- **4 new UI components:**
  - `AuthenticityMeter` — SVG circular gauge (0-100%) with color coding (green/amber/orange/red), "Signature preservation" label
  - `ConfidenceRiskBadge` — risk level banner (low=green, medium=amber, high=red) with confidence % and primary risk reason
  - `BeforeAfterCard` — calorie diff with %-saved badge, ingredient change rows (from → to), 3-column taste/texture/authenticity summaries
  - `QuickActions` — 4 pill buttons: Keep Authentic, Healthier, Less Spice, Fewer Cal. Each triggers existing engines via `/ask` route
- **Recipe Detail page trust layer** — when servings are modified:
  - Authenticity meter + confidence/risk badge animate in
  - Before/After card shows calorie and ingredient diff
  - Quick action buttons visible at all times for one-tap modifications
  - Original `AuthenticityBadge` shown when unmodified
- **Modification API enriched** — `POST /api/modify` response now includes `trust` field with full `TrustMetrics` object

### Architecture
- Trust metrics are 100% deterministic — computed from existing transformation data, no AI involved
- Authenticity scoring weights: protein (25 pts), dairy (8 pts), spice (5 pts), other (3 pts). Spice profile preservation grants a +5 bonus
- Quick actions trigger existing flows: "Keep Authentic" resets servings, others navigate to `/ask` with pre-filled messages that hit the modification/rescue engines
- All new components are animated with Framer Motion (AnimatePresence for show/hide)

---

## [0.5.3] — 2026-03-30 — Modification Intelligence

### Added
- **Modification intelligence pillar** — third real AI-backed intelligence flow alongside rescue and substitution
  - `POST /api/modify` — dedicated route for recipe modification with structured calorie engine + AI explanation
  - `ModificationResponse` type — `modificationType`, `primaryChanges`, `ingredientAdjustments`, `expectedTasteChange`, `expectedTextureChange`, `authenticityImpact`, `calorieImpact`, `warnings`, `explanation`, `confidence`
  - `ImpactLevel` type — `none | minor | moderate | significant` with description
  - `modificationAnalysis` AI task with guardrailed system prompt: "NEVER suggest different ingredient changes than those provided"
  - Deterministic impact assessment function based on reduction percentage thresholds
  - 3 modification intent patterns: `reduce-calories`, `healthier`, `reduce-spice`
  - Entity extraction for percent: "reduce by 20%" → `{ percent: "20" }`
- **Chat integration** — modification intents detected in `/api/ask` and routed through the same hybrid pipeline (engine calculation → AI explanation → trace)
- **Verification script** — `scripts/verify-modification-flows.ts` with 28 assertions:
  - Test 1: `/api/modify` direct call — validates all response fields, trace fields, real AI
  - Test 2: `/api/ask` chat intent — validates intent detection → engine → AI pipeline
  - Test 3: `/api/ask` "make healthier" — validates healthier intent mapping

### Architecture
- Same guardrail pattern as rescue and substitution:
  - Engine computes the plan (which ingredients to reduce, by how much, calories saved)
  - AI explains the tradeoffs (what changes in taste/texture/signature)
  - AI receives the plan as context, cannot change it
  - Trace shows: `structured_modification_used: true`, `ai_enrichment_used: true`, `ai_allowed_to_change_primary_modification: false`
- Prompt passes full plan summary to AI: "Heavy cream: 150ml → 90ml (saves ~57 cal/serving)" so AI explains *that specific plan*
- Warnings generated deterministically: cream reduction >50%, butter reduction >50%, overall reduction >30%

### Verified — "Reduce calories 20% for Butter Chicken" end-to-end
```
Engine: 4 ingredient reductions computed (cream, butter, oil, yogurt)
AI: anthropic/claude-sonnet-4.6, 8.7s, 1143 chars — explains richness tradeoff, suggests cashew paste
Trace: structured_modification_used=true, ai_allowed_to_change=false, wasMock=false
DB: Logged to ai_interactions
```

### Test Results
- Modification verification: 28/28 passing (real AI)
- E2E API tests: 13/13 passing (stable)
- **Total: 70/70 passing, 0 failing** (across all verification scripts + unit tests)

---

## [0.5.2] — 2026-03-30 — Real AI Substitution Intelligence

### Added
- **6 substitution flows verified with real AI** — cream→cashew, butter→ghee, yogurt→Greek, paneer→tofu, feta→goat cheese, saffron→turmeric+cardamom
  - All produce real `anthropic/claude-sonnet-4.6` explanations (6-8s latency, 750-810 chars)
  - All use substitution_knowledge DB as source of truth, AI only enriches
  - All logged to `ai_interactions` in Neon
- **Context-aware substitution prompts** — AI now receives:
  - Structured impact scores (taste/texture/authenticity 1-5)
  - Quantity ratio from knowledge base
  - Recipe name, cuisine, ingredient category, dish type
  - Explicit instruction: "Do NOT suggest a different substitute"
- **Guardrailed system prompt** — `SUBSTITUTION_SYSTEM` now mirrors rescue pattern: "NEVER suggest a different primary substitute than the one provided"
- **Enhanced trace fields** on substitution API:
  - `structured_substitution_used: true` — in knowledge stage
  - `ai_enrichment_used: true` — in ai-enrichment stage
  - `ai_allowed_to_change_primary_substitute: false` — explicit guardrail visibility
- **Substitution verification script** — `scripts/verify-substitution-flows.ts`
  - Tests 6 substitution scenarios against live API
  - Validates: found, best name, fallback name, min score, AI explanation length, impact scores, all trace fields

### Changed
- **`SubstitutionInput`** — expanded with `category`, `dishType`, `quantityRatio`, `structuredImpact` fields
- **Substitution prompt builder** — passes full structured impact data to AI so it explains the specific substitution, not a generic one
- **`tsconfig.json`** — `scripts/` excluded from Next.js build scope

### Test Results
- Substitution verification: 6/6 passing (real AI, trace verified)
- Rescue verification: 5/5 passing (stable)
- E2E API tests: 13/13 passing (stable)
- Unit tests: 18/18 passing (stable)
- **Total: 42/42 passing, 0 failing**

---

## [0.5.1] — 2026-03-30 — All Rescue Flows Real AI

### Added
- **5 additional rescue flows verified with real AI** — too-spicy, too-watery, too-thick, bland, slightly-burned
  - All 5 produce real `anthropic/claude-sonnet-4.6` explanations (6-8s latency, 700+ chars each)
  - All 5 use structured rescue-db fix as source of truth, AI only enriches
  - All 5 logged to `rescue_queries` + `ai_interactions` in Neon
- **Enhanced trace fields** — three new explicit fields in debug trace:
  - `structured_fix_used: true` — in knowledge stage, confirms rescue-db was used
  - `ai_enrichment_used: true` — in ai-enrichment stage, confirms AI was called
  - `ai_allowed_to_change_primary_fix: false` — in ai-enrichment stage, explicit guardrail visibility
- **Rescue verification script** — `scripts/verify-rescue-flows.ts`
  - Tests 5 rescue scenarios against live API
  - Validates: response type, fix title, fix instruction keywords, source fields, trace fields (structured_fix_used, ai_enrichment_used, ai_allowed_to_change_primary_fix), mock status
  - Reports model name, latency, and explanation length per scenario

### Test Results
- Rescue verification: 5/5 passing (real AI, trace fields verified)
- E2E API tests: 13/13 passing (stable, no regressions)
- Unit tests: 18/18 passing
- DB confirms: 7 distinct rescue problem types logged with `had_structured: true`

---

## [0.5.0] — 2026-03-30 — Real AI Live

### Added
- **Real AI Gateway integration** — all rescue, substitution, and general queries now hit `anthropic/claude-sonnet-4.6` via Vercel AI Gateway with OIDC authentication
  - `lib/ai/index.ts` — `callAi()` now uses `generateText()` from AI SDK v6 with `gateway()` model router
  - Falls back to mock responses on gateway failure (try/catch with console error)
  - System prompts per task type — rescue prompt explicitly forbids contradicting the knowledge base fix
  - `shouldUseMock()` auto-detects based on `VERCEL_OIDC_TOKEN` presence

### Changed
- **`lib/ai/gateway.ts`** — removed hardcoded `useMock: true`, replaced with `shouldUseMock()` function that checks env. Live when OIDC token present
- **`lib/ai/arbitration/index.ts`** — updated to use `shouldUseMock()` instead of removed `AI_CONFIG.useMock`
- **AI SDK parameter** — `maxTokens` → `maxOutputTokens` (AI SDK v6 rename)

### Verified — "too much salt" end-to-end
```
Input: "I added too much salt to my butter chicken"

Pipeline:
  Intent detection:  2ms  → rescue/too-salty (confidence: 0.84)
  Knowledge lookup:  0ms  → matched, urgency: medium
  AI enrichment:     8.3s → anthropic/claude-sonnet-4.6, wasMock: false, 741 chars
  DB logging:        async → rescue_queries + ai_interactions

Result:
  fix:         Structured (from rescue-db) — acid + lemon juice
  explanation: Real AI — acid/salt receptor competition science, butter chicken tips
  source:      { structured: true, ai: true, confidence: "high" }
  trace:       Full pipeline visibility in dev debug panel
```

### DB Logging Confirmed
- 14 ai_interactions logged (all `mock: false`, real gateway calls)
- 7+ rescue_queries logged with structured responses
- All calls through `anthropic/claude-sonnet-4.6` with 5-8s latency via AI Gateway

### Test Results
- E2E API tests: 13/13 passing (with real AI, not mocks)
- Unit tests: 18/18 passing
- Total: 31/31 passing

---

## [0.4.5] — 2026-03-30 — Neon Database Live

### Resolved
- **Blocker 1: Vercel CLI** — already installed (v50.37.1), authenticated as `nishadsukumaran`
- **Blocker 2: Neon database** — fully provisioned and operational
  - `vercel link --yes` → linked to `nishadsukumarans-projects/cookpilot`
  - `vercel integration add neon` → provisioned `neon-almond-sail`, auto-connected to project, `.env.local` created with `DATABASE_URL`
  - `drizzle-kit push` → all 8 tables created in Neon (recipes, recipe_ingredients, recipe_steps, saved_recipes, cooking_sessions, substitution_knowledge, ai_interactions, rescue_queries)
  - `seed.ts` → 6 recipes (80 ingredients, 39 steps) + 22 substitution entries seeded successfully

### Verified
- Direct SQL queries confirm: 6 recipes, 80 ingredients, 39 steps, 22 substitution knowledge entries in production Neon database
- All existing E2E tests (13/13) and unit tests (18/18) continue to pass

---

## [0.4.4] — 2026-03-30 — Execution Hardening

### Added
- **E2E API test script** — `scripts/test-api.ts` with 13 tests across 3 categories
  - 7 rescue flows: salt, spicy, watery, thick, bland, burned, sweet — all hitting real `POST /api/ask`
  - 4 substitution flows: cream, butter, yogurt, paneer — all hitting `POST /api/substitution`
  - 1 negative test: unknown ingredient returns `found: false`
  - 1 general flow: non-rescue question returns `type: "general"`
  - Configurable base URL via `TEST_BASE_URL` env var
  - Connectivity probe before test run

### Changed
- **Transformation engine — scaling.ts** — added garam masala, turmeric, red chili powder, cumin powder to `SUB_LINEAR_INGREDIENTS`
- **Transformation engine — units.ts** — added minimum kitchen amount floor (0.125) to prevent rounding to zero
- **Transformation engine — warnings.ts** — added liquid reduction warning rule (>50% reduction → caution about drying out)
- **Butter chicken tests** — updated garam masala assertion from "scales linearly" to "scales sub-linearly (less than 2x)"
- **AI mock responses** — expanded spicy trigger patterns (hot, chili), watery (runny), thick (dense, heavy), bland (flavor, taste), burned (scorch, stuck)

### Test Results
- Unit tests: 18/18 passing (butter chicken transformation)
- E2E API tests: 13/13 passing (rescue + substitution + general)
- Total: 31/31 passing, 0 failing

---

## [0.4.3] — 2026-03-30 — Intelligence Expansion

### Added
- **Rescue mock responses** — all 8 problems now have rich, context-aware AI mock responses
  - too-thick: warm liquid technique, sauce-thickens-when-cool insight
  - bland: salt-first hierarchy, spice blooming, umami boosters (soy sauce trick)
  - too-sweet: acid + salt counteraction, cocoa/espresso for desserts
  - slightly-burned: immediate transfer protocol, bread/peanut butter absorption tricks
  - Existing (salt, spicy, watery) expanded with additional trigger patterns
- **Substitution mock responses** — 3 new AI-enriched explanations
  - butter → ghee: smoke point science, 85% ratio reasoning, restaurant finish trick
  - butter → olive oil: flavor clash warning, coconut oil alternative suggestion
  - yogurt → Greek yogurt: protein curdling warning, marinade adhesion benefit
- **Butter chicken transformation tests** — `src/lib/engines/transformation/__tests__/butter-chicken.test.ts`
  - 18 assertions across 5 scenarios, all passing
  - Scale up (4→8): chicken doubles, sugar sub-linear, no critical warnings
  - Scale down (4→2): all amounts halve, all > 0
  - Extreme (4→20): generates caution + critical warnings
  - Calorie estimation: 785 cal/serving (reasonable for butter chicken)
  - Unit conversions: cup→ml, g→oz, kitchen rounding, incompatible→null

### Changed
- **Intent detection** — expanded spicy pattern to catch "hot", "chili" variants
- **Rescue mock matching** — added "runny" for watery, "dense"/"heavy" for thick, "flavor"/"taste" for bland, "scorch"/"stuck" for burned
- **Project tracker data** — updated to 24 test scenarios (22 passing, 1 untested, 0 failing), 44 features across 5 phases

### Verified (parallel agents)
- rescue-db.ts: all 8 problems have complete immediateFix + gradualFix + preventionTip
- substitution-db.ts: butter (ghee/olive), yogurt (Greek/sour cream), cream (cashew/coconut), paneer (tofu/halloumi) — all verified with correct tiers, ratios, and impact scores

---

## [0.4.2] — 2026-03-30 — Project Tracker

### Added
- **Project Tracker** — development-only floating panel accessible from any page
  - `lib/debug/tracker-data.ts` — typed local config with phases, features, test scenarios, blockers
  - `components/debug/project-tracker.tsx` — full UI with 3 tabs (Roadmap, Tests, Blockers)
  - **Roadmap tab** — 5 phases, 36 features, per-phase progress bars, expandable feature lists with status badges
  - **Tests tab** — 18 test scenarios across 4 categories (rescue, substitution, transformation, integration), passing/failing/untested status
  - **Blockers tab** — severity-colored cards (high=red, medium=amber, low=gray) with related feature links
  - 6 feature statuses: `not_started`, `in_progress`, `blocked`, `needs_testing`, `complete`, `needs_refinement`
  - 4 test statuses: `not_tested`, `passing`, `failing`, `skipped`
  - Overall progress percentage in floating trigger button
  - Helper functions: `getPhaseProgress()`, `getOverallProgress()`, `getTestSummary()`
  - Returns `null` in production — zero bundle impact
- **Root layout integration** — `ProjectTracker` added to layout, visible globally in dev
- Floating indigo button (bottom-right, next to trace toggle) shows overall % and opens full panel

### Architecture
- Data lives in a plain TypeScript file — no database, no API calls. Update `tracker-data.ts` manually
- Component checks `process.env.NODE_ENV` at module level — tree-shaken in production
- Overlay with backdrop blur, scrollable content, responsive (bottom sheet on mobile, centered on desktop)

---

## [0.4.1] — 2026-03-30 — Dev Debug Trace Panel

### Added
- **Debug trace system** — `lib/debug/types.ts` with `DebugTrace`, `TraceStage`, `TraceBuilder` types
  - `createTrace()` builder: `addStage()` with name, action, durationMs, key-value details → `finish()` returns typed `DebugTrace`
  - `isDev()` guard — traces only attached to responses when `NODE_ENV === "development"`
  - Traces never included in production builds
- **DevTracePanel component** — `components/debug/dev-trace-panel.tsx`
  - Compact collapsible panel with violet theme (visually distinct from app UI)
  - Shows: trace ID, total latency, stage count, source badges (KB/Mock/Live)
  - Expandable stage rows: name, action, duration, clickable details grid (key-value pairs)
  - Flag badges for warnings/fallbacks (amber pills with icons)
  - Source summary footer: structured ✓/✗, ai ✓/✗, mock ⚠/no
  - Floating toggle button (bottom-right, violet) to show/hide all trace panels
  - Returns `null` in production — zero bundle impact

### Changed
- **POST /api/ask** — builds trace through full pipeline: intent detection → knowledge lookup → AI enrichment → DB logging. Attaches `_trace` field to response only in dev
- **POST /api/substitution** — builds trace for lookup + AI enrichment stages. Attaches `_trace` in dev
- **Ask CookPilot page** — captures `_trace` from API response, renders `DevTracePanel` below each assistant message (indented under avatar)
- **SubstitutionSheet** — renders `DevTracePanel` at bottom of sheet when trace is present

### Architecture
- Trace is a flat `_trace` field on API responses, stripped in production via `isDev()` check
- No secrets exposed: traces show model name, latency, wasMock, stage actions — never prompts, API keys, or full response bodies
- TraceBuilder is synchronous — zero overhead (just timestamps and object construction)
- DevTracePanel checks `process.env.NODE_ENV` at module level — tree-shaken in production builds

---

## [0.4.0] — 2026-03-30 — Phase 4: Real Intelligence Wiring

### Added
- **3 API Route Handlers** — server-side intelligence endpoints
  - `POST /api/ask` — full rescue + substitution + general query pipeline with intent detection → structured knowledge → AI enrichment → DB logging
  - `POST /api/substitution` — ingredient substitution lookup with AI explanation enrichment
  - `POST /api/session` — cooking session lifecycle (start, step update, complete) with transformation persistence
- **AI service layer rewrite** — `lib/ai/index.ts` simplified to clean task-based calls
  - 4 task types: `rescueAdvice`, `substitutionAnalysis`, `recipeReasoning`, `authenticityAnalysis`
  - Each task: prompt builder → gateway call (or mock) → typed `AiResponse` with model, latencyMs, wasMock
  - Context-aware prompts: rescue advice receives structured fix so AI explains *why* rather than duplicating advice
  - Rich mock responses for salt, spice, watery scenarios and cream→cashew substitution
- **DB query helpers** — `lib/db/queries.ts` with 8 functions
  - `logRescueQuery()` — typed JSONB insert with intent + response
  - `logAiInteraction()` — lightweight logging (summary + context, not full prompts)
  - `createCookingSession()`, `updateSessionStep()`, `completeSession()`, `getActiveSessions()`
  - `getSubstitutions()`, `getRecipeBySlug()`, `getRecipeWithDetails()`
- **SubstitutionSheet component** — bottom sheet UI for ingredient substitution
  - Opens on ingredient tap in recipe detail page
  - Calls `/api/substitution` on open (lazy fetch)
  - Shows best + fallback substitutes with impact bars (taste/texture/authenticity, 1-5 scale)
  - Includes AI explanation panel from gateway enrichment
  - Quantity instructions with ratio display

### Changed
- **Ask CookPilot page** — now calls `POST /api/ask` instead of client-side `processQuery()`. Full server-side pipeline with DB logging (fire-and-forget)
- **Recipe Detail page** — ingredient swap buttons now open SubstitutionSheet instead of navigating to `/ask`. Each ingredient is wrapped in the sheet trigger
- **Hybrid controller** — updated to match new AI service interface (`AiResponse` type with `wasMock` field, renamed input fields)

### Architecture
- DB logging is fire-and-forget (`.catch(() => {})`) — non-blocking, doesn't slow UI response
- API routes handle all 3 intent categories: rescue → structured knowledge first, substitution → engine lookup first, general → AI only
- Substitution API enriches with AI explanation only when structured match exists (avoids wasting AI calls on unmatched ingredients)
- Session API uses anonymous user ID for now — ready for auth provider string when added
- No multi-model arbitration in API routes — single model per call (clean, fast, predictable)

---

## [0.3.0] — 2026-03-30 — Phase 3: Data Layer

### Added
- **Neon PostgreSQL schema** — 8 tables via Drizzle ORM (`recipes`, `recipe_ingredients`, `recipe_steps`, `saved_recipes`, `cooking_sessions`, `substitution_knowledge`, `ai_interactions`, `rescue_queries`)
- **Database connection** — `lib/db/index.ts` with lazy Neon serverless singleton
- **Drizzle schema** — `lib/db/schema.ts` with full relations, typed JSONB columns, and indexes
- **Seed script** — `scripts/seed.ts` populates 6 recipes (80+ ingredients, 45+ steps) and 24 substitution entries from mock data
- **Drizzle config** — `drizzle.config.ts` for schema generation and push
- **npm scripts** — `db:generate`, `db:push`, `db:studio`, `db:seed`
- **Environment template** — `.env.example` with DATABASE_URL and AI Gateway vars
- **dotenv-cli + tsx** — dev dependencies for running scripts with env vars

### Design decisions
- `ai_interactions` stores input summary (200 chars) + context JSONB, not full prompts — optimized for analytics not replay
- `rescue_queries.response` uses typed JSONB (`RescueQueryResponse` interface) instead of normalized sub-tables
- `userId` is `text` not `uuid` — ready for any auth provider string ID
- Seed script is idempotent (upsert recipes, clear+reinsert ingredients/steps)

---

## [0.2.0] — 2026-03-30 — Phase 2: Intelligence Layer

### Added
- **Multi-model arbitration pipeline** — `lib/ai/arbitration/` with 6 modules
  - `types.ts` — `StructuredAdvice` schema (10 structured fields for cross-model comparison)
  - `triggers.ts` — 6 deterministic validation trigger rules (low confidence, vague response, knowledge conflict, high-impact scenario, authenticity-sensitive, no structured backing)
  - `mismatch.ts` — Semantic mismatch detection comparing actions, impact directions, scores, and ingredients. Uses `ACTION_OPPOSITES` table for true contradiction detection (add↔remove, increase↔decrease). Different wording with same meaning = no mismatch
  - `guardrail.ts` — Knowledge guardrail validating AI output against rescue-db. Catches dangerous contradictions (e.g., "add salt" for too-salty). Overrides action and caps confidence when triggered
  - `mock-responses.ts` — Tier-specific mock responses for "too-salty" scenario
  - `index.ts` — Pipeline orchestrator: primary → validation (conditional) → arbitration (conditional) → guardrail (always)
- **Hybrid intelligence controller** — `lib/hybrid/` with 3 modules
  - `types.ts` — `HybridResponse` with fix, alternatives, impact, explanation, proTip, source provenance, and arbitration metadata
  - `intent.ts` — Deterministic intent detection with 20+ regex patterns for rescue, substitution, scaling, calorie categories. Entity extraction for ingredients
  - `controller.ts` — Orchestrator combining intent detection → engines → arbitration → HybridResponse
- **Recipe transformation engine** — `lib/engines/transformation/` with 5 modules
  - `scaling.ts` — Sub-linear scaling for spices/seasonings (ratio^0.7), linear for everything else. Kitchen-friendly rounding
  - `units.ts` — Metric ↔ imperial conversion, volume and weight. Handles descriptive units (pinch, cloves, to taste)
  - `calories.ts` — Calorie estimation from ingredients + smart reduction strategy targeting high-density reducible ingredients first
  - `warnings.ts` — 7 warning rules (fat reduction, sugar reduction, dairy removal, extreme scaling, spice scaling, protein quantity, missing ingredient)
  - `index.ts` — `transformRecipe()` pipeline: scale → convert → calorie adjust → warnings
- **Ingredient substitution engine** — `lib/engines/substitution/` with 3 modules
  - `substitution-db.ts` — 12 ingredients, 24 substitutes with quantity mapping and impact ratings
  - `analyzer.ts` — Weighted scoring (taste 40%, texture 25%, authenticity 35%), compatibility labels, quantity instructions
  - `index.ts` — `findSubstitutesFor()` returning scored, ranked results
- **Cooking rescue engine** — `lib/engines/rescue/` with 2 modules
  - `rescue-db.ts` — 8 problems (too-salty through missing-ingredient) with immediate fix, gradual fix, prevention tips, and ingredient recommendations
  - `index.ts` — `getRescue()` with urgency tagging
- **AI service facade** — `lib/ai/` with mock-first, gateway-ready architecture
  - `gateway.ts` — Model tiers (primary: claude-sonnet, validator: gemini-flash, arbitrator: claude-sonnet, fast: claude-haiku)
  - 4 task types: recipe-reasoning, substitution-analysis, rescue-advice, authenticity-analysis
- **HybridResponseCard component** — Rich UI rendering fix, alternatives (expandable), 3-column impact analysis, AI explanation, pro tip, arbitration metadata, source provenance indicator
- **Recipe Discovery card** — `RecipeDiscoveryCard` with rank badges, color-coded tags, AI insight, full-width CTA
- **Shared engine types** — `lib/engines/types.ts` with 15 interfaces

### Changed
- **Recipe Detail page** — now uses real transformation engine instead of naive multiplication. Shows animated warning banners when scaling is risky
- **Search/Discovery page** — upgraded to curated top-3 results with RecipeDiscoveryCard, sorted by rating, AI summary on every card
- **Ask CookPilot page** — replaced hardcoded mock responses with hybrid intelligence pipeline. Rescue queries now show structured cards with impact analysis instead of plain text bubbles

### Architecture
- Gateway model tiers: primary (anthropic/claude-sonnet-4.6), validator (google/gemini-2.5-flash), arbitrator (anthropic/claude-sonnet-4.6)
- Progressive cost: tier 1 always runs, tier 2 only on trigger, tier 3 only on material disagreement
- Knowledge guardrail runs on every final output regardless of tier count
- All engines are pure functions with no side effects — testable in isolation

---

## [0.1.0] — 2026-03-30 — Phase 1: Foundation

### Added
- **Next.js 16 project** — App Router, TypeScript, Tailwind CSS v4, Turbopack
- **Design system** — Warm amber palette (oklch 0.62 0.17 45), DM Serif Display headings, Plus Jakarta Sans body, Geist Mono code. 0.75rem radius, light mode default
- **shadcn/ui** — 12 components (button, card, badge, input, dialog, sheet, scroll-area, separator, skeleton, tabs, avatar, tooltip)
- **App shell** — Root layout with font loading, TooltipProvider, responsive container
- **Bottom navigation** — 5-tab animated nav bar with active indicator, hides in cook mode, safe area padding
- **7 screens**:
  - `/` Home — hero, search, category chips, continue-cooking progress, AI top picks, quick actions grid
  - `/search` Search/Discovery — real-time filtering, category toggle, AI summaries
  - `/recipe/[id]` Recipe Detail — servings scaler, ingredient list, substitution cards, step preview, sticky CTA
  - `/cook/[id]` Guided Cook Mode — full-screen steps with slide animation, progress bar, mark-as-done, tips
  - `/ask` Ask CookPilot — chat interface with suggested prompts and mock AI responses
  - `/saved` Saved Recipes — bookmarked recipe collection
  - `/profile` Profile — stats, dietary/cuisine preferences, settings menu
- **14 custom components**: app-header, bottom-nav, sticky-action-bar, search-input, category-chip, recipe-card (3 variants), recipe-stat-pill, ingredient-row, step-card, authenticity-badge, ai-suggestion-card, chat-message, impact-summary, empty-state
- **Mock data** — 6 recipes (Butter Chicken, Chicken Biryani, Paneer Butter Masala, Shakshuka, Machboos, Grilled Chicken Salad) with full ingredients, steps, substitutions, categories, suggested prompts
- **Framer Motion** — staggered reveals, slide transitions in cook mode, tap animations on cards

### Tech stack
- Next.js 16.2.1 (App Router + Turbopack)
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui (Radix base, new-york style)
- Framer Motion
- Lucide React icons
