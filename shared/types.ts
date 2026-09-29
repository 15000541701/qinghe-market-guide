export type Category = string;
export type StoreSection = {
  id: string;
  name: string;
  code: string;
  color: string;
  tint: string;
  location: Point;
  rect: { x: number; y: number; w: number; h: number };
  active: boolean;
};
export type StoreCategory = {
  id: Category;
  name: string;
  active: boolean;
  sectionId: string | null;
  kind: 'food' | 'non_food';
};
export type Shelf = {
  id: string;
  sectionId: string;
  name: string;
  position: Point | null;
  reachable: boolean;
};
export type Point = { x: number; y: number };
export type Zone = {
  id: Category;
  name: string;
  code: string;
  color: string;
  tint: string;
  location: Point;
  rect: { x: number; y: number; w: number; h: number };
};
export type PriceRecord = {
  price: number;
  date: string;
  source: 'seed' | 'manual' | 'suggested';
  unit?: string;
};
export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  unit: string;
  image: string;
  description: string;
  tags: string[];
  aliases: string[];
  stock: number;
  shelf: string;
  shelfId?: string;
  history: PriceRecord[];
  marketPrice?: number;
  marketDate?: string;
  marketSource?: string;
  marketReference?: MarketReference;
  createdAt: string;
  saleMode?: 'weight' | 'pack';
  /** Net contents of one sold unit. `unit` remains the display/legacy source. */
  packageSize?: { quantity: number; unit: 'g' | 'ml' | 'piece' | 'package' };
};
export type QueryFilters = {
  categories: Category[];
  min?: number;
  max?: number;
  term?: string;
  sort?: 'price' | 'default';
};
export type GuideResponse = {
  text: string;
  products: Product[];
  filters: QueryFilters;
  engine: 'rules' | 'model';
  fallback?: string;
  mealPlan?: MealPlan;
  action?: ShoppingAction;
  trace?: string[];
};
export type MealWant = 'fish' | 'greens' | 'vegetables' | 'meat' | 'shrimp' | 'egg' | 'breakfast';
export type MealPreferences = {
  people: number;
  budget: number | null;
  wants: MealWant[];
  owned: string[];
  excluded: string[];
  buyPantry: string[];
  dishIds: string[];
  cheaper: boolean;
  includeRice: boolean;
  days: number;
  mealsPerDay: number;
  /** Household staples confirmed available; amounts are intentionally not inferred. */
  homePantry: string[];
  generatedMeals?: GeneratedMeal[];
};
export type GeneratedMeal = {
  id: string;
  day: number;
  meal: string;
  dishes: GeneratedDish[];
};
export type GeneratedDish = {
  id: string;
  title: string;
  kind: 'staple' | 'protein' | 'vegetable' | 'mixed';
  minutes: number;
  steps: string[];
  ingredients: {
    ingredient?: string;
    grams?: number;
    milliliters?: number;
    pieces?: number;
    /** Accepted only for old saved plans; new model output never supplies SKU units. */
    productId?: string;
    units?: number;
  }[];
};
export type PlannedRecipe = {
  id: string;
  title: string;
  minutes: number;
  steps: string[];
  ingredients: string[];
  day?: number;
  meal?: string;
  kind?: 'staple' | 'protein' | 'vegetable' | 'mixed';
  ingredientAmounts?: { name: string; amount: string }[];
};
export type MealLine = {
  product: Product;
  quantity: number;
  amount: string;
  cost: number;
  dishes: string[];
  matchStatus?: 'matched' | 'substitute';
  recipeAmount?: string;
  packageAmount?: string;
  recipeGrams?: number;
  purchasedQuantity?: number;
  remainingQuantity?: number;
  listedQuantity?: number;
  additionalQuantity?: number;
  calculation?: string;
};
export type UnresolvedMealIngredient = {
  ingredient: string;
  amount: string;
  status: 'not_in_store' | 'unit_mismatch' | 'out_of_stock';
  dishes: string[];
};
export type MealPlan = {
  preferences: MealPreferences;
  recipes: PlannedRecipe[];
  items: MealLine[];
  owned: string[];
  pendingPantry: string[];
  missing: string[];
  total: number;
  addedCost: number;
  existingCost: number;
  remaining: number | null;
  canApply: boolean;
  notes: string[];
  recipeCost?: number;
  newlyAddedCost?: number;
  unpriced?: string[];
  unresolved?: UnresolvedMealIngredient[];
  budgetComplete?: boolean;
};
export type ShoppingAction =
  | { type: 'add'; items: { productId: string; quantity: number }[] }
  | { type: 'remove'; productIds: string[] }
  | { type: 'apply_plan'; items: { productId: string; quantity: number }[]; budget: number | null }
  | { type: 'navigate'; category?: Category; productId?: string }
  | { type: 'next' }
  | { type: 'undo' };
export type ShoppingContext = {
  cart: ListItem[];
  meal?: MealPreferences;
  recipeIds?: string[];
  homePantry?: string[];
};
export type VisionCandidate = {
  name: string;
  category: Category;
  score: number;
  productId?: string;
};
export type VisionResponse = {
  candidates: VisionCandidate[];
  image: string;
  engine: 'model';
  uncertain: boolean;
  notice: string;
};
export type PriceAdvice = {
  price: number;
  low: number;
  high: number;
  historyMedian: number | null;
  marketPrice: number | null;
  sampleCount: number;
  source: string;
  explanation: string;
  history: PriceRecord[];
  marketSource?: string;
  marketDate?: string;
  marketKind?: 'retail' | 'wholesale';
  wholesalePrice?: number | null;
  markupPercent?: number;
};
export type MarketQuote = {
  id: string;
  name: string;
  category: string;
  origin: string;
  spec: string;
  low: number;
  average: number;
  high: number;
  unit: string;
  date: string;
};
export type MarketReference = {
  price: number;
  source: string;
  date: string;
  unit?: string;
  kind?: 'retail' | 'wholesale';
  markupPercent?: number;
  quote?: MarketQuote;
  sourceUrl?: string;
  fetchedAt?: string;
};
export type MarketSearchResult = {
  query: string;
  source: string;
  sourceUrl: string;
  fetchedAt: string;
  quotes: MarketQuote[];
  latestDate: string | null;
  notice: string;
};
export type ListItem = {
  productId: string;
  quantity: number;
  checked: boolean;
  purchasedQuantity?: number;
};
export type Route = {
  points: Point[];
  stops: Category[];
  distance: number;
  minutes: number;
  shelfStops?: Shelf[];
  unreachable?: string[];
};
