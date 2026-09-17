export type Category = 'vegetables' | 'fruit' | 'seafood' | 'meat' | 'dairy' | 'bakery' | 'pantry';
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
  history: PriceRecord[];
  marketPrice?: number;
  marketDate?: string;
  marketSource?: string;
  createdAt: string;
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
};
export type ListItem = { productId: string; quantity: number; checked: boolean };
export type Route = { points: Point[]; stops: Category[]; distance: number; minutes: number };
