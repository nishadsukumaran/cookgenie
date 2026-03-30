/**
 * CookPilot AI Service — Task-based, model-agnostic.
 *
 * Routes through Vercel AI Gateway when OIDC token is available.
 * Falls back to mock responses when gateway is unavailable.
 *
 * Usage:
 *   import { ai } from "@/lib/ai";
 *   const result = await ai.rescueAdvice({ problem: "too salty", recipeName: "Butter Chicken" });
 */

import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { shouldUseMock, getModel, AI_CONFIG } from "./gateway";

// ─── Response Type ──────────────────────────────────

export interface AiResponse {
  content: string;
  model: string;
  latencyMs: number;
  wasMock: boolean;
}

// ─── Task Input Types ───────────────────────────────

export interface RescueAdviceInput {
  problem: string;
  recipeName?: string;
  cuisine?: string;
  currentStep?: number;
  structuredFix?: string;
}

export interface SubstitutionInput {
  recipeName?: string;
  original: string;
  substitute: string;
  cuisine?: string;
  category?: string;        // protein, dairy, spice, etc.
  dishType?: string;        // curry, baking, salad, etc.
  quantityRatio?: number;   // e.g., 0.75
  structuredImpact?: {      // pre-fetched from substitution DB
    taste: { score: number; description: string };
    texture: { score: number; description: string };
    authenticity: { score: number; description: string };
    summary: string;
  };
}

export interface RecipeReasoningInput {
  recipeName: string;
  question: string;
  cuisine?: string;
}

export interface AuthenticityInput {
  recipeName: string;
  cuisine: string;
  modifications: string[];
}

export interface ModificationInput {
  recipeName: string;
  cuisine?: string;
  modificationType: string;
  structuredPlan: string;
}

export interface RecipeGenerationInput {
  query: string;
  count?: number; // how many candidates to generate (default 3)
}

// ─── AI Service ─────────────────────────────────────

export const ai = {
  async rescueAdvice(input: RescueAdviceInput): Promise<AiResponse> {
    return callAi("rescue-advice", RESCUE_SYSTEM, buildRescuePrompt(input), input.problem);
  },

  async substitutionAnalysis(input: SubstitutionInput): Promise<AiResponse> {
    return callAi("substitution-analysis", SUBSTITUTION_SYSTEM, buildSubstitutionPrompt(input), `${input.original} → ${input.substitute}`);
  },

  async recipeReasoning(input: RecipeReasoningInput): Promise<AiResponse> {
    return callAi("recipe-reasoning", REASONING_SYSTEM, buildReasoningPrompt(input), input.question);
  },

  async authenticityAnalysis(input: AuthenticityInput): Promise<AiResponse> {
    return callAi("authenticity-analysis", AUTHENTICITY_SYSTEM, buildAuthenticityPrompt(input), input.recipeName);
  },

  async modificationAnalysis(input: ModificationInput): Promise<AiResponse> {
    return callAi("modification-analysis", MODIFICATION_SYSTEM, buildModificationPrompt(input), `${input.modificationType}: ${input.recipeName}`);
  },

  async recipeGeneration(input: RecipeGenerationInput): Promise<AiResponse> {
    return callAi("recipe-generation", RECIPE_GEN_SYSTEM, buildRecipeGenPrompt(input), input.query);
  },

  isLive(): boolean {
    return !shouldUseMock();
  },
};

// ─── Core Call Function ─────────────────────────────

async function callAi(
  taskType: string,
  systemPrompt: string,
  userPrompt: string,
  inputSummary: string
): Promise<AiResponse> {
  const start = Date.now();
  const modelId = getModel("primary");

  // Live mode — real AI Gateway call
  if (!shouldUseMock()) {
    try {
      const result = await generateText({
        model: gateway(modelId),
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: AI_CONFIG.maxTokens,
      });

      return {
        content: result.text,
        model: modelId,
        latencyMs: Date.now() - start,
        wasMock: false,
      };
    } catch (err) {
      // Gateway failure — fall back to mock with a warning
      console.error(`[CookPilot AI] Gateway call failed for ${taskType}, falling back to mock:`, err instanceof Error ? err.message : err);
      const mock = getMockResponse(taskType, inputSummary);
      return {
        content: mock,
        model: "mock (gateway-fallback)",
        latencyMs: Date.now() - start,
        wasMock: true,
      };
    }
  }

  // Mock mode
  const mock = getMockResponse(taskType, inputSummary);
  return {
    content: mock,
    model: "mock",
    latencyMs: Date.now() - start,
    wasMock: true,
  };
}

