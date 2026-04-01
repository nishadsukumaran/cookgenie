# CookGenie — Technical Document

> AI-powered cooking assistant. Rescue mistakes, swap ingredients, modify recipes intelligently.
>
> **Stack**: Next.js 16 (App Router) | Neon PostgreSQL | Drizzle ORM | Vercel AI Gateway | shadcn/ui | Framer Motion
>
> **Deployment**: Vercel (auto-deploy from `master` branch)
>
> **Vercel Project**: `cookpilot` | **GitHub Repo**: `nishadsukumaran/cookgenie`
>
> **Neon Project**: `young-band-89758749` | **Database**: `neondb`

---

## 1. Architecture Overview

```
Client (React 19, App Router)
  |
  +-- Pages (7 routes)
  |     |-- /              Home (top picks, powers, search)
  |     |-- /search        Two-tier recipe discovery
  |     |-- /ask           Conversational AI chat
  |     |-- /recipe/[id]   Recipe detail + scaling
  |     |-- /cook/[id]     Step-by-step cook mode
  |     |-- /saved         Bookmarks + custom variants
  |     |-- /profile       Preferences + stats
  |
  +-- API Routes (19 endpoints)
  |     |-- /api/recipes/*          CRUD + search + import + delete
  |     |-- /api/ask                Hybrid intelligence endpoint
  |     |-- /api/substitution       Ingredient swap lookup
  |     |-- /api/session            Cook session management
  |     |-- /api/saved              Bookmark management
  |     |-- /api/variants           Custom recipe versions
  |     |-- /api/preferences        User settings
  |     |-- /api/feedback           AI response ratings
  |
  +-- Engines (6 deterministic systems)
  |     |-- Transformation          Scaling, unit conversion, calorie reduction
  |     |-- Rescue                  Structured cooking problem solutions
  |     |-- Substitution            Ingredient swap with impact scores
  |     |-- Recipe Edit             Add/remove/replace ingredients
  |     |-- Learning                Preference-based personalization
  |     |-- Hybrid Controller       Intent detection + engine routing
  |
  +-- AI Service (Vercel AI Gateway)
        |-- 6 task types routed through gateway
        |-- Mock fallback when gateway unavailable
        |-- Multi-model arbitration for high-stakes problems
```

---

## 2. Pages

### 2.1 Home (`/`)

**File**: `src/app/page.tsx`

| Section | Data Source | Components |
|---------|-----------|------------|
| Logo + Search bar | Static + navigates to `/search` | `SearchBar`, `CategoryChip` |
| Resume Cooking | `GET /api/sessions/active` | Inline card with progress bar |
| 3 Powers grid | Static (Rescue, Substitute, Adapt) | Navigates to `/ask?message=...` |
| Top Picks | `GET /api/recipes` (top 3 by rating) | `FeaturedRecipeCard` |
| Smart Prompts | Static (5 example prompts) | Navigates to `/ask?message=...` |

### 2.2 Search (`/search`)

**File**: `src/app/search/page.tsx`

**Hook**: `useRecipeSearch` (`src/hooks/use-recipe-search.ts`)

| Feature | Mechanism |
|---------|-----------|
| Local search | Debounced (300ms) `GET /api/recipes?q=&cuisine=&time=&difficulty=&dietary=` |
| AI discovery | Manual trigger via `POST /api/recipes/search` |
| Filters | 4 dimensions: Cuisine (8), Time (3), Difficulty (3), Dietary (4) |
| Import flow | AI card tap -> `ImportPreviewSheet` -> `POST /api/recipes/import` -> navigate to `/recipe/{slug}` |
| Fallback to /ask | "Ask CookGenie AI" link when no results or after AI results |

**Filter definitions**: `src/lib/search/filters.ts`

### 2.3 Ask AI (`/ask`)

**File**: `src/app/ask/page.tsx`

**Endpoint**: `POST /api/ask`

Conversational interface with hybrid intelligence. Accepts `?message=` query param for auto-send from other pages.

**Response types**: `rescue`, `substitution`, `modification`, `scaling`, `edit`, `explanation`, `general`

### 2.4 Recipe Detail (`/recipe/[id]`)

**File**: `src/app/recipe/[id]/page.tsx`

