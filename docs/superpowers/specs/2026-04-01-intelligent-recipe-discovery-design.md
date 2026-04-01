# Intelligent Recipe Discovery Engine — Design Spec

**Date**: 2026-04-01
**Status**: Approved for implementation

---

## Problem

CookGenie's current recipe discovery is a dumb pipe: user types query → AI generates 3 flat recipes. No understanding of intent, no intelligent variations, no clarification when the query is ambiguous, no followup suggestions. The AI acts like a search engine, not like a chef.

## Goal

Replace the flat recipe generation with a **6-step intelligent discovery pipeline** that behaves like an expert chef guiding the user to the best dish. The engine understands intent, expands queries intelligently, asks for clarification when needed, recommends a primary pick with reasoning, offers meaningful alternatives, and suggests natural followups.

## Architecture

### Two-Phase Hybrid Pipeline

```
Phase 1: UNDERSTAND (single AI call, ~2s)
  ├── Step 1: Classify intent
  ├── Step 2: Expand query (3-5 interpretations)
  └── Step 3: Decide if clarification needed
       ├── Yes → return early with options
       └── No  → auto-proceed to Phase 2

Phase 2: GENERATE (single AI call, ~3-5s)
  ├── Step 4: Generate primary recipe (full: ingredients + steps)
  ├── Step 5: Generate 2-3 alternatives (lightweight: title + difference)
  └── Step 6: Generate 3 followup suggestions
```

### Integration Points

- **Search page** (`/search`): Quick discovery mode. "Discover with AI" triggers the pipeline. Clarifications shown as tappable chips. Results display inline.
- **Ask page** (`/ask`): Full conversational mode. Recipe search queries detected by hybrid intent system, routed to discover engine. Results rendered as rich chat cards with inline clarification and quick-reply followups.
- **Shared engine**: Both pages use the same `POST /api/recipes/discover` endpoint and `useRecipeDiscovery` hook.

---

## API Design

### Endpoint: `POST /api/recipes/discover`

**File**: `src/app/api/recipes/discover/route.ts`

#### Request

```typescript
interface DiscoverRequest {
  query: string;
  phase: "understand" | "generate";
  preferences?: {
    spicePreference?: string;
    dietary?: string[];
    cuisines?: string[];
  };
  filters?: SearchFilters;
  resolvedIntent?: string | null;  // null for phase 1, user selection for phase 2
}
```

#### Response (phase: "understand")

```typescript
interface UnderstandResponse {
  phase: "understand";
  intent: string;                  // "dish search", "cuisine style", "cooking goal", etc.
  expansions: string[];            // 3-5 query interpretations
  needsClarification: boolean;
  clarification: string | null;    // question to ask, or null
}
```

#### Response (phase: "generate")

```typescript
interface GenerateResponse {
  phase: "generate";
  intent: string;
  primary: {
    title: string;
    description: string;
    why_match: string;             // chef-like explanation of why this is the best fit
    cuisine: string;
    cookingTime: number;
    prepTime: number;
    difficulty: "Easy" | "Medium" | "Hard";
    calories: number;
    servings: number;
    tags: string[];
    ingredients: Ingredient[];     // full data, ready to import
    steps: CookingStep[];          // full data, ready to import
  };
  alternatives: Array<{
    title: string;
    description: string;
    difference: string;            // "Quick version using pressure cooker"
    cuisine: string;
    cookingTime: number;
    difficulty: "Easy" | "Medium" | "Hard";
    calories: number;
    tags: string[];
    // NO ingredients/steps — lightweight, expandable on demand
  }>;
  followups: string[];             // 3 natural next actions
}
```

#### Alternative Expansion: `POST /api/recipes/discover/expand`

When user taps an alternative, fetches full ingredients + steps for that specific recipe.

```typescript
// Request
{ title: string, description: string, cuisine: string, cookingTime: number, ... }

// Response
{ ingredients: Ingredient[], steps: CookingStep[] }
```

---

## AI Prompts

### Phase 1 System Prompt: UNDERSTAND