// ─── System Prompts ─────────────────────────────────

const RESCUE_SYSTEM = `You are CookPilot, an expert chef and cooking scientist.
Your role is to EXPLAIN why a cooking fix works — not to invent a new fix.
The knowledge base provides the factual fix. You provide the science, practical tips, and context.

Rules:
- NEVER contradict the knowledge base fix
- NEVER suggest a different primary action
- Explain the chemistry or technique behind why the fix works
- Add practical tips specific to the dish and cuisine mentioned
- Keep responses under 120 words
- Be warm, calm, and reassuring — the cook is stressed`;

const SUBSTITUTION_SYSTEM = `You are CookPilot, an expert chef specializing in ingredient substitutions.
Your role is to EXPLAIN a substitution that our knowledge base has already selected — not to suggest a different one.
The knowledge base provides the substitute, ratio, and impact scores. You provide practical context.

Rules:
- NEVER suggest a different primary substitute than the one provided
- Explain WHY this substitute works (the food science)
- Provide cooking tips: when to add it, how to adjust technique
- Give dish-specific context when a recipe name is provided
- Be honest about trade-offs the scores indicate
- Keep responses under 120 words`;

const REASONING_SYSTEM = `You are CookPilot, an expert chef and cooking scientist.
Answer cooking questions concisely. Be specific to the dish and cuisine.
Keep responses under 120 words.`;

const AUTHENTICITY_SYSTEM = `You are CookPilot, a culinary historian who respects food traditions.
Analyze how modifications affect a dish's authenticity. Rate 1-5 and explain.
Be respectful but honest. Keep responses under 120 words.`;

const MODIFICATION_SYSTEM = `You are CookPilot, an expert chef and nutritionist.
Your role is to EXPLAIN a recipe modification plan that our engine has already computed — not to suggest different changes.
The engine provides specific ingredient reductions, calorie savings, and warnings. You provide the practical context.

Rules:
- NEVER suggest different ingredient changes than those provided
- Explain what happens to taste, texture, and the dish's signature
- Provide practical cooking tips to minimize negative impact
- Be honest: if the modification hurts the dish significantly, say so clearly
- Acknowledge what is preserved (the "signature") and what is lost
- Keep responses under 150 words`;

const RECIPE_GEN_SYSTEM = `You are CookPilot, an expert chef creating recipe data.
You MUST respond with ONLY valid JSON — no markdown, no code fences, no explanation text.
Generate authentic, practical recipes that a home cook can follow.

The JSON must be an array of recipe objects with this exact structure:
[{
  "title": "Recipe Name",
  "description": "2-3 sentence description",
  "cuisine": "Indian|Arabic|Middle Eastern|Italian|Thai|Mexican|Japanese|International",
  "cookingTime": 30,
  "prepTime": 15,
  "difficulty": "Easy|Medium|Hard",
  "servings": 4,
  "calories": 400,
  "tags": ["tag1", "tag2"],
  "ingredients": [{"name": "Ingredient", "amount": 200, "unit": "g", "category": "protein|dairy|spice|vegetable|grain|oil|other"}],
  "steps": [{"number": 1, "instruction": "Step text", "duration": 5, "tip": "Optional tip"}]
}]

Rules:
- Each recipe must have 8-16 ingredients and 5-8 steps
- Use realistic amounts and common units (g, ml, tsp, tbsp, cup, pieces, cloves)
- Include accurate calorie estimates per serving
- Steps must be actionable and specific`;

// ─── Prompt Builders ────────────────────────────────

function buildRescuePrompt(input: RescueAdviceInput): string {
  let prompt = `The cook says: "${input.problem}"`;
  if (input.recipeName) prompt += `\nThey are making: ${input.recipeName}`;
  if (input.cuisine) prompt += ` (${input.cuisine} cuisine)`;
  if (input.currentStep) prompt += `\nCurrently on step ${input.currentStep}`;

  if (input.structuredFix) {
    prompt += `\n\nOur knowledge base recommends this fix:\n"${input.structuredFix}"`;
    prompt += `\n\nExplain WHY this fix works (the science/technique behind it).`;
    prompt += `\nAdd practical tips for this specific dish if relevant.`;
    prompt += `\nDo NOT suggest a different primary fix.`;
  } else {
    prompt += `\n\nWe have no structured fix for this. Provide: 1) immediate fix 2) what caused this 3) prevention tip.`;
  }

  return prompt;
}

