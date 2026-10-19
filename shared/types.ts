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
  kind?:
    | 'gondola'
    | 'produce-table'
    | 'display-table'
    | 'service-counter'
    | 'seafood-tank'
    | 'chiller'
    | 'freezer'
    | 'hanging-rack';
  footprint?: { x: number; y: number; w: number; h: number };
  levels?: number;
  /** Maximum number of distinct SKUs placed on one side at one level. */
  capacityPerSlot?: number;
  /** Empty or omitted means this fixture has no display-group restriction. */
  allowedDisplayGroups?: string[];
  accessPoints?: Partial<Record<'left' | 'right' | 'front' | 'back', Point>>;
};
export type Point = { x: number; y: number };
export type Currency = 'USD' | 'CNY';
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
  source: 'seed' | 'manual' | 'suggested' | 'retail' | 'open-prices';
  unit?: string;
  currency?: Currency;
};
export type Product = {
  id: string;
  sku?: string;
  brand?: string;
  barcode?: string;
  catalogOrigin?: 'retailer' | 'manual' | 'legacy-demo' | 'open-prices';
  merchandisingFamily?: string;
  processingForm?:
    | 'fresh-whole'
    | 'canned'
    | 'dried'
    | 'smoked'
    | 'marinated'
    | 'fermented'
    | 'frozen'
    | 'prepared'
    | 'pickled'
    | 'preserved'
    | 'instant-ready'
    | 'packaged'
    | 'unknown';
  storageCondition?:
    | 'ambient-likely'
    | 'chilled-confirmed'
    | 'frozen-confirmed'
    | 'chilled-or-frozen-confirmed'
    | 'unknown';
  classificationConfidence?:
    'taxonomy-confirmed' | 'manual-name-review' | 'candidate' | 'needs-review';
  storageBasis?: StorageBasis;
  archiveReason?: string;
  /** Catalog-owned values as last written from the source catalog; staff edits differ from it. */
  catalogSnapshot?: Partial<
    Pick<Product, 'category' | 'storageCondition' | 'displayGroup' | 'packageSize' | 'status'>
  >;
  merchandisingState?: 'placed' | 'pending-review' | 'unplaced';
  displayGroup?: string;
  status?: 'draft' | 'active' | 'archived';
  inventoryMode?: 'tracked' | 'untracked';
  priceOrigin?: 'jd-retail' | 'manual' | 'open-prices' | 'samsclub';
  currency?: Currency;
  priceSourceUrl?: string;
  priceCheckedAt?: string;
  priceNote?: string;
  pricePer?: string | null;
  priceRecordId?: number;
  priceIsDiscounted?: boolean;
  priceWithoutDiscount?: number | null;
  priceLocationId?: number;
  priceLocationOsmId?: number;
  priceLocationOsmType?: string;
  priceLocationName?: string;
  priceLocationDisplayName?: string;
  priceLocationCity?: string;
  priceLocationCountry?: string;
  priceProofId?: number;
  sourceImageUrl?: string;
  sourceRetailer?: string;
  /** Sam’s Club PDP usItemId; distinct from the store Item # stored in sourceSku. */
  sourcePageId?: string;
  sourceUrl?: string;
  sourceSku?: string;
  sourceListingUrl?: string;
  sourceCheckedAt?: string;
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
  shelfSide?: 'left' | 'right' | 'front' | 'back';
  shelfLevel?: number;
  history: PriceRecord[];
  marketPrice?: number;
  marketDate?: string;
  marketSource?: string;
  marketReference?: MarketReference;
  createdAt: string;
  saleMode?: 'weight' | 'pack';
  /** Net contents of one sold unit. `unit` remains the display/legacy source. */
  packageSize?: {
    quantity: number;
    unit: 'g' | 'ml' | 'piece' | 'package';
    /** Weighed goods: quantity is the source estimate; checkout weight decides the price. */
    estimated?: boolean;
    /** Multi-pack contents that the listing and unit price could not confirm. */
    ambiguous?: boolean;
    /** Source text behind the quantity, shown to staff. */
    basis?: string;
  };
};
export type ProductGalleryImage = {
  url: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  width?: number;
  height?: number;
};
export type RetailPriceObservation = {
  price: number;
  currency: Currency;
  channel: string;
  clubId: string | null;
  clubName: string | null;
  city: string | null;
  capturedAt: string;
  unitPriceText: string | null;
  finalCostByWeight: boolean;
};
export type ProductDetailResponse = {
  product: Product;
  originalName?: string;
  gallery: ProductGalleryImage[];
  introduction: string;
  introductionIsSummary?: boolean;
  highlights: string[];
  specifications: string[];
  prices: RetailPriceObservation[];
  selectedChannel?: string;
  finalCostByWeight?: boolean;
};
export type SamsClubCatalogRecord = {
  itemId: string;
  /** Sam’s Club PDP usItemId from the public URL; distinct from the store Item #. */
  sourcePageId?: string;
  originalName: string;
  name: string;
  category: string;
  categoryName?: string;
  storageCondition: NonNullable<Product['storageCondition']>;
  displayGroup: string;
  unit: string;
  packageSize?: Product['packageSize'] | null;
  description: string;
  barcode: string | null;
  brand: string | null;
  sourceUrl: string;
  capturedAt: string;
  price: number;
  selectedChannel: string;
  clubId: string | null;
  finalCostByWeight: boolean;
  gallery: ProductGalleryImage[];
  introduction: string;
  introductionIsSummary?: boolean;
  highlights: string[];
  specifications: string[];
  prices: RetailPriceObservation[];
  /** Reviewed out-of-scope records stay in the source catalog but are not sold or placed. */
  status?: 'archived';
  archiveReason?: string;
  storageBasis?: StorageBasis;
  /** Reviewer note when the category differs from the ingest classification. */
  categoryNote?: string;
  /** Ingest values replaced by the review pass; existing databases sync only untouched fields. */
  reviewPrevious?: Partial<Pick<SamsClubCatalogRecord, CatalogReviewField>>;
};
export type CatalogReviewField =
  | 'category'
  | 'categoryName'
  | 'storageCondition'
  | 'displayGroup'
  | 'packageSize';
export type StorageBasis = {
  /** `source-text`: quoted from the retailer page; `manual-review`: reviewer decision. */
  kind: 'source-text' | 'title' | 'manual-review';
  text: string;
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
  planningVersion?: string;
  people: number;
  budget: number | null;
  wants: MealWant[];
  owned: string[];
  excluded: string[];
  buyPantry: string[];
  dishIds: string[];
  cheaper: boolean;
  /** Legacy field name: include a Western starchy side, not mandatory rice. */
  includeRice: boolean;
  days: number;
  mealsPerDay: number;
  singleMeal?: '早餐' | '午餐' | '晚餐' | '加餐';
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
    /** Model references the supplied English catalog by ID; amounts remain consumption needs. */
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
  currency?: Currency;
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