```
You are CookGenie, an expert chef and cooking advisor.

Analyze the user's recipe query and respond with JSON only.

Step 1 - Classify the intent into one or more:
- dish_search: looking for a specific dish
- cuisine_style: wants a cuisine or regional style
- cooking_goal: has a goal (healthy, quick, restaurant-style, comfort)
- ingredient_based: has specific ingredients to use
- problem_solving: fixing a cooking issue
- modification: wants to change a recipe (low oil, vegan, high protein)

Step 2 - Generate 3-5 intelligent interpretations of the query.
Each interpretation should be meaningfully different (not just word variations).

Step 3 - If the query is ambiguous, generate ONE short clarification question.
If the intent is clear, set clarification to null.

Return ONLY valid JSON:
{
  "intent": "...",
  "expansions": ["...", "...", "..."],
  "needsClarification": true/false,
  "clarification": "..." or null
}
```

### Phase 2 System Prompt: GENERATE

```
You are CookGenie, an expert chef creating personalized recipe recommendations.

You must respond with ONLY valid JSON — no markdown, no code fences.

Generate a primary recipe recommendation and 2-3 alternatives.

The primary recipe must include FULL details (8-16 ingredients, 5-8 steps).
Alternatives should be LIGHTWEIGHT (title, description, difference only — no ingredients/steps).

Each alternative must clearly differ from the primary:
- different technique (pressure cooker vs slow cook)
- different health profile (lighter version)
- different complexity (quick weeknight vs weekend project)
- different style (home-style vs restaurant-style)

Also generate 3 followup suggestions the user would naturally ask next.

Return this exact JSON structure:
{
  "primary": {
    "title": "", "description": "", "why_match": "",
    "cuisine": "", "cookingTime": 0, "prepTime": 0,
    "difficulty": "Easy|Medium|Hard", "calories": 0, "servings": 4,
    "tags": [],
    "ingredients": [{"name": "", "amount": 0, "unit": "", "category": "protein|dairy|spice|vegetable|grain|oil|other"}],
    "steps": [{"number": 1, "instruction": "", "duration": 0, "tip": ""}]
  },
  "alternatives": [
    {"title": "", "description": "", "difference": "", "cuisine": "", "cookingTime": 0, "difficulty": "", "calories": 0, "tags": []}
  ],
  "followups": ["...", "...", "..."]
}
```

### Token Limits

- Phase 1 (understand): 512 tokens (small structured output)
- Phase 2 (generate): 4096 tokens (full recipe + alternatives)
- Alternative expansion: 2048 tokens (one full recipe)

---

## Frontend: `useRecipeDiscovery` Hook

**File**: `src/hooks/use-recipe-discovery.ts`

### State Machine

```
idle → understanding → clarifying → generating → complete
                                                    ↓
                                                  error
```

### Interface

```typescript
interface UseRecipeDiscoveryReturn {
  // Actions
  discover: (query: string) => void;
  selectClarification: (choice: string) => void;
  skipClarification: () => void;
  expandAlternative: (index: number) => void;
  reset: () => void;

  // State
  phase: "idle" | "understanding" | "clarifying" | "generating" | "complete" | "error";

  // Phase 1 results
  intent: string | null;
  expansions: string[];
  clarification: string | null;

  // Phase 2 results
  primary: PrimaryRecipe | null;
  alternatives: AlternativeRecipe[];
  followups: string[];

  // Alternative expansion
  expandedAlternatives: Map<number, { ingredients: Ingredient[]; steps: CookingStep[] }>;
  expandingIndex: number | null;

  // Error
  error: string | null;
}
```

### Behavior

1. `discover(query)` → sets phase to `understanding`, calls `POST /api/recipes/discover { phase: "understand", query }`
2. If response `needsClarification === false` → auto-calls phase 2 with original query
3. If response `needsClarification === true` → sets phase to `clarifying`, shows expansions + clarification
4. `selectClarification(choice)` → sets phase to `generating`, calls `POST /api/recipes/discover { phase: "generate", resolvedIntent: choice }`
5. `skipClarification()` → same as above but with original query
6. `expandAlternative(index)` → calls `POST /api/recipes/discover/expand` with the alternative's data
7. `reset()` → returns to `idle`

---

## Frontend: `DiscoveryResultCard` Component