**Data loading**: Mock data first (instant for seeded recipes), falls back to `GET /api/recipes/{slug}` for imported recipes.

| Feature | Engine | Components |
|---------|--------|------------|
| Ingredient scaling | `transformRecipe()` | `IngredientRow` |
| Trust metrics | `computeTrustMetrics()` | `AuthenticityBadge`, `ConfidenceRiskBadge` |
| Quick actions | Navigate to `/ask` | `QuickActions` |
| Save variant | `POST /api/variants` | `SaveVariantDialog` |
| AI Insight | Conditional on `recipe.aiSummary` | Inline card |
| Start cooking | Navigate to `/cook/{id}` | `StickyActionBar` |

**Image resolution**: `recipeImageMap[slug]` -> `cuisineFallback[cuisine]` -> `/images/butter-chicken.jpg`

### 2.5 Cook Mode (`/cook/[id]`)

**File**: `src/app/cook/[id]/page.tsx`

**Session API**: `POST /api/session` with actions: `start`, `step`, `complete`

| Feature | Detail |
|---------|--------|
| Step navigation | One step at a time, swipe or button |
| Timer | `useTimer` hook with audio/voice alerts |
| Live rescue | Opens `/ask` with step context |
| Session persistence | Tracks currentStep, servingsUsed, transformations |

### 2.6 Saved (`/saved`)

**File**: `src/app/saved/page.tsx`

| Tab | API | Display |
|-----|-----|---------|
| Recipes | `GET /api/saved` | `RecipeCard` (compact variant) |
| My Versions | `GET /api/variants` | `VariantCard` with trust metrics, calorie savings |

### 2.7 Profile (`/profile`)

**File**: `src/app/profile/page.tsx`

**API**: `GET /api/preferences`, `POST /api/preferences`

**Fields**: spicePreference, dietary[], cuisines[], calorieGoal, authenticityPreference, unitSystem

---

## 3. API Endpoints

### 3.1 Recipe Operations

| Endpoint | Method | Input | Output | Validation |
|----------|--------|-------|--------|------------|
| `/api/recipes` | GET | `?q=` `?cuisine=` `?time=` `?difficulty=` `?dietary=` | `{ recipes: Recipe[] }` | Enum validation on difficulty, dietary, time. Invalid values return empty array |
| `/api/recipes/[slug]` | GET | URL param: slug | `{ recipe: Recipe }` or 404 | — |
| `/api/recipes/[slug]` | DELETE | URL param: slug | `{ ok: true, deleted: slug }` or 403/404 | Only `sourceUrl='ai-generated'` recipes can be deleted |
| `/api/recipes/search` | POST | `{ query, filters? }` | `{ candidates: RecipeCandidate[] }` | `query` required (400 if empty). Strips markdown code fences from AI response |
| `/api/recipes/import` | POST | `{ title, description, cuisine, cookingTime, prepTime, difficulty, servings, calories, tags, ingredients[], steps[] }` | `{ id, slug, title }` | title + ingredients + steps required. Difficulty validated against enum. Slug gets random 6-char suffix |
| `/api/recipes/generate-image` | POST | `{ recipeId }` | Image URL | Gemini Flash -> Vercel Blob |

### 3.2 Hybrid Intelligence

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/ask` | POST | `{ message, context?: { recipeName, cuisine, currentStep, recipeId, sessionId } }` | Type-specific response: `{ type, fix, alternatives, impact, explanation, proTip, source, _trace? }` |
| `/api/substitution` | POST | `{ ingredient, amount?, unit?, recipeName?, cuisine?, category? }` | `{ original, found, best, fallback, all, aiExplanation }` |
| `/api/recipe-edit` | POST | `{ recipeId, action: { type, ingredientName, newIngredient? } }` | Edit result with impact |
| `/api/modify` | GET | `?recipeId=` | Modification suggestions |

### 3.3 Session Management

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/session` | POST | `{ action: "start"\|"step"\|"complete", recipeId?, servings?, totalSteps?, sessionId?, step? }` | `{ sessionId }` or `{ ok: true }` |
| `/api/sessions/active` | GET | — | `{ sessions: ActiveSession[] }` |
| `/api/sessions/history` | GET | — | `{ sessions: CompletedSession[], stats }` |

