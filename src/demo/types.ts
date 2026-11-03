import type { GuideResponse, ListItem, MealPlan, Point, Product, Route } from '../../shared/types';

export type DemoChat = {
  capture: () => unknown;
  restore: (snapshot: unknown) => void;
  draft: (text: string) => void;
  send: (text: string, signal?: AbortSignal) => Promise<GuideResponse | undefined>;
};
export type DemoAdmin = {
  capture: () => unknown;
  restore: (snapshot: unknown) => void;
  section: (section: 'categories' | 'sections' | 'facilities') => void;
  ready: () => boolean;
  search: (text: string) => void;
  edit: (id: string) => void;
  price: (text: string) => void;
  save: () => Promise<Product | undefined>;
  selectShelf: (id: string) => void;
  unplace: (id: string) => Promise<boolean | undefined>;
  undoPlacement: () => Promise<boolean | undefined>;
};
export type DemoBridge = {
  capture: () => Promise<unknown>;
  restore: (snapshot: unknown, signal: AbortSignal) => Promise<void>;
  ready: boolean;
  isolated: boolean;
  ai: boolean;
  reset: (signal: AbortSignal) => Promise<void>;
  customer: (tab?: 'guide' | 'list') => Promise<void>;
  catalog: (text: string) => void;
  pickProduct: () => Product | undefined;
  openDetail: (product: Product) => Promise<void>;
  closeDetail: () => Promise<void>;
  detailReady: () => boolean;
  nextPhoto: () => void;
  chat: () => DemoChat | null;
  showAdmin: () => Promise<void>;
  admin: () => DemoAdmin | null;
  point: (point: Point) => void;
  arrive: () => void;
  snapshot: () => {
    products: Product[];
    list: ListItem[];
    route: Route | null;
    plan: MealPlan | null;
  };
};