**File**: `src/components/search/discovery-result-card.tsx`

Shared component used by both search and ask pages.

### Sections

1. **Intent banner**: What CookGenie understood (e.g., "Looking for traditional Kerala chicken curry")
2. **Primary recipe card**: Full recipe with "Preview & Import" button. Uses existing `ImportPreviewSheet`.
3. **Alternatives section**: Collapsible. Each card shows title, difference, time, difficulty. "Expand" button loads full recipe.
4. **Followup chips**: 3 tappable buttons. On search page, navigate to `/ask?message=...`. On ask page, insert as new message.

### Clarification UI

When `phase === "clarifying"`:
- Show intent banner
- Show expansion chips as tappable buttons
- Show clarification question text
- Show "Skip — just find me something" link

---

## Search Page Changes

**File**: `src/app/search/page.tsx`

Replace the current AI Discovery section with the discovery engine:

**Before**: "Discover with AI" → `triggerAiSearch()` → flat `AiRecipeCard` list

**After**: "Discover with AI" → `discover(query)` → understanding → (optional clarification) → `DiscoveryResultCard`

The `useRecipeSearch` hook retains local DB search. The new `useRecipeDiscovery` hook handles AI discovery separately. Both coexist on the same page.

---

## Ask Page Changes

**File**: `src/app/api/ask/route.ts` + `src/app/ask/page.tsx`

### Backend

Add a new intent category in `src/lib/hybrid/intent.ts`:
- `recipe-search`: Detected when user asks for a recipe by name, cuisine, or cooking goal
- Patterns: "make me...", "recipe for...", "how to cook...", "I want to eat...", "suggest a..."

When `/api/ask` detects `recipe-search` intent, it delegates to the discover engine instead of the general AI handler.

### Frontend

When the ask page receives a `recipe-search` type response, it renders a `DiscoveryResultCard` inside the chat instead of a plain text response. Followup chips appear as quick-reply buttons below the card.

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| **Create** | `src/app/api/recipes/discover/route.ts` | Two-phase discover endpoint |
| **Create** | `src/app/api/recipes/discover/expand/route.ts` | Alternative expansion endpoint |
| **Create** | `src/hooks/use-recipe-discovery.ts` | Discovery state machine hook |
| **Create** | `src/components/search/discovery-result-card.tsx` | Shared result display component |
| **Create** | `src/lib/ai/prompts/discover.ts` | System prompts for understand + generate phases |
| **Modify** | `src/lib/ai/index.ts` | Add `discoverUnderstand()` and `discoverGenerate()` task methods |
| **Modify** | `src/lib/hybrid/intent.ts` | Add `recipe-search` intent category |
| **Modify** | `src/app/api/ask/route.ts` | Route `recipe-search` intent to discover engine |
| **Modify** | `src/app/search/page.tsx` | Replace AI Discovery section with discovery engine |
| **Modify** | `src/app/ask/page.tsx` | Render DiscoveryResultCard for recipe-search responses |

---

## Migration

- `POST /api/recipes/search` remains functional for backward compatibility
- `useRecipeSearch.triggerAiSearch()` internally delegates to the new discover engine
- Old `AiRecipeCard` component preserved but no longer used on search page (replaced by `DiscoveryResultCard`)
- Existing `ImportPreviewSheet` reused unchanged for the import flow

---

## Verification Plan

1. **Search page**: Type "Kerala chicken curry" → see understanding phase → clarification chips appear → pick one → primary + alternatives + followups render
2. **Search page no clarification**: Type "butter chicken" (unambiguous) → understanding auto-proceeds → results appear directly
3. **Ask page**: Type "I want to make something quick with chicken" → chat shows discovery card with primary + alternatives
4. **Alternative expansion**: Tap "Expand" on a lightweight alternative → full ingredients + steps load
5. **Import flow**: Tap "Preview & Import" on primary → ImportPreviewSheet → import → navigate to recipe page
6. **Followups**: Tap a followup chip → navigates to /ask with that message
7. **Filters**: Set cuisine=Indian on search page → discover with AI → AI respects the filter constraint
8. **Error handling**: AI returns malformed JSON → graceful error with "Try again" button