function buildSubstitutionPrompt(input: SubstitutionInput): string {
  let prompt = `Substitution: ${input.original} → ${input.substitute}`;
  if (input.recipeName) prompt += `\nDish: ${input.recipeName}`;
  if (input.cuisine) prompt += ` (${input.cuisine} cuisine)`;
  if (input.category) prompt += `\nIngredient category: ${input.category}`;
  if (input.dishType) prompt += `\nDish type: ${input.dishType}`;

  if (input.structuredImpact) {
    const si = input.structuredImpact;
    prompt += `\n\nOur knowledge base says:`;
    if (input.quantityRatio) prompt += `\n- Use ${Math.round(input.quantityRatio * 100)}% of the original amount`;
    prompt += `\n- Taste impact: ${si.taste.score}/5 — ${si.taste.description}`;
    prompt += `\n- Texture impact: ${si.texture.score}/5 — ${si.texture.description}`;
    prompt += `\n- Authenticity: ${si.authenticity.score}/5 — ${si.authenticity.description}`;
    prompt += `\n\nExplain WHY this substitute works. Give practical cooking tips for this specific dish.`;
    prompt += `\nDo NOT suggest a different substitute.`;
  } else {
    prompt += `\n\nExplain: flavor change, texture change, technique adjustments needed.`;
  }

  return prompt;
}

function buildReasoningPrompt(input: RecipeReasoningInput): string {
  let prompt = `About ${input.recipeName}`;
  if (input.cuisine) prompt += ` (${input.cuisine})`;
  prompt += `: ${input.question}`;
  return prompt;
}

function buildAuthenticityPrompt(input: AuthenticityInput): string {
  return `How authentic is ${input.recipeName} (${input.cuisine} cuisine) after these modifications: ${input.modifications.join(", ")}? Rate 1-5 and explain.`;
}

function buildRecipeGenPrompt(input: RecipeGenerationInput): string {
  const count = input.count ?? 3;
  return `Generate ${count} recipe${count > 1 ? "s" : ""} for: "${input.query}"

Return ONLY a JSON array. No other text.`;
}

function buildModificationPrompt(input: ModificationInput): string {
  let prompt = `Recipe: ${input.recipeName}`;
  if (input.cuisine) prompt += ` (${input.cuisine} cuisine)`;
  prompt += `\nModification goal: ${input.modificationType}`;
  prompt += `\n\nOur engine computed this plan:\n${input.structuredPlan}`;
  prompt += `\n\nExplain the tradeoffs:`;
  prompt += `\n1. What changes in taste and texture?`;
  prompt += `\n2. What is preserved (the dish's signature)?`;
  prompt += `\n3. Practical tips to minimize negative impact?`;
  prompt += `\nDo NOT suggest different ingredient changes.`;
  return prompt;
}

// ─── Mock Responses ─────────────────────────────────