### 3.4 User Data

| Endpoint | Method | Input | Output |
|----------|--------|-------|--------|
| `/api/saved` | GET | — | `{ savedRecipeIds, savedRecipes }` |
| `/api/saved` | POST | `{ recipeId, action: "save"\|"unsave" }` | `{ ok: true }` |
| `/api/variants` | GET | `?recipeId=` | `{ variants: SavedVariant[] }` |
| `/api/variants` | POST | `{ baseRecipeId, name, servings, ingredientChanges, trustMetrics, changeSummary }` | `{ id }` |
| `/api/my-recipes` | GET | — | Custom recipes |
| `/api/preferences` | GET/POST | Preference fields | `{ preferences }` or `{ id }` |
| `/api/feedback` | POST | `{ targetType, targetId?, rating, notes? }` | `{ id }` |
| `/api/analytics` | POST | Event data | — (placeholder) |

---

## 4. Engines

### 4.1 Transformation Engine

**Path**: `src/lib/engines/transformation/`

**Entry point**: `transformRecipe(ingredients, originalServings, caloriesPerServing, options)`

**Pipeline**: Scale by servings -> Convert units -> Adjust calories -> Generate warnings

```
Scaling behavior:
  - Linear:      protein, dairy, vegetables, grains, oil   (ratio = targetServings / originalServings)
  - Sub-linear:  salt, garam masala, chili powder, etc.    (ratio = sqrt for 2x, 0.7x for 0.5x)
  - Non-scalable: "to taste", "as needed", "for garnish"  (unchanged)
  - Whole units:  cloves, pieces, eggs                     (rounded to nearest integer, min 1)
```

**Calorie reduction strategies**:
- `smart-swap`: Target fats/oils first (butter, cream, oil), preserve spices
- `proportional`: Reduce all ingredients equally

**Trust metrics**: `computeTrustMetrics()` returns confidence score, risk level, authenticity score, change summary, before/after comparison.

### 4.2 Rescue Engine

**Path**: `src/lib/engines/rescue/`

**Database**: `src/lib/engines/rescue/rescue-db.ts` (228 lines)

**Coverage**: too-salty, too-spicy, slightly-burned, too-watery, too-thick, broken-sauce, undercooked, overcooked, bland, curdled, too-sweet

Each problem has:
- **Immediate fix**: Quick action with specific ingredients and amounts
- **Gradual fix**: Longer-term recovery with tradeoff
- **Prevention tip**: How to avoid next time
- **Urgency**: low / medium / high

### 4.3 Substitution Engine

**Path**: `src/lib/engines/substitution/`

**Database**: `src/lib/engines/substitution/substitution-db.ts` (347 lines, 22 substitutes across 11 ingredients)

**Output per substitute**:
- `tier`: best / fallback
- `score`: 0-100 composite quality score
- `quantityRatio`: e.g., 0.75 (use 75% of original amount)
- `impact.taste`: { score: 1-5, description }
- `impact.texture`: { score: 1-5, description }
- `impact.authenticity`: { score: 1-5, description }
- `authenticityLevel`: authentic / adapted / modified

### 4.4 Recipe Edit Engine

**Path**: `src/lib/engines/recipe-edit/`

**Actions**: `add`, `remove`, `replace`

Each action returns impact assessment on taste, texture, and authenticity.

### 4.5 Learning Layer

**Path**: `src/lib/engines/learning/`

Converts user preferences into bias multipliers for confidence adjustment. Tracks feedback accumulation per task type.

### 4.6 Hybrid Controller

**Path**: `src/lib/hybrid/`

**Intent detection** (`intent.ts`): Regex-based pattern matching with 11 rescue subcategories, entity extraction (ingredient, percentage, servings target), confidence scoring.

**Request flow**:
```
User message
  -> Intent detection (regex, 0-1 confidence)
  -> Route to handler:
       rescue       -> rescue-db lookup + ai.rescueAdvice()
       substitution -> substitution-db lookup + ai.substitutionAnalysis()
       modification -> transformation engine + ai.modificationAnalysis()
       scaling      -> transformation engine + ai explanation
       edit         -> recipe-edit engine + ai impact
       general      -> ai.recipeReasoning()
  -> Attach debug trace (dev mode only)
  -> Log to ai_interactions table
  -> Return typed response
```

---

## 5. AI Service

**Path**: `src/lib/ai/index.ts` + `src/lib/ai/gateway.ts`

**Gateway**: Vercel AI Gateway with OIDC auth (auto-provisioned via `vercel env pull`)

**Model**: `openai/gpt-4o-mini` (all tiers)

**Token limits**: 512 (general tasks), 4096 (recipe generation)

**Fallback**: Mock responses when `MOCK_AI=true` or gateway unavailable. Mock responses are task-type specific with input-based branching.

### Task Types

| Task | System Prompt Focus | Token Limit |
|------|-------------------|-------------|
| `rescue-advice` | Explain WHY a fix works (food science). Never contradict knowledge base | 512 |
| `substitution-analysis` | Explain WHY a substitute works. Never suggest different primary | 512 |
| `recipe-reasoning` | Concise cooking Q&A, dish-specific | 512 |
| `authenticity-analysis` | Rate modifications vs tradition (1-5) | 512 |
| `modification-analysis` | Explain tradeoffs of computed reduction plan | 512 |
| `recipe-generation` | Generate JSON array of 3 recipes with 8-16 ingredients, 5-8 steps | 4096 |

### Multi-Model Arbitration

**Path**: `src/lib/ai/arbitration/`

Triggered only for high-stakes problems (e.g., `slightly-burned`):
1. Primary model generates advice
2. Validator checks safety and correctness
3. Arbitrator resolves disagreements
4. Guardrails enforce temperature safety and authenticity

---

## 6. Database Schema

**Provider**: Neon PostgreSQL (project: `young-band-89758749`)

**ORM**: Drizzle (`src/lib/db/schema.ts`)

### Tables