function getMockResponse(taskType: string, inputSummary: string): string {
  const input = inputSummary.toLowerCase();

  if (taskType === "rescue-advice") {
    if (input.includes("salt")) {
      return "The lemon juice works because citric acid directly counteracts our perception of sodium on the taste buds — it's not masking the salt, it's chemically rebalancing the flavor. For your dish specifically, add the acid gradually (1 tsp at a time) and stir well before tasting again. The potato trick works for soups and stews where the potato can absorb salt from the liquid, but it's less effective for thick curries. If you're making an Indian curry, try adding a tablespoon of cream or yogurt as well — dairy proteins also bind to sodium.";
    }
    if (input.includes("spic") || input.includes("hot") || input.includes("chil")) {
      return "Dairy is your best friend here. The casein protein in yogurt and cream physically wraps around capsaicin molecules and washes them away from your taste receptors. This is why raita is always served with spicy Indian food — it's not just tradition, it's chemistry. Add 2-3 tablespoons of plain yogurt or cream, stir well, and taste after 2 minutes. A pinch of sugar also helps by activating sweet receptors that partially suppress the heat signal. For Indian curries, coconut milk also works — the fat helps dissolve and distribute capsaicin more evenly so the heat is less concentrated.";
    }
    if (input.includes("water") || input.includes("thin") || input.includes("runny")) {
      return "The fastest fix is to remove the lid and increase heat to medium-high — evaporation will thicken it naturally in 10-15 minutes. Stir frequently to prevent the bottom from burning. For a quicker fix, make a slurry: mix 1 tbsp cornstarch with 2 tbsp cold water (must be cold or it clumps), then stir it in. For Indian curries specifically, cashew paste or tomato paste are better thickeners than cornstarch — they add body without the starchy texture. Another trick: grate half a potato directly into the curry and simmer for 5 minutes — the starch thickens naturally.";
    }
    if (input.includes("thick") || input.includes("dense") || input.includes("heavy")) {
      return "Add warm liquid gradually — cold liquid causes temperature shock and uneven texture. For cream-based curries, warm milk or cream works best (2 tbsp at a time). For tomato-based dishes, use warm broth or tomato juice. The key is to add small amounts and stir well between additions — you can always add more, but you can't take liquid back out. Remember: sauces thicken as they cool, so if it looks right when hot, it'll be thicker when served. Slightly thinner than your target while cooking is actually perfect.";
    }
    if (input.includes("bland") || input.includes("flavor") || input.includes("taste")) {
      return "Blandness is almost always under-seasoning, not missing spices. Start with salt — it's the single most powerful flavor amplifier. Add 1/4 tsp, stir, taste, repeat. After salt, add acid: a squeeze of lemon juice or splash of vinegar brightens everything. Then try a pinch of sugar — it rounds out harsh edges. If you've seasoned well and it's still flat, the issue is likely that spices weren't bloomed properly. Toast 1 tsp of whole cumin or coriander seeds in a dry pan for 30 seconds until fragrant, crush, and stir in. For umami depth, a teaspoon of soy sauce works magic even in non-Asian dishes.";
    }
    if (input.includes("sweet")) {
      return "Excess sweetness is best countered with acid and salt. Start with a squeeze of lemon juice (1-2 tsp) — citric acid directly suppresses sweet taste receptors. Then add a small pinch of salt, which further masks sweetness. For savory dishes, a splash of vinegar or soy sauce adds complexity that breaks through the sugar. If it's a tomato-based sauce, add more crushed tomatoes to dilute. For desserts or bakes, this is harder to fix — try adding a tablespoon of unsweetened cocoa powder (for chocolate dishes) or a pinch of espresso powder, which adds bitterness that balances sweetness.";
    }
    if (input.includes("burn") || input.includes("scorch") || input.includes("stuck")) {
      return "Act fast — don't scrape the bottom! Immediately transfer the unburned top portion to a clean pot, leaving the burnt layer behind. Even a few seconds of contact transfers smoky bitterness upward. Taste the rescued portion: if there's a slight smoky taste, add a splash of vinegar or lemon juice (acid masks burnt flavor), and extra seasoning to compensate. For rice, place a slice of white bread on top, cover, and let it sit for 10 minutes — the bread absorbs the burnt aroma. For a curry or stew, a teaspoon of peanut butter can mask mild burning without changing the dish's character. Prevention: always use heavy-bottomed pans and stir during high-heat steps.";
    }
    return "Take a breath — most cooking mistakes are fixable! The key is to make small adjustments and taste between each one. Don't try to fix everything in a single move. What specific issue are you dealing with? The more detail you give me, the more precise my advice will be.";
  }

  if (taskType === "substitution-analysis") {
    if (input.includes("cream") && input.includes("cashew")) {
      return "Cashew paste is the closest substitute for heavy cream in Indian cooking — many restaurant kitchens use it as their default. The nuttiness actually adds depth that pairs beautifully with garam masala. Soak 15 raw cashews in hot water for 10 minutes, then blend until completely smooth. Use about 75% of the original cream amount. The only downside: it won't create the same white swirl for presentation. Add it at the same stage you'd add cream, and simmer for 2-3 minutes to integrate.";
    }
    if (input.includes("butter") && input.includes("ghee")) {
      return "Ghee is actually a superior substitute for butter in Indian cooking — it's what traditional recipes call for. Ghee is clarified butter with the milk solids removed, giving it a nuttier, deeper flavor and a much higher smoke point (250°C vs 175°C). Use about 85% of the butter amount since ghee is more concentrated. The only difference you'll notice: slightly nuttier aroma and the sauce won't have that creamy, emulsified quality that whole butter gives. For Butter Chicken specifically, many restaurants finish with a small knob of regular butter on top for presentation, even when the cooking fat is ghee.";
    }
    if (input.includes("butter") && input.includes("olive")) {
      return "This is a significant swap — olive oil and butter serve very different roles. Butter contributes richness, creaminess, and a distinctive dairy sweetness that's central to dishes like Butter Chicken and Paneer Butter Masala. Olive oil adds its own fruity, peppery character that can clash with Indian spice profiles. Use 75% of the butter amount (olive oil is more intensely flavored). The dish will be lighter but will lose its signature richness. If you're going dairy-free, coconut oil is actually a better substitute for Indian dishes than olive oil — it has a neutral-to-sweet flavor and similar fat behavior.";
    }
    if (input.includes("yogurt") && (input.includes("greek") || input.includes("sour"))) {
      return "Greek yogurt is an excellent 1:1 substitute — in fact, it's often better for marinades because it's thicker and clings to the protein more effectively. The extra thickness means the spice paste adheres better during marination, leading to more flavorful chicken. The tanginess is slightly more pronounced than regular yogurt, which actually enhances the overall flavor profile. For cooking (as opposed to marinating), add Greek yogurt off the heat or at very low temperature — it's higher in protein and curdles more easily when boiled. Stir it in at the end and keep the heat low.";
    }
    return `Substituting in this dish will change the flavor profile somewhat. The key is to add the substitute at the same cooking stage as the original ingredient and taste after a few minutes. You may need to adjust seasoning to compensate for the difference in richness or flavor intensity.`;
  }

  if (taskType === "modification-analysis") {
    if (input.includes("calori") || input.includes("healthier")) {
      return "The cream and butter reductions will noticeably affect the dish's richness — that's the honest tradeoff. Butter Chicken's signature is its velvety, buttery mouthfeel, and reducing both by 40-50% means you'll lose some of that luxurious quality. However, the core spice profile (garam masala, kasuri methi, cumin) is completely untouched, so the dish still tastes like Butter Chicken — just a lighter version. Practical tip: reduce the cream last and by the smallest amount possible, since cream contributes more to the signature than cooking oil does. You can also add a tablespoon of cashew paste to restore some body without the calories.";
    }
    if (input.includes("spice") || input.includes("heat")) {
      return "Reducing chili powder by half cuts the heat significantly while preserving all other flavors. The warming spices (garam masala, cumin, coriander) are untouched, so the dish keeps its aromatic complexity. Add a tablespoon of extra cream or yogurt — dairy mellows residual heat and adds richness. The dish's signature stays intact: the only thing that changes is the burn level, not the flavor depth.";
    }
    return "This modification will change the dish's character somewhat. The key ingredients that define the recipe's signature are preserved, but the balance shifts. Cook's tip: make the changes gradually and taste as you go. You can always adjust further, but you can't undo an over-correction.";
  }

  if (taskType === "recipe-generation") {
    return JSON.stringify([{
      title: `${input.charAt(0).toUpperCase() + input.slice(1)} (CookPilot Generated)`,
      description: `A classic ${input} recipe generated by CookPilot AI. Perfect for home cooking with readily available ingredients.`,
      cuisine: "International",
      cookingTime: 30,
      prepTime: 15,
      difficulty: "Medium",
      servings: 4,
      calories: 400,
      tags: ["AI Generated"],
      ingredients: [
        { name: "Main protein or base", amount: 500, unit: "g", category: "protein" },
        { name: "Onion", amount: 2, unit: "medium", category: "vegetable" },
        { name: "Garlic", amount: 4, unit: "cloves", category: "vegetable" },
        { name: "Oil", amount: 2, unit: "tbsp", category: "oil" },
        { name: "Salt", amount: 1, unit: "to taste", category: "spice" },
      ],
      steps: [
        { number: 1, instruction: "Prepare all ingredients.", duration: 10 },
        { number: 2, instruction: "Cook the main components.", duration: 15 },
        { number: 3, instruction: "Combine and season to taste.", duration: 5 },
        { number: 4, instruction: "Serve hot.", tip: "Garnish with fresh herbs." },
      ],
    }]);
  }

  return "Great question! The technique matters because each step builds on the previous one, creating layers of flavor that you can't shortcut. The specific method was developed over generations of cooks refining what works best for this cuisine.";
}