```sql
recipes
  id            UUID PRIMARY KEY
  slug          TEXT UNIQUE NOT NULL          -- URL-safe identifier
  title         TEXT NOT NULL
  description   TEXT
  image_url     TEXT
  cuisine       TEXT NOT NULL                 -- Indian, Italian, etc.
  cooking_time  INTEGER NOT NULL              -- minutes
  prep_time     INTEGER NOT NULL              -- minutes
  difficulty    TEXT NOT NULL                  -- Easy|Medium|Hard
  rating        NUMERIC(2,1) DEFAULT 0
  servings      INTEGER NOT NULL DEFAULT 4
  calories      INTEGER                       -- per serving
  tags          TEXT[] DEFAULT '{}'
  ai_summary    TEXT
  source_url    TEXT                           -- 'ai-generated' for imports
  source_recipe_id UUID                       -- for variants
  owner_id      TEXT                           -- null = system recipe
  is_user_recipe BOOLEAN DEFAULT false
  is_published  BOOLEAN DEFAULT true
  created_at    TIMESTAMPTZ DEFAULT NOW()
  updated_at    TIMESTAMPTZ DEFAULT NOW()

recipe_ingredients
  id            UUID PRIMARY KEY
  recipe_id     UUID REFERENCES recipes(id)
  name          TEXT NOT NULL
  amount        TEXT NOT NULL                  -- stored as string, parsed to number
  unit          TEXT NOT NULL
  category      TEXT NOT NULL                  -- protein|dairy|spice|vegetable|grain|oil|other
  sort_order    INTEGER NOT NULL
  UNIQUE(recipe_id, name)

recipe_steps
  id            UUID PRIMARY KEY
  recipe_id     UUID REFERENCES recipes(id)
  step_number   INTEGER NOT NULL
  instruction   TEXT NOT NULL
  duration      INTEGER                        -- minutes, nullable
  tip           TEXT                            -- nullable
  UNIQUE(recipe_id, step_number)

saved_recipes
  id            UUID PRIMARY KEY
  user_id       TEXT NOT NULL
  recipe_id     UUID REFERENCES recipes(id)
  notes         TEXT
  saved_at      TIMESTAMPTZ DEFAULT NOW()
  UNIQUE(user_id, recipe_id)

cooking_sessions
  id            UUID PRIMARY KEY
  user_id       TEXT NOT NULL
  recipe_id     UUID REFERENCES recipes(id)
  current_step  INTEGER DEFAULT 1
  total_steps   INTEGER NOT NULL
  servings_used INTEGER NOT NULL
  status        TEXT DEFAULT 'active'           -- active|completed|abandoned
  started_at    TIMESTAMPTZ DEFAULT NOW()
  completed_at  TIMESTAMPTZ
  transformations JSONB                         -- scaling/modification applied
  rescue_used   BOOLEAN DEFAULT false
  substitutions_used BOOLEAN DEFAULT false
  modifications_applied BOOLEAN DEFAULT false

substitution_knowledge
  id            UUID PRIMARY KEY
  original      TEXT NOT NULL
  substitute_name TEXT NOT NULL
  tier          TEXT NOT NULL                    -- best|fallback
  quantity_ratio NUMERIC
  taste_score   INTEGER                          -- 1-5
  texture_score INTEGER                          -- 1-5
  auth_score    INTEGER                          -- 1-5
  summary       TEXT
  verified      BOOLEAN DEFAULT false
  UNIQUE(original, substitute_name)

ai_interactions
  id            UUID PRIMARY KEY
  user_id       TEXT
  task_type     TEXT NOT NULL
  model         TEXT
  tier          TEXT
  input_summary TEXT
  input_context JSONB
  output_confidence NUMERIC
  latency_ms    INTEGER
  was_mock      BOOLEAN DEFAULT false
  created_at    TIMESTAMPTZ DEFAULT NOW()

rescue_queries
  id            UUID PRIMARY KEY
  user_id       TEXT
  session_id    UUID
  recipe_id     UUID
  user_input    TEXT NOT NULL
  detected_intent TEXT
  problem_type  TEXT
  had_structured BOOLEAN
  response      JSONB
  user_feedback TEXT
  created_at    TIMESTAMPTZ DEFAULT NOW()

recipe_variants
  id            UUID PRIMARY KEY
  user_id       TEXT NOT NULL
  base_recipe_id UUID REFERENCES recipes(id)
  name          TEXT NOT NULL
  servings      INTEGER NOT NULL
  ingredient_changes JSONB
  trust_metrics JSONB
  change_summary TEXT
  created_at    TIMESTAMPTZ DEFAULT NOW()

user_feedback
  id            UUID PRIMARY KEY
  user_id       TEXT
  target_type   TEXT NOT NULL                    -- rescue|substitution|modification
  target_id     UUID
  rating        TEXT NOT NULL                    -- helpful|not_helpful|too_risky|too_different
  notes         TEXT
  created_at    TIMESTAMPTZ DEFAULT NOW()

user_preferences
  id            UUID PRIMARY KEY
  user_id       TEXT NOT NULL UNIQUE
  spice_preference TEXT                          -- mild|medium|hot|extra-hot
  dietary       TEXT[]                           -- Vegetarian, Vegan, etc.
  cuisines      TEXT[]                           -- Indian, Italian, etc.
  calorie_goal  INTEGER
  authenticity_preference TEXT                    -- strict|flexible|adventurous
  unit_system   TEXT DEFAULT 'metric'            -- metric|imperial
  updated_at    TIMESTAMPTZ DEFAULT NOW()
```

### Indexes

- `recipes`: slug (unique), cuisine
- `recipe_ingredients`: recipe_id, (recipe_id, name) unique
- `recipe_steps`: recipe_id, (recipe_id, step_number) unique
- `saved_recipes`: (user_id, recipe_id) unique
- `cooking_sessions`: user_id, status
- `substitution_knowledge`: original, (original, substitute_name) unique
- `user_feedback`: target_type, rating
- `user_preferences`: user_id (unique)

---

## 7. Components

### Recipe Display (10)

| Component | File | Props | Used In |
|-----------|------|-------|---------|
| `RecipeDiscoveryCard` | `recipe/recipe-discovery-card.tsx` | `recipe: Recipe, rank: number` | Search page |
| `AiRecipeCard` | `search/ai-recipe-card.tsx` | `candidate: AiCandidate, onClick` | Search page |
| `RecipeCard` | `recipe/recipe-card.tsx` | `recipe: Recipe, variant?: "compact"` | Saved page |
| `StepCard` | `recipe/step-card.tsx` | `step: CookingStep, isActive?, isCompleted?` | Recipe detail, Cook mode |
| `IngredientRow` | `recipe/ingredient-row.tsx` | `ingredient: Ingredient, isModified?, onSubstitute?` | Recipe detail |
| `AuthenticityBadge` | `recipe/authenticity-badge.tsx` | `level` | Recipe detail |
| `AuthenticityMeter` | `recipe/authenticity-meter.tsx` | Trust/taste/texture/auth scores | Recipe detail |
| `ConfidenceRiskBadge` | `recipe/confidence-risk-badge.tsx` | Confidence + risk level | Recipe detail |
| `RecipeOwnerBadge` | `recipe/recipe-owner-badge.tsx` | `type` | Recipe detail |
| `BeforeAfterCard` | `recipe/before-after-card.tsx` | Before/after comparison data | Recipe detail |

### Recipe Interaction (6)

| Component | File | Purpose |
|-----------|------|---------|
| `ImportPreviewSheet` | `recipe/import-preview-sheet.tsx` | Preview + import AI recipe. Locks during import to prevent silent success |
| `SubstitutionSheet` | `recipe/substitution-sheet.tsx` | Show substitute options for an ingredient |
| `AddIngredientSheet` | `recipe/add-ingredient-sheet.tsx` | Add new ingredient to recipe |
| `IngredientActionMenu` | `recipe/ingredient-action-menu.tsx` | Remove/replace/add actions per ingredient |
| `QuickActions` | `recipe/quick-actions.tsx` | Healthier, Reduce Spice, Keep Authentic buttons |
| `SaveVariantDialog` | `recipe/save-variant-dialog.tsx` | Save modified recipe as custom variant |

### AI/Chat (4)

| Component | File | Purpose |
|-----------|------|---------|
| `ChatMessage` | `ai/chat-message.tsx` | Chat bubble (user/assistant) |
| `HybridResponseCard` | `ai/hybrid-response-card.tsx` | Structured AI response with fix, alternatives, impact |
| `AiSuggestionCard` | `ai/ai-suggestion-card.tsx` | Suggestion chip for Ask page |
| `ImpactSummary` | `ai/impact-summary.tsx` | Taste/texture/authenticity impact icons |

### Search (4)

| Component | File | Purpose |
|-----------|------|---------|
| `SearchBar` | `search/search-bar.tsx` | Clean search input (no dropdown) |
| `SearchInput` | `search/search-input.tsx` | Search input with dropdown (used elsewhere) |
| `FilterBar` | `search/filter-bar.tsx` | Collapsible 4-dimension filter row |
| `CategoryChip` | `search/category-chip.tsx` | Tappable category pill |

### Layout (3)

| Component | File | Purpose |
|-----------|------|---------|
| `AppHeader` | `layout/app-header.tsx` | Sticky header with back button, title, right action |
| `BottomNav` | `layout/bottom-nav.tsx` | Mobile bottom navigation |
| `StickyActionBar` | `layout/sticky-action-bar.tsx` | Floating action bar at bottom |

### Other (3)

| Component | File | Purpose |
|-----------|------|---------|
| `CookTimer` | `cooking/cook-timer.tsx` | Countdown timer with alerts |
| `EmptyState` | `shared/empty-state.tsx` | No results / empty state |
| `FeedbackButtons` | `shared/feedback-buttons.tsx` | Thumbs up/down for AI ratings |

### Debug (3, dev only)

| Component | File | Purpose |
|-----------|------|---------|
| `DevTracePanel` | `debug/dev-trace-panel.tsx` | Request stage visualization |
| `AnalyticsPanel` | `debug/analytics-panel.tsx` | Event tracking overlay |
| `ProjectTracker` | `debug/project-tracker.tsx` | Feature status dashboard |

---

## 8. Hooks

| Hook | File | Returns |
|------|------|---------|
| `useRecipeSearch` | `hooks/use-recipe-search.ts` | `query, setQuery, filters, setFilter, clearFilters, hasActiveFilters, localRecipes, localLoading, aiCandidates, aiLoading, aiSearched, triggerAiSearch, previewCandidate, setPreviewCandidate` |
| `useTimer` | `hooks/use-timer.ts` | `time, isActive, start, pause, reset, setTime` |

---

## 9. Data Flow Diagrams

### Search + Import Flow

```
User types query
  -> useRecipeSearch.setQuery()
  -> 300ms debounce
  -> GET /api/recipes?q=...&filters
  -> localRecipes state updates
  -> RecipeDiscoveryCard renders

User taps "Discover with AI"
  -> triggerAiSearch()
  -> POST /api/recipes/search { query, filters }
  -> ai.recipeGeneration() -> AI Gateway -> JSON parse
  -> aiCandidates state updates
  -> AiRecipeCard renders

User taps AI recipe card
  -> setPreviewCandidate(candidate)
  -> ImportPreviewSheet opens (locked during import)

User taps "Import to CookGenie"
  -> POST /api/recipes/import { ...candidate }
  -> DB insert: recipes + recipe_ingredients + recipe_steps
  -> Returns { id, slug, title }
  -> Navigate to /recipe/{slug}
  -> Recipe page fetches from GET /api/recipes/{slug}
```

### Hybrid Intelligence Flow (/api/ask)

```
User message: "my curry is too salty"
  -> Intent detection (regex): category=rescue, subcategory=too-salty, confidence=0.95
  -> handleRescue():
       1. rescue-db.getRescue("too-salty") -> structured fix + alternatives
       2. ai.rescueAdvice({ problem, structuredFix }) -> AI explanation
       3. Log to ai_interactions + rescue_queries tables
  -> Return: { type: "rescue", fix, alternatives, impact, explanation, source }

User message: "what can I use instead of cream"
  -> Intent detection: category=substitution, entity.ingredient="cream"
  -> handleSubstitution():
       1. substitution-db.findSubstitutesFor("cream") -> best + fallback subs
       2. ai.substitutionAnalysis({ original, substitute, impact }) -> AI context
  -> Return: { type: "substitution", original, best, all, aiExplanation }
```

### Recipe Scaling Flow

```
User adjusts servings slider (4 -> 8)
  -> setServings(8)
  -> useMemo triggers transformRecipe()
       1. scaleIngredients(): linear (2x), sub-linear (~1.5x for spices), skip "to taste"
       2. No unit conversion (same system)
       3. No calorie adjustment (per-serving stays same)
       4. generateWarnings(): "Scaling up 2x may affect cooking times"
  -> useMemo triggers computeTrustMetrics()
       -> confidence: 99, risk: low, authenticity: 100 (scaling preserves recipe)
  -> IngredientRow re-renders with new amounts
```

---

## 10. Environment Variables

| Variable | Source | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | Vercel env (production + development) | Neon PostgreSQL connection string |
| `VERCEL_OIDC_TOKEN` | Auto-provisioned by Vercel | AI Gateway authentication |
| `MOCK_AI` | Optional, `.env.local` | Set to `true` to force mock AI responses |

---

## 11. Seeded Data

6 recipes seeded via `scripts/seed.ts`:

| Recipe | Cuisine | Time | Difficulty | Ingredients | Steps |
|--------|---------|------|------------|-------------|-------|
| Butter Chicken | Indian | 45min | Medium | 16 | 8 |
| Chicken Biryani | Indian | 60min | Hard | 14 | 8 |
| Paneer Butter Masala | Indian | 35min | Easy | 13 | 6 |
| Shakshuka | Middle Eastern | 25min | Easy | 12 | 5 |
| Machboos | Arabic | 50min | Medium | 13 | 7 |
| Grilled Chicken Salad | International | 20min | Easy | 12 | 5 |

22 substitution pairs across 11 ingredients (cream, butter, yogurt, etc.)

---

## 12. Not Yet Implemented

| Feature | Current State | Blocker |
|---------|--------------|---------|
| Authentication | Hardcoded `dev-user` / `anonymous` | No auth provider integrated |
| Recipe deletion UI | DELETE API exists, no UI button | Design decision |
| Bottom navigation | Component exists, not wired | Needs layout integration |
| Session history page | API exists, no page | UI design needed |
| Recipe image generation on import | API exists at `/api/recipes/generate-image` | Not triggered from import flow |
| Full preference integration | Stored in DB, not passed to AI prompts | Wiring needed |
| Real-time AI | Works when OIDC valid, falls back to mock | Depends on Vercel AI Gateway availability |
| Social features | Not built | Out of scope |
