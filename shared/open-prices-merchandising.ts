// Static per-barcode merchandising decisions from the reviewed Open Prices/OFF catalog.
// New rows without an explicit decision stay pending; no startup name-based classifier.
export type OpenPricesMerchandisingDecision = {
  family: string;
  processForm: string;
  storageCondition: 'ambient-likely' | 'chilled-confirmed' | 'frozen-confirmed' | 'unknown';
  classificationConfidence: 'taxonomy-confirmed' | 'manual-name-review' | 'candidate' | 'needs-review';
  merchandisingState: 'placed' | 'pending-review' | 'unplaced';
  displayGroup: string;
  sourceCategoriesTags: string[];
  note?: string;
};

export const openPricesMerchandisingByBarcode: Record<string, OpenPricesMerchandisingDecision> = {
  "0816697020616": {
    "family": "packaged-other",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-savory",
    "sourceCategoriesTags": [
      "en:frozen-foods",
      "en:frozen-snacks-and-starters"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0082674073306": {
    "family": "seafood",
    "processForm": "smoked",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:seafood"
    ],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0099482504847": {
    "family": "seafood",
    "processForm": "smoked",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0099482504830": {
    "family": "seafood",
    "processForm": "smoked",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0898024002014": {
    "family": "seafood",
    "processForm": "smoked",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:seafood",
      "en:fishes-and-their-products",
      "en:fishes",
      "en:fatty-fishes",
      "en:salmons",
      "en:smoked-fishes",
      "en:smoked-salmons"
    ],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0099482547400": {
    "family": "seafood",
    "processForm": "raw-candidate",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0818446010756": {
    "family": "seafood",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-seafood-preserved",
    "sourceCategoriesTags": [
      "en:seafood",
      "en:fishes-and-their-products",
      "en:canned-foods",
      "en:fishes",
      "en:fatty-fishes",
      "en:canned-fishes",
      "en:sardines",
      "en:canned-sardines",
      "en:sardines-in-oil"
    ],
    "note": ""
  },
  "0840442200091": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0032917001597": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:beverage-preparations",
      "en:teas",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0032917002983": {
    "family": "tea-coffee",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": "Herbal tea product by name; dry packaged."
  },
  "0032917000132": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:beverage-preparations",
      "en:teas",
      "en:herbal-teas",
      "en:herbal-teas-in-tea-bags",
      "en:tea-leaves",
      "en:tea-bags"
    ],
    "note": ""
  },
  "0081014803160": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates"
    ],
    "note": ""
  },
  "0023384101200": {
    "family": "seafood",
    "processForm": "smoked",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0099482542504": {
    "family": "seafood",
    "processForm": "raw-candidate",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:seafood",
      "en:fishes-and-their-products",
      "en:fishes",
      "en:fatty-fishes",
      "en:salmons"
    ],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0858847000840": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:cocoa-and-its-products",
      "en:cocoa-and-chocolate-powders",
      "en:cocoa-powders"
    ],
    "note": ""
  },
  "0071818774001": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:baking-decorations"
    ],
    "note": ""
  },
  "0858847000680": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:cocoa-and-chocolate-powders",
      "en:dark-chocolates",
      "en:Baking decorations"
    ],
    "note": ""
  },
  "0858847000697": {
    "family": "snack-sweet",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:Caco Nibs"
    ],
    "note": "Cacao nibs; packaged snack/baking ingredient."
  },
  "0811961021313": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates"
    ],
    "note": ""
  },
  "0071012041053": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:flours",
      "en:cereal-flours",
      "en:wheat-flours"
    ],
    "note": ""
  },
  "0071012055555": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:flours",
      "en:cereal-flours",
      "en:wheat-flours",
      "en:common-wheat-flours",
      "en:whole-wheat-flours"
    ],
    "note": ""
  },
  "0815421014204": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:flours",
      "en:cereal-flours",
      "en:wheat-flours",
      "en:whole-wheat-flours"
    ],
    "note": ""
  },
  "0039978004796": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978033758": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:specific-products",
      "en:cereals-and-their-products",
      "en:products-for-specific-diets",
      "en:breakfast-cereals",
      "en:products-without-gluten",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978013880": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978039521": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978039538": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978013873": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978013866": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0039978049520": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0850687104009": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:extra-virgin-olive-oils",
      "en:virgin-olive-oils"
    ],
    "note": ""
  },
  "0850687110505": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:virgin-olive-oils",
      "en:extra-virgin-olive-oils"
    ],
    "note": ""
  },
  "0850687110529": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:olive-tree-products",
      "en:vegetable-fats",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:virgin-olive-oils",
      "en:extra-virgin-olive-oils"
    ],
    "note": ""
  },
  "0850687100315": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:extra-virgin-olive-oils",
      "en:virgin-olive-oils"
    ],
    "note": ""
  },
  "0812556030093": {
    "family": "tea-coffee",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": "Coffee blend by product name."
  },
  "8690627023401": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:beverage-preparations",
      "en:coffees",
      "en:instant-beverages",
      "en:ground-coffees",
      "en:instant-coffees"
    ],
    "note": ""
  },
  "0615357119048": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas"
    ],
    "note": ""
  },
  "0801541500000": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0076950450363": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0801541500017": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0054358018262": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0032917002242": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0032917000156": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas"
    ],
    "note": ""
  },
  "0054358011263": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0076580003724": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": "Wafer confectionery by product name."
  },
  "0032917001979": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas"
    ],
    "note": ""
  },
  "0032917000170": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850010010168": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:filled-biscuits",
      "en:sandwich-biscuits"
    ],
    "note": ""
  },
  "0855987003625": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits"
    ],
    "note": ""
  },
  "0855987003373": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0756963160021": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:shortbread-cookies"
    ],
    "note": ""
  },
  "0756963160052": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0810757011330": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits",
      "en:chocolate-biscuits"
    ],
    "note": ""
  },
  "0891077002222": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes"
    ],
    "note": ""
  },
  "0891077002000": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0898527004164": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0088468849201": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0810043031127": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0044000004637": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0795239431106": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0076950450424": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:beverage-preparations",
      "en:teas",
      "en:green-teas",
      "en:tea-leaves",
      "en:tea-bags"
    ],
    "note": ""
  },
  "0076950415164": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:tea-leaves",
      "en:tea-bags"
    ],
    "note": ""
  },
  "0032917001900": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0032917001023": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:herbal-teas"
    ],
    "note": ""
  },
  "0032917000149": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas",
      "en:tea-bags"
    ],
    "note": ""
  },
  "0032917002563": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas"
    ],
    "note": ""
  },
  "0032917002310": {
    "family": "tea-coffee",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": "Hibiscus tea product."
  },
  "0076950450233": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverage-preparations",
      "en:tea-leaves",
      "en:tea-bags"
    ],
    "note": ""
  },
  "0076950203532": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas"
    ],
    "note": ""
  },
  "0076950204553": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:teas"
    ],
    "note": ""
  },
  "0076950450479": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:beverage-preparations",
      "en:teas",
      "en:tea-leaves",
      "en:tea-bags",
      "pl:herbata-miętowa"
    ],
    "note": ""
  },
  "0855987003953": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes"
    ],
    "note": ""
  },
  "0850010010281": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0085239948835": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:half-milk-and-half-cream"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0085239042618": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:tomato-sauces",
      "en:ketchup",
      "en:groceries"
    ],
    "note": ""
  },
  "0021130293308": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:snacks",
      "en:legumes",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:peanuts"
    ],
    "note": ""
  },
  "0787003001509": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:desserts",
      "en:dairy-desserts",
      "en:fermented-dairy-desserts",
      "en:yogurts"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0013764027053": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:sliced-breads",
      "en:multigrain-sliced-breads"
    ],
    "note": ""
  },
  "0013764027121": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:sliced-breads",
      "en:multigrain-sliced-breads"
    ],
    "note": ""
  },
  "0013764028081": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:sliced-breads"
    ],
    "note": ""
  },
  "0013764027220": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:sliced-breads"
    ],
    "note": ""
  },
  "0013764027039": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:Undefined"
    ],
    "note": ""
  },
  "0711381000090": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves"
    ],
    "note": ""
  },
  "0711381323564": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams"
    ],
    "note": ""
  },
  "0076840100149": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0076840100989": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0074570009008": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0722430900162": {
    "family": "beverage",
    "processForm": "fermented",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:fermented-foods",
      "en:fermented-drinks",
      "en:tea-based-beverages",
      "en:kombuchas"
    ],
    "note": ""
  },
  "0851107003032": {
    "family": "beverage",
    "processForm": "fermented",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:fermented-foods",
      "en:fermented-drinks",
      "en:tea-based-beverages",
      "en:kombuchas"
    ],
    "note": ""
  },
  "0851107003001": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:fermented-foods",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:fermented-drinks",
      "en:teas",
      "en:tea-based-beverages",
      "en:kombuchas"
    ],
    "note": ""
  },
  "0009800895007": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:fats",
      "en:spreads",
      "en:sweet-spreads",
      "en:vegetable-fats",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0088702259285": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "fr:pates-a-tartiner",
      "en:chocolate-spreads"
    ],
    "note": ""
  },
  "0737539190499": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:nut-butters"
    ],
    "note": ""
  },
  "0737539196019": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:oilseed-purees",
      "en:sunflower-seeds-and-their-products",
      "fr:pates-a-tartiner",
      "en:chocolate-spreads",
      "en:sunflower-seed-butters"
    ],
    "note": ""
  },
  "0737539190406": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:fats",
      "en:spreads",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0009800895250": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:fats",
      "en:spreads",
      "en:sweet-spreads",
      "en:vegetable-fats",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0074570017003": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0074570812097": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0074570651481": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0074570027002": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:ice-cream-tubs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0043647430014": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:fruits-based-foods",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams",
      "en:citrus-jams"
    ],
    "note": ""
  },
  "0043647190017": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams",
      "en:berry-jams",
      "en:marmalades",
      "en:raspberry-jams"
    ],
    "note": ""
  },
  "0043647120014": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams"
    ],
    "note": ""
  },
  "0043647390011": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:fruit-based-foods-and-beverages",
      "en:fruits-and-vegetables-based-foods",
      "en:spreads",
      "en:fruit-based-foods",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:fruit-preserves",
      "en:jams",
      "en:fruit-jams",
      "en:citrus-jams",
      "en:marmalades",
      "en:orange-jams"
    ],
    "note": ""
  },
  "0043647380012": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:citrus-jams",
      "en:marmalades",
      "en:extra-jams"
    ],
    "note": ""
  },
  "0043647160010": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams",
      "en:berry-jams",
      "en:strawberry-jams"
    ],
    "note": ""
  },
  "0619360090851": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves"
    ],
    "note": ""
  },
  "0049000055450": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-beverages",
      "en:carbonated-drinks",
      "en:fruit-based-beverages",
      "en:sodas",
      "en:fruit-sodas"
    ],
    "note": ""
  },
  "0049000055399": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:softdrink"
    ],
    "note": ""
  },
  "0049000050110": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:artificially-sweetened-beverages",
      "en:sodas",
      "en:diet-beverages",
      "en:colas",
      "en:diet-sodas",
      "en:diet-cola-soft-drink"
    ],
    "note": ""
  },
  "0049000061048": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:non-alcoholic-beverages",
      "en:artificially-sweetened-beverages",
      "en:carbonated-drinks",
      "en:soft-drinks",
      "en:diet-beverages",
      "en:sodas",
      "en:colas",
      "en:diet-sodas",
      "en:diet-cola-soft-drink",
      "en:Coca"
    ],
    "note": ""
  },
  "0049000061017": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:sodas",
      "en:colas",
      "en:sweetened-beverages"
    ],
    "note": ""
  },
  "0860001697810": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces",
      "en:sweet-chili-sauces",
      "en:Sichuan sauces"
    ],
    "note": ""
  },
  "0860001697803": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:shelf-stable-other-sauces",
      "en:other-sauces"
    ],
    "note": ""
  },
  "0860007570261": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments"
    ],
    "note": ""
  },
  "0078895700015": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hoisin-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0736211605382": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:nuoc-mam-sauce",
      "en:groceries"
    ],
    "note": ""
  },
  "0070650800077": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:nuoc-mam-sauce",
      "en:groceries"
    ],
    "note": ""
  },
  "0011152094564": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:oyster-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0043647737014": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0043647340016": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams",
      "en:ginger-preserves"
    ],
    "note": ""
  },
  "0011368002223": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams"
    ],
    "note": ""
  },
  "0011368002261": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [],
    "note": "Fruit spread/preserve."
  },
  "0043647688019": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:citrus-jams",
      "en:marmalades",
      "en:orange-jams"
    ],
    "note": ""
  },
  "0022000159335": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:confectioneries",
      "en:candies",
      "en:hard-candies"
    ],
    "note": ""
  },
  "0049000050103": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:sodas",
      "en:colas"
    ],
    "note": ""
  },
  "0049000050141": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:sodas"
    ],
    "note": ""
  },
  "0711575007911": {
    "family": "snack-sweet",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:puffed-grains",
      "en:puffed-legumes",
      "en:puffed-soybeans"
    ],
    "note": "Dry-roasted edamame snack."
  },
  "0095684300089": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:milks"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0813724024661": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:bread-coverings",
      "en:cooking-helpers",
      "en:food-decorations",
      "en:pastry-helpers",
      "en:sprinkles",
      "en:chocolate-sprinkles",
      "en:baking-decorations"
    ],
    "note": ""
  },
  "0755795375351": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices"
    ],
    "note": ""
  },
  "0850000398429": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:groceries"
    ],
    "note": ""
  },
  "0052100746029": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:salts"
    ],
    "note": ""
  },
  "0755795375696": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:mixtures-of-herbs-and-spices",
      "en:chicken-seasoning"
    ],
    "note": ""
  },
  "0071998001904": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:groceries"
    ],
    "note": ""
  },
  "0089836184597": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spices",
      "en:turmeric",
      "en:turmeric-powder"
    ],
    "note": ""
  },
  "0016291227330": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:herbs-and-spices",
      "en:aromatic-plants",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:herbs",
      "en:dried-aromatic-plants",
      "en:mint",
      "en:dried-mint"
    ],
    "note": ""
  },
  "0024600010986": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0070328005230": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:spice-mix",
      "en:Groceries"
    ],
    "note": ""
  },
  "0891551000478": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:cooking-helpers"
    ],
    "note": "Nutritional yeast flakes."
  },
  "0021718412787": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0851087000014": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0851087000021": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:fats",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0652642001008": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": "Hazelnut spread."
  },
  "0652642000506": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0652642000704": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0089678005012": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": "Tahini paste."
  },
  "0033844001254": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:groceries"
    ],
    "note": ""
  },
  "0039978033925": {
    "family": "bakery",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:cooking-helpers",
      "en:food-additives",
      "en:products-without-gluten",
      "en:baking-powder-or-raising-agent"
    ],
    "note": "Baking powder ingredient."
  },
  "0039978045010": {
    "family": "bakery",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:cooking-helpers",
      "en:food-additives",
      "en:yeast"
    ],
    "note": "Active dry yeast baking ingredient."
  },
  "0074305066054": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:food-additives",
      "en:nutritional-yeast"
    ],
    "note": ""
  },
  "0016291441217": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0787811013145": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries",
      "en:Tonkatsu sauce"
    ],
    "note": ""
  },
  "0038622906554": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:Chips"
    ],
    "note": "Totopos corn chips."
  },
  "0854837006151": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:meats-and-their-products",
      "en:beef-and-its-products",
      "en:meats",
      "en:prepared-meats",
      "en:beef",
      "en:sausages",
      "en:dried-meats",
      "en:prepared-beef-meats",
      "en:beef-jerkies",
      "en:Beef sticks"
    ],
    "note": ""
  },
  "0791928119065": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-fruit",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:citrus",
      "en:fresh-fruits",
      "en:lemons",
      "en:fresh-lemons"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0072240546792": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0099482418342": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:sauces",
      "en:tomatoes-and-their-products",
      "en:tomato-sauces",
      "en:tomatoes",
      "en:tomato-purees",
      "en:groceries"
    ],
    "note": ""
  },
  "0072248213238": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:double-concentrate-tomato-paste",
      "en:tomato-pastes"
    ],
    "note": ""
  },
  "0070796400049": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:peeled-tomatoes"
    ],
    "note": ""
  },
  "0073214009480": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0099482455736": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:tomato-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0810095661860": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0799210900025": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces"
    ],
    "note": ""
  },
  "0747479101745": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:alfredo-sauces"
    ],
    "note": ""
  },
  "0747479101844": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": "Alfredo arrabbiata pasta sauce."
  },
  "0024094002108": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pestos"
    ],
    "note": ""
  },
  "0850024735859": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0099482431105": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": "Angel hair pasta."
  },
  "0747479001069": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0099482401153": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0099482401160": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0725342290437": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0073214009404": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0085917230603": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0099482455705": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0099482508463": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces"
    ],
    "note": ""
  },
  "0753469010041": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0810095661877": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0850024735019": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces"
    ],
    "note": ""
  },
  "0850041276052": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0799210900018": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0850024735095": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0747479000017": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0747479000079": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0747479001151": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:meal-sauces",
      "en:tomato-sauces",
      "en:tomato-sauces-with-basil",
      "en:Groceries"
    ],
    "note": ""
  },
  "0099482538033": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850024735392": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850030458100": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "Dairy-free parmesan substitute; storage not specified."
  },
  "0099482400040": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0099482431747": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:linguine"
    ],
    "note": ""
  },
  "0747479001144": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0010978200517": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:rigatoni"
    ],
    "note": ""
  },
  "0024094070404": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0747479100069": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:penne",
      "en:penne-rigate"
    ],
    "note": ""
  },
  "0747479100137": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:rigatoni"
    ],
    "note": ""
  },
  "0874492006051": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0725342381715": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:tomatoes",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0099482414399": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:tomato-pastes"
    ],
    "note": ""
  },
  "0815421013023": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0846558000105": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0799210920016": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:tomato-pastes"
    ],
    "note": ""
  },
  "0725342285617": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0677294998209": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0192214213014": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:peeled-tomatoes"
    ],
    "note": ""
  },
  "0855615002334": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0855615002075": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0855615002068": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0099482455699": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0099482455729": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0810095661662": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0677294991125": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:meal-sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:tomato-sauces-with-basil",
      "en:groceries"
    ],
    "note": ""
  },
  "0677294991149": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0850024735040": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0850024735026": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces"
    ],
    "note": ""
  },
  "0850024735002": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces"
    ],
    "note": ""
  },
  "0850024735064": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850024735071": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0099482455682": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0099482508449": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0677294991460": {
    "family": "unclassified-review",
    "processForm": "unknown",
    "storageCondition": "unknown",
    "classificationConfidence": "needs-review",
    "merchandisingState": "pending-review",
    "displayGroup": "unclassified-review",
    "sourceCategoriesTags": [],
    "note": "Product name is incomplete; food family/storage cannot be confirmed."
  },
  "0850024735033": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850024735705": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0747479001557": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0747479101967": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0747479001182": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:alfredo-sauces"
    ],
    "note": ""
  },
  "0850024735606": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:alfredo-sauces"
    ],
    "note": ""
  },
  "0677294993006": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0099482440602": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:dried-products",
      "en:tomatoes-and-their-products",
      "en:dried-plant-based-foods",
      "en:dried-vegetables",
      "en:dried-tomatoes",
      "en:dried-tomato-in-oil"
    ],
    "note": ""
  },
  "0747479061094": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pizza-sauces",
      "en:topping-sauce-for-pizza"
    ],
    "note": ""
  },
  "0099482538026": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850024735620": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:alfredo-sauces"
    ],
    "note": ""
  },
  "0850024735835": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:cheese-sauces"
    ],
    "note": ""
  },
  "0850041276236": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0099482400033": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0747479000406": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0747479101714": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:vodka-pasta-sauces"
    ],
    "note": ""
  },
  "0747479000130": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:vodka-pasta-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0010978200661": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:penne"
    ],
    "note": ""
  },
  "0099482431785": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0010978200425": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas"
    ],
    "note": ""
  },
  "0747479100007": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0024094070091": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0024094070930": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0024094070343": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0024094070244": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:rigatoni"
    ],
    "note": ""
  },
  "0874492003814": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies"
    ],
    "note": ""
  },
  "0037014000610": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:milk-chocolates",
      "en:milk-chocolate-bar"
    ],
    "note": ""
  },
  "0817670010068": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates"
    ],
    "note": ""
  },
  "0037014242317": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:milk-chocolates"
    ],
    "note": ""
  },
  "0099482431129": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0099482431167": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:orecchiette"
    ],
    "note": ""
  },
  "0747479100052": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:whole-durum-wheat-pasta"
    ],
    "note": ""
  },
  "0747479100168": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:bucatini"
    ],
    "note": ""
  },
  "0024094070121": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0860009082823": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:cooking-oil"
    ],
    "note": ""
  },
  "0817670012185": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:snacks",
      "en:dairy-substitutes",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolates"
    ],
    "note": ""
  },
  "0874492003258": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0037014000627": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0850687110420": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:virgin-olive-oils",
      "en:extra-virgin-olive-oils"
    ],
    "note": ""
  },
  "0860009082885": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils"
    ],
    "note": ""
  },
  "0022506421752": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:virgin-olive-oils",
      "en:extra-virgin-olive-oils",
      "en:undefined"
    ],
    "note": ""
  },
  "0009800892266": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0010700808806": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:sweet-snacks",
      "en:nuts-and-their-products",
      "en:bars",
      "en:dietary-supplements",
      "en:bodybuilding-supplements",
      "en:nut-bars",
      "en:peanut-bars",
      "en:protein-bars",
      "en:candy-bars",
      "en:peanyt-caramel-bar"
    ],
    "note": ""
  },
  "0037466016450": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0037466017631": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolates",
      "en:dark-chocolates",
      "en:dark-chocolate-bar",
      "en:dark-chocolate-bar-with-more-than-70-cocoa",
      "en:extra-fine-dark-chocolates",
      "en:flavoured-chocolates",
      "en:flavoured-dark-chocolates"
    ],
    "note": ""
  },
  "0817670011683": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0874492000684": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates",
      "en:dark-chocolate-bar",
      "en:dark-chocolate-bar-with-fruits"
    ],
    "note": ""
  },
  "0874492000790": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies"
    ],
    "note": ""
  },
  "0716270040010": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:filled-chocolates"
    ],
    "note": ""
  },
  "0854505005271": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-vegetable",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:fresh-foods",
      "en:vegetables",
      "en:fresh-plant-based-foods",
      "en:fresh-vegetables",
      "en:sweet-peppers",
      "en:fresh-sweet-peppers"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0689259002968": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-vegetable",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:fresh-foods",
      "en:vegetables",
      "en:fresh-plant-based-foods",
      "en:fresh-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:fresh-tomatoes"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0771163011805": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:mushrooms-and-their-products",
      "en:mushrooms"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0037014242478": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolates",
      "en:dark-chocolates",
      "en:dark-chocolate-bar"
    ],
    "note": ""
  },
  "0037014242232": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0037014242287": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0037014000207": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:chocolates-with-almonds",
      "en:undefined"
    ],
    "note": ""
  },
  "0037014000498": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0812603018135": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:dark-chocolates",
      "en:dark-chocolate-bar"
    ],
    "note": ""
  },
  "0812603019187": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:bars",
      "en:candy-chocolate-bars"
    ],
    "note": ""
  },
  "0812603019781": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": "Toffee confectionery."
  },
  "0812603019767": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": "Chocolate confectionery."
  },
  "0715756100224": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:berries",
      "en:blackberries"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0860010587447": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:dried-fruits"
    ],
    "note": ""
  },
  "0021000045129": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0077885710614": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0021130338139": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0054800423507": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:jasmine-rice",
      "en:Microwaveable Foods"
    ],
    "note": ""
  },
  "0021130008506": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:fats",
      "en:cereals-and-their-products",
      "en:vegetable-fats",
      "en:vegetable-oils",
      "en:cereal-oils",
      "en:sesame-oils"
    ],
    "note": ""
  },
  "0747479001502": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0021130338122": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0052603056311": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:soups",
      "en:broths",
      "en:dehydrated-broths",
      "en:broth-stock",
      "en:Groceries"
    ],
    "note": ""
  },
  "0013562000043": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:instant-pasta",
      "en:instant-pasta-with-cheese",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0017400224264": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:meals",
      "en:rice-dishes"
    ],
    "note": ""
  },
  "0051000289483": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pestos"
    ],
    "note": ""
  },
  "0015300430594": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0052603041843": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:meals",
      "en:soups",
      "en:vegetable-soups"
    ],
    "note": ""
  },
  "0052603292108": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0052603283670": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005383": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005086": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:vegetable-soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005918": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:vegetable-soups",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272006694": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005932": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:reheatable-soups",
      "en:vegetable-soups",
      "en:canned-meals",
      "en:reheatable-vegetable-soups",
      "en:canned-soups",
      "en:lentil-soups"
    ],
    "note": ""
  },
  "0042272005833": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:vegetable-soups",
      "en:canned-soups",
      "en:reheatable-soups",
      "en:lentil-soups",
      "en:reheatable-vegetable-soups"
    ],
    "note": ""
  },
  "0042272005024": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:reheatable-soups",
      "en:vegetable-soups",
      "en:canned-meals",
      "en:reheatable-vegetable-soups",
      "en:canned-soups",
      "en:lentil-soups"
    ],
    "note": ""
  },
  "0052603283694": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:meals",
      "en:soups",
      "en:reheatable-soups",
      "en:vegetable-soups",
      "en:reheatable-vegetable-soups",
      "en:lentil-soups"
    ],
    "note": ""
  },
  "0052603283663": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups",
      "en:reheatable-soups"
    ],
    "note": ""
  },
  "0042272005475": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005031": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:pastas",
      "en:soups",
      "en:noodles",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005857": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005079": {
    "family": "soup-broth",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Soup family clear; pack/storage format unspecified."
  },
  "0042272006267": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005840": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005055": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005826": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:vegetable-soups",
      "en:canned-soups",
      "en:reheatable-soups",
      "en:reheatable-vegetable-soups",
      "en:lentil-soups"
    ],
    "note": ""
  },
  "0042272005352": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:vegetable-soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0042272005864": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0021130405206": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Enriched egg noodles."
  },
  "0021130505449": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0076808517989": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0036200004401": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0020662006196": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:tomato-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0021130491001": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:tomato-pastes"
    ],
    "note": ""
  },
  "0021130043743": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses",
      "en:italian-cheeses",
      "en:parmigiano-reggiano",
      "fr:parmesan-rape"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0024000133568": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Tomato puree, preserved."
  },
  "0027000380086": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:peeled-tomatoes"
    ],
    "note": ""
  },
  "0036200014011": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0036200018002": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0027000390238": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0024000343561": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130494620": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0027000390146": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:tomatoes",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0048564060023": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:corn-flatbreads"
    ],
    "note": ""
  },
  "0073731063002": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:Corn tortilla"
    ],
    "note": ""
  },
  "0747479000048": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:arrabbiata-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0021130176182": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0013000011358": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0652729711301": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0013562300846": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0041390020308": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0011152021409": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:null"
    ],
    "note": ""
  },
  "0737628003006": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:meal-sauces",
      "en:curry-pastes",
      "en:red-curry-pastes",
      "en:Groceries"
    ],
    "note": ""
  },
  "0048564060009": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:Undefined"
    ],
    "note": ""
  },
  "0073731200056": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:taco",
      "en:tortillas"
    ],
    "note": ""
  },
  "0073731062005": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:corn-flatbreads",
      "en:Mexican Dinner Mixes"
    ],
    "note": ""
  },
  "0073731065006": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:breads",
      "en:flatbreads",
      "en:corn-flatbreads"
    ],
    "note": ""
  },
  "0073731003282": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:corn-flatbreads",
      "en:Mexican Dinner Mixes"
    ],
    "note": ""
  },
  "0073731071519": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:white-breads",
      "en:mexican-dinner-mixes"
    ],
    "note": ""
  },
  "0073731071656": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:white-breads"
    ],
    "note": ""
  },
  "0027331000615": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Corn tortillas."
  },
  "0727888102175": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:corn-tortillas"
    ],
    "note": ""
  },
  "0041321241598": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0037600493307": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0079893125909": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:canned-legumes",
      "en:canned-lentils"
    ],
    "note": ""
  },
  "0037600202176": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0037600293389": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0072273384897": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:pinto-beans",
      "en:canned-chili"
    ],
    "note": ""
  },
  "0039400015048": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:canned-legumes",
      "en:canned-common-beans"
    ],
    "note": ""
  },
  "0021130341030": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:pinto-beans"
    ],
    "note": ""
  },
  "0039400018834": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:black-beans",
      "en:Undefined"
    ],
    "note": ""
  },
  "0039400018803": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:black-beans",
      "en:Undefined"
    ],
    "note": ""
  },
  "0039400018841": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:black-beans",
      "en:canned-black-beans",
      "en:canned-common-beans"
    ],
    "note": ""
  },
  "0039400017349": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:red-beans",
      "en:canned-common-beans",
      "en:undefined"
    ],
    "note": ""
  },
  "0039400017301": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0072273391642": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:canned-legumes",
      "en:canned-common-beans"
    ],
    "note": ""
  },
  "0021130341054": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:chickpeas",
      "en:canned-legumes",
      "en:canned-common-beans"
    ],
    "note": ""
  },
  "0039400017004": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:chickpeas",
      "en:canned-legumes",
      "en:canned-chickpeas",
      "en:canned-common-beans",
      "en:Undefined"
    ],
    "note": ""
  },
  "0039400017066": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:undefined"
    ],
    "note": ""
  },
  "0850014369187": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0856651007871": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "Packaged chili; exact preservation/storage not stated."
  },
  "0856651002753": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:curry"
    ],
    "note": ""
  },
  "0021130341221": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:white-beans",
      "en:canned-common-beans"
    ],
    "note": ""
  },
  "0021130341214": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0051000012517": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups",
      "en:reheatable-soups",
      "en:chicken-and-vegetables-soup",
      "en:meals-soups"
    ],
    "note": ""
  },
  "0052603054102": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:broths",
      "en:canned-meals",
      "en:vegetable-broths",
      "en:canned-soups",
      "en:groceries"
    ],
    "note": ""
  },
  "0611443340310": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0611443340266": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0052603054454": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:broths",
      "en:chicken-broth"
    ],
    "note": ""
  },
  "0052603054256": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:broths",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0611443340211": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:broths",
      "en:mixed-vegetables",
      "en:vegetable-broths",
      "en:mixtures-of-vegetables-for-broth"
    ],
    "note": ""
  },
  "0851702007008": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:broths",
      "en:canned-soups",
      "en:beef-broth"
    ],
    "note": ""
  },
  "0851702007022": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:broths",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0851702007688": {
    "family": "soup-broth",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0611443340013": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0041196466485": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:broths",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0855868006004": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0851702007787": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0851702007794": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:broths"
    ],
    "note": ""
  },
  "0851702007046": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:broths",
      "en:liquid-broths",
      "en:poultry-broth"
    ],
    "note": ""
  },
  "0021130405060": {
    "family": "soup-broth",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0076808514339": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "it:campanelle"
    ],
    "note": ""
  },
  "0076808507386": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:noodles"
    ],
    "note": ""
  },
  "0076808005851": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:penne"
    ],
    "note": ""
  },
  "0076808005844": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:dry-pastas",
      "en:durum-wheat-pasta",
      "en:spaghetti",
      "en:dry-durum-wheat-pasta",
      "en:durum-wheat-spaghetti",
      "en:Whole-wheat-spaghetti"
    ],
    "note": ""
  },
  "0076808517088": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808517095": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808000221": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:pasta-dishes",
      "en:pastas",
      "en:stuffed-pastas",
      "en:tortellini"
    ],
    "note": ""
  },
  "0076808280982": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas"
    ],
    "note": ""
  },
  "0076808280098": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:spaghetti",
      "en:durum-wheat-spaghetti",
      "en:Enriched macaroni"
    ],
    "note": ""
  },
  "0076808280739": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:dry-pastas",
      "en:penne",
      "en:penne-rigate"
    ],
    "note": ""
  },
  "0076808501063": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808514377": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808280081": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0076808516135": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas"
    ],
    "note": ""
  },
  "0076808515046": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0021130506415": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:linguine"
    ],
    "note": ""
  },
  "0021130506323": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0021130506286": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808280746": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808518290": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:dry-pastas",
      "en:durum-wheat-pasta",
      "en:dry-durum-wheat-pasta",
      "en:flavored-and-colored-dry-pastas",
      "en:fusilli",
      "es:fusilli-de-trigo-duro"
    ],
    "note": ""
  },
  "0021130505548": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0076808502947": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:rigatoni"
    ],
    "note": ""
  },
  "0021130507290": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:whole-durum-wheat-pasta"
    ],
    "note": ""
  },
  "0021130507283": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808006537": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:dry-pastas",
      "en:durum-wheat-pasta",
      "en:whole-or-semi-whole-durum-wheat-pasta",
      "en:fusilli",
      "en:whole-durum-wheat-pasta",
      "en:whole-durum-wheat-spirals",
      "es:fusilli-de-trigo-duro"
    ],
    "note": ""
  },
  "0076808515589": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:dry-pastas",
      "en:egg-pastas",
      "en:dry-egg-pastas",
      "en:italian-pasta",
      "en:lasagna-sheets",
      "en:durum-wheat-plates-for-lasagna"
    ],
    "note": ""
  },
  "0076808007930": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:specific-products",
      "en:pastas",
      "en:products-for-specific-diets",
      "en:products-without-gluten",
      "en:gluten-free-pasta"
    ],
    "note": ""
  },
  "0076808513981": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0021130405183": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130506842": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0021130506385": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0021130507092": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas"
    ],
    "note": ""
  },
  "0021130505043": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:durum-wheat-pasta",
      "en:durum-wheat-macaroni"
    ],
    "note": ""
  },
  "0079893406374": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808533576": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:spaghetti"
    ],
    "note": ""
  },
  "0079893163338": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0021130506071": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0895059000619": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:cereal-pastas",
      "en:dry-pastas",
      "en:durum-wheat-pasta",
      "en:lasagna-sheets",
      "en:durum-wheat-plates-for-lasagna"
    ],
    "note": ""
  },
  "0021130505944": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas"
    ],
    "note": ""
  },
  "0021130507238": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:corn-pasta"
    ],
    "note": ""
  },
  "0076808012699": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808003918": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:corn-pasta",
      "en:rice-pasta"
    ],
    "note": ""
  },
  "0024094070787": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "it:acini-di-pepe"
    ],
    "note": ""
  },
  "0857183005380": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0857183005007": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0857183005038": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:pastas",
      "en:products-without-gluten",
      "en:dry-pastas",
      "en:gluten-free-pasta",
      "en:gluten-free-dry-pasta",
      "en:chickpea-pasta",
      "en:Vegetable-pasta"
    ],
    "note": ""
  },
  "0079893505206": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0857183005014": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0076808008487": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:cereals-and-potatoes",
      "en:specific-products",
      "en:cereals-and-their-products",
      "en:products-for-specific-diets",
      "en:pastas",
      "en:products-without-gluten",
      "en:dry-pastas",
      "en:gluten-free-pasta",
      "en:gluten-free-dry-pasta",
      "en:chickpea-pasta",
      "en:Vegetable-pasta"
    ],
    "note": ""
  },
  "0076808008470": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:pastas",
      "en:products-without-gluten",
      "en:dry-pastas",
      "en:gluten-free-pasta",
      "en:gluten-free-dry-pasta",
      "en:lentil-pasta",
      "en:dry-lentil-pasta",
      "en:fusilli"
    ],
    "note": ""
  },
  "0076808012484": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas"
    ],
    "note": ""
  },
  "0024094070077": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0076808533606": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:dry-pastas"
    ],
    "note": ""
  },
  "0076808533583": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0041129274637": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:unknown"
    ],
    "note": ""
  },
  "0747479001564": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": "Rao’s roasted garlic product; packaged condiment."
  },
  "0036200002179": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "es:Mercado/Despensa/Salsas",
      "es:especias y condimentos &gt; Mercado/Despensa &gt; Mercado"
    ],
    "note": ""
  },
  "0036200013694": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:alfredo-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0747479001052": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:meal-sauces",
      "en:tomato-sauces",
      "en:tomato-sauces-with-basil",
      "en:Groceries"
    ],
    "note": ""
  },
  "0051000197597": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:alfredo-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0747479000604": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0051000289469": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0747479000123": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0041129077634": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0036200219294": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:alfredo-sauces"
    ],
    "note": ""
  },
  "0036200219195": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:alfredo-sauces"
    ],
    "note": ""
  },
  "0733636772040": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0747479001175": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:alfredo-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0079893124599": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0747479000611": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:meals",
      "en:pizzas-pies-and-quiches",
      "en:meals-with-meat",
      "en:sauces",
      "en:pizzas",
      "en:pork-meals",
      "en:pizza-sauces",
      "en:pizza-with-ham-and-cheese"
    ],
    "note": ""
  },
  "0076808007879": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pestos",
      "en:green-pestos",
      "en:Groceries"
    ],
    "note": ""
  },
  "0076808008906": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pestos",
      "en:groceries"
    ],
    "note": ""
  },
  "0073214009657": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:tomato-sauces",
      "en:pizza-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0051000015884": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0051000269775": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:Italian sauce",
      "en:Spaghetti sauce"
    ],
    "note": ""
  },
  "0027000500118": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:meals",
      "en:vegetables-based-foods",
      "en:pasta-dishes",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0051000025494": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0051000025487": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0041129077900": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "es:Mercado/Despensa/Salsas",
      "es:especias y condimentos &gt; Mercado/Despensa &gt; Mercado"
    ],
    "note": ""
  },
  "0051000027993": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0041129077825": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:undefined"
    ],
    "note": ""
  },
  "0041129077054": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0041129631102": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0051000129116": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0051000027948": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces"
    ],
    "note": ""
  },
  "0021130493449": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0041129077009": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0036200219317": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "es:Despensa/Salsas",
      "es:condimentos y especias &gt; Despensa",
      "es:condimentos y especias/Salsas De Cocina Y Bases &gt; Despensa/Salsas"
    ],
    "note": ""
  },
  "0036200219348": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pasta-sauces",
      "en:vodka-pasta-sauces",
      "en:Undefined"
    ],
    "note": ""
  },
  "0706010112923": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0073214009503": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0036200219331": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "es:Mercado/Despensa/Salsas",
      "es:especias y condimentos &gt; Mercado/Despensa &gt; Mercado"
    ],
    "note": ""
  },
  "0036200430682": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0706010112961": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:products-without-gluten",
      "en:sauces",
      "en:meal-sauces",
      "en:pasta-sauces",
      "en:tomato-sauces",
      "en:tomato-sauces-with-basil"
    ],
    "note": ""
  },
  "0706010112978": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:products-without-gluten",
      "en:sauces",
      "en:pasta-sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0840370900674": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0840370900810": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses",
      "en:grated-cheese"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0024000346166": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:pizza-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0021130338283": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0021130320554": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0021130492060": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:tomatoes",
      "en:sauces",
      "en:tomato-sauces"
    ],
    "note": ""
  },
  "0024000343363": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:undefined"
    ],
    "note": ""
  },
  "0027000390054": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0021130492022": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces",
      "en:tomato-sauces",
      "en:undefined"
    ],
    "note": ""
  },
  "0024000041061": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Tomato paste."
  },
  "0024000256106": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0040784985506": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:Undefined"
    ],
    "note": ""
  },
  "0024000257943": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [],
    "note": "Fire-roasted tomatoes, packaged preserve."
  },
  "0027000379097": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:tomato-pulps"
    ],
    "note": ""
  },
  "0070796400087": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0021130494637": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0021130335381": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Crushed tomatoes, packaged preserve."
  },
  "0024000348566": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:tomatoes",
      "en:undefined"
    ],
    "note": ""
  },
  "0070796300035": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0027000378953": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0021130320561": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Italian-style diced tomatoes, packaged preserve."
  },
  "0024000256083": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:peeled-tomatoes"
    ],
    "note": ""
  },
  "0064144282661": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0021000083664": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0021000654925": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0850031990203": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000656554": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0021000658862": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:Mac and cheese"
    ],
    "note": ""
  },
  "0021000658930": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:pasta-dishes",
      "en:pastas"
    ],
    "note": ""
  },
  "0021000653201": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021130505968": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000083985": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000080632": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0079893124131": {
    "family": "pasta-noodle",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes"
    ],
    "note": "Vegan mac and cheese prepared mix."
  },
  "0850031990159": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0850031990098": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0850031990074": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000060689": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0021000060672": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0015300201231": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000077137": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000084555": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000658947": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:macaroni",
      "en:macaroni-cheese"
    ],
    "note": ""
  },
  "0021000083961": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0021000078431": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000658978": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:dry-pastas",
      "en:fusilli"
    ],
    "note": ""
  },
  "0021000653713": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0021000653218": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:dry-pastas",
      "en:conchiglie"
    ],
    "note": ""
  },
  "0652729710588": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:cooking-helpers",
      "en:shelf-stable-cooking-helpers"
    ],
    "note": ""
  },
  "0021000084838": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0652729710816": {
    "family": "pasta-noodle",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:meats-and-their-products",
      "en:meat-preparations",
      "en:pasta-dishes",
      "en:ground-meat-preparations"
    ],
    "note": "Hamburger Helper dry pasta mix; not raw meat."
  },
  "0015300014985": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:instant-pasta",
      "en:instant-pasta-with-cheese"
    ],
    "note": ""
  },
  "0015300200234": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:dry-pastas",
      "en:instant-pasta",
      "en:flavored-and-colored-dry-pastas"
    ],
    "note": ""
  },
  "0015300440517": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:pasta-dishes",
      "en:pastas"
    ],
    "note": ""
  },
  "8051764989621": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:instant-pasta"
    ],
    "note": ""
  },
  "0652729711257": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas"
    ],
    "note": ""
  },
  "0015300440821": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas"
    ],
    "note": ""
  },
  "0015300440357": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:pasta-dishes",
      "en:pastas"
    ],
    "note": ""
  },
  "0021000015887": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes"
    ],
    "note": ""
  },
  "0041000009655": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:instant-pasta"
    ],
    "note": ""
  },
  "0041000022975": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0041000022463": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0041000022432": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:Undefined"
    ],
    "note": ""
  },
  "0041000022906": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0041000022869": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:undefined"
    ],
    "note": ""
  },
  "0041000022517": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0054800425761": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0054800423323": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:cereals-and-their-products",
      "en:vegetables",
      "en:cereal-grains",
      "en:rices",
      "en:vegetables-from-spain"
    ],
    "note": ""
  },
  "0054800423446": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rice-dishes",
      "en:rices"
    ],
    "note": ""
  },
  "0054800424559": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:seeds",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:basmati-rices"
    ],
    "note": ""
  },
  "0054800424849": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices"
    ],
    "note": ""
  },
  "0054800423309": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:meals-with-meat",
      "en:rice-dishes",
      "en:rices",
      "en:poultry-meals",
      "en:meals-with-chicken"
    ],
    "note": ""
  },
  "0011152034706": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:undefined"
    ],
    "note": ""
  },
  "0054800423316": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:cereals-and-their-products",
      "en:meals",
      "en:vegetables",
      "en:cereal-grains",
      "en:rice-dishes",
      "en:rices",
      "en:vegetables-from-spain"
    ],
    "note": ""
  },
  "0011152144092": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:japonica-rices",
      "en:medium-grain-rices",
      "en:calrose-rices"
    ],
    "note": ""
  },
  "0021130502097": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices"
    ],
    "note": ""
  },
  "0085968001023": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:jasmine-rice"
    ],
    "note": ""
  },
  "0017400140014": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:cereals-and-their-products",
      "en:vegetables",
      "en:cereal-grains",
      "en:rices",
      "en:vegetables-from-spain"
    ],
    "note": ""
  },
  "0015300430235": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:meals",
      "en:rice-dishes"
    ],
    "note": ""
  },
  "0054800425778": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices"
    ],
    "note": ""
  },
  "0017400100773": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices"
    ],
    "note": ""
  },
  "0071429098497": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:cereals-and-potatoes",
      "en:legumes",
      "en:meals",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:fresh-foods",
      "en:fresh-plant-based-foods",
      "en:rice-dishes",
      "en:bean-dishes",
      "en:plant-based-meals",
      "en:mix-of-cereals-and-legumes"
    ],
    "note": ""
  },
  "0071429095236": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:meals",
      "en:rice-dishes"
    ],
    "note": ""
  },
  "0021130502035": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0017400100780": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:brown-rices"
    ],
    "note": ""
  },
  "0021130501014": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:red-beans"
    ],
    "note": ""
  },
  "0021130501168": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:black-beans"
    ],
    "note": ""
  },
  "0021130501274": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:legume-seeds",
      "en:vegetables",
      "en:pulses",
      "en:common-beans",
      "en:mixed-vegetables",
      "en:red-beans"
    ],
    "note": ""
  },
  "0021130501113": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130501359": {
    "family": "grain-legume",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:legumes-and-their-products",
      "en:vegetable-based-foods-and-beverages",
      "en:legumes",
      "en:seeds",
      "en:vegetables-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:lentils",
      "en:dried-lentils"
    ],
    "note": ""
  },
  "0021130501366": {
    "family": "grain-legume",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Green split peas."
  },
  "0021130170043": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:legume-seeds",
      "en:pulses",
      "en:lentils"
    ],
    "note": ""
  },
  "0021130501540": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:legumes",
      "en:seeds",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:white-beans",
      "en:dried-haricot-beans"
    ],
    "note": ""
  },
  "0021130501304": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0017400222529": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:jasmine-rice"
    ],
    "note": ""
  },
  "0073416040281": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices"
    ],
    "note": ""
  },
  "0073416870024": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:jasmine-rice"
    ],
    "note": ""
  },
  "0039978118608": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:wheats"
    ],
    "note": ""
  },
  "0079893125398": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:meals",
      "en:couscous"
    ],
    "note": ""
  },
  "0079893411699": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:brown-rices"
    ],
    "note": ""
  },
  "0073416004306": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:specific-products",
      "en:cereal-grains",
      "en:products-for-specific-diets",
      "en:products-without-gluten",
      "en:rices",
      "en:long-grain-rices",
      "en:brown-rices",
      "en:wild-rice",
      "en:black-rices",
      "en:mixed-rices",
      "en:red-rices",
      "en:sweet-brown-rices"
    ],
    "note": ""
  },
  "0073416401532": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:white-rices",
      "en:basmati-rices",
      "en:white-basmati-rices"
    ],
    "note": ""
  },
  "0073416402041": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:basmati-rices"
    ],
    "note": ""
  },
  "0807176705940": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:barbecue-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0070641066208": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0078895300017": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:oyster-sauces"
    ],
    "note": ""
  },
  "0044738072342": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces"
    ],
    "note": ""
  },
  "0078895142693": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:salad-dressings",
      "en:mayonnaises",
      "en:Groceries"
    ],
    "note": ""
  },
  "8853662056029": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces"
    ],
    "note": ""
  },
  "0011152814407": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces"
    ],
    "note": ""
  },
  "0024463061163": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces",
      "en:sriracha-sauces"
    ],
    "note": ""
  },
  "0024463061095": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces",
      "en:sriracha-sauces",
      "en:Low sugar condiments",
      "en:Vegan condiments"
    ],
    "note": ""
  },
  "0698639080038": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries",
      "en:Orange Sauce"
    ],
    "note": ""
  },
  "0079893122229": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0079893407920": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:soy-sauces"
    ],
    "note": ""
  },
  "6970399921450": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:waters",
      "en:carbonated-waters",
      "en:flavored-waters",
      "en:flavored-sparkling-waters"
    ],
    "note": ""
  },
  "6970399925618": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:waters",
      "en:carbonated-waters",
      "en:flavored-waters",
      "en:flavored-sparkling-waters"
    ],
    "note": ""
  },
  "6970399920576": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:waters",
      "en:carbonated-waters",
      "en:flavored-waters",
      "en:flavored-sparkling-waters"
    ],
    "note": ""
  },
  "6970399925786": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:carbonated-drinks",
      "en:waters",
      "en:carbonated-waters",
      "en:flavored-waters",
      "en:flavored-sparkling-waters",
      "en:sparkling"
    ],
    "note": ""
  },
  "0021130008452": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0041390001055": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:soy-sauces",
      "fr:sauces-au-soja-salees"
    ],
    "note": ""
  },
  "0041390001109": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:soy-sauces",
      "en:Undefined"
    ],
    "note": ""
  },
  "0031146262441": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:dried-products",
      "en:pastas",
      "en:dried-products-to-be-rehydrated",
      "en:soups",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "0076186000011": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:pastas",
      "en:dried-products-to-be-rehydrated",
      "en:soups",
      "en:noodles",
      "en:instant-noodles",
      "en:instant-noodle-soups"
    ],
    "note": ""
  },
  "8801073215863": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "8801073211216": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:noodles",
      "en:terrines"
    ],
    "note": ""
  },
  "8801073210776": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups",
      "en:ramen-soup"
    ],
    "note": ""
  },
  "0031146150601": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:soups",
      "en:dried-meals",
      "en:noodles",
      "en:instant-noodles",
      "en:instant-noodle-soups"
    ],
    "note": ""
  },
  "8801073141896": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "0031146022861": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:pastas",
      "en:dried-products-to-be-rehydrated",
      "en:soups",
      "en:noodles",
      "en:instant-noodles",
      "en:instant-noodle-soups"
    ],
    "note": ""
  },
  "0031146013531": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "0031146250301": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:meals",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:soups",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "0031146250103": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:meals",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:soups",
      "en:dried-meals",
      "en:noodles",
      "en:instant-noodles",
      "en:instant-noodle-soups"
    ],
    "note": ""
  },
  "8801073143777": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "8801073140578": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:noodles",
      "en:instant-noodles",
      "xx:lamian"
    ],
    "note": ""
  },
  "8801073142312": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:pastas",
      "en:noodles"
    ],
    "note": ""
  },
  "0031146262571": {
    "family": "soup-broth",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:pastas",
      "en:soups",
      "en:dried-meals",
      "en:noodles",
      "en:dehydrated-soups",
      "en:instant-noodles",
      "en:instant-noodle-soups",
      "en:dehydrated-asian-style-soup-with-noodles"
    ],
    "note": ""
  },
  "0089686170795": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:dried-products",
      "en:pastas",
      "en:dried-products-to-be-rehydrated",
      "en:noodles",
      "en:instant-noodles"
    ],
    "note": ""
  },
  "0076186005115": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0031146058105": {
    "family": "pasta-noodle",
    "processForm": "instant-ready",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:instant-pasta",
      "en:instant-soba"
    ],
    "note": "Instant ramen."
  },
  "0011152031880": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0011152031941": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Dried bean-thread noodles."
  },
  "0737628025251": {
    "family": "pasta-noodle",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas",
      "en:noodles",
      "en:rice-vermicelli",
      "en:dried-rice-noodles"
    ],
    "note": ""
  },
  "0071146006140": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:crisps",
      "en:potato-crisps"
    ],
    "note": ""
  },
  "0073141152334": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:chocolate-biscuits",
      "en:stick-biscuits-covered-with-chocolate"
    ],
    "note": ""
  },
  "0011152455266": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:canned-vegetables",
      "en:undefined"
    ],
    "note": ""
  },
  "0011152453040": {
    "family": "canned-preserved",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Sliced bamboo shoots, preserved package."
  },
  "0021130008490": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130008483": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:Undefined"
    ],
    "note": ""
  },
  "0044738102353": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:meal-sauces",
      "en:curry-pastes",
      "en:green-curry-pastes",
      "en:Groceries"
    ],
    "note": ""
  },
  "0044738102346": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:meal-sauces",
      "en:curry-pastes",
      "en:red-curry-pastes",
      "en:Groceries"
    ],
    "note": ""
  },
  "0044738102384": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:meal-sauces",
      "en:curry-pastes",
      "en:groceries"
    ],
    "note": ""
  },
  "0074880030068": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:Groceries",
      "en:Japanese curry"
    ],
    "note": ""
  },
  "0851093004440": {
    "family": "seafood",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-seafood-preserved",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:seafood",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:meals",
      "en:vegetables-based-foods",
      "en:dried-products",
      "en:vegetables",
      "en:dried-plant-based-foods",
      "en:seaweeds-and-their-products",
      "en:dried-seaweeds",
      "en:mixed-vegetables",
      "en:nori-seaweeds",
      "en:sushi-and-maki",
      "en:dried-nori-seaweeds",
      "en:sushis",
      "en:dried-nori-seaweed-sheets"
    ],
    "note": ""
  },
  "0074880020021": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:wasabi-pastes"
    ],
    "note": ""
  },
  "0011152254999": {
    "family": "canned-preserved",
    "processForm": "pickled",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Sushi ginger gari, pickled."
  },
  "0011152276410": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0011152066004": {
    "family": "grain-legume",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "White sesame seeds."
  },
  "0079893159010": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0020662000958": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:groceries"
    ],
    "note": ""
  },
  "0020662000965": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Groceries"
    ],
    "note": ""
  },
  "0020662000538": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Groceries"
    ],
    "note": ""
  },
  "0028000517809": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:milks-liquid-and-powder",
      "en:milks"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0028000525538": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:dried-products",
      "en:dried-products-to-be-rehydrated",
      "en:dehydrated-beverages"
    ],
    "note": ""
  },
  "0041235000700": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0041235000779": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:groceries"
    ],
    "note": ""
  },
  "0072878275552": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:groceries",
      "en:salsa"
    ],
    "note": ""
  },
  "0072878275705": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Groceries"
    ],
    "note": ""
  },
  "0049733090162": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:salsa"
    ],
    "note": ""
  },
  "0049733090179": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips"
    ],
    "note": ""
  },
  "0072878368957": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips"
    ],
    "note": ""
  },
  "0072878368964": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips"
    ],
    "note": ""
  },
  "0072101343836": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips"
    ],
    "note": ""
  },
  "0072878275514": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Groceries"
    ],
    "note": ""
  },
  "0072878870382": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces"
    ],
    "note": ""
  },
  "0072878275231": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Groceries"
    ],
    "note": ""
  },
  "0041565141647": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:groceries"
    ],
    "note": ""
  },
  "0041565000586": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0041565000272": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Groceries"
    ],
    "note": ""
  },
  "0041565000197": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:hot-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0041565141166": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:groceries"
    ],
    "note": ""
  },
  "0028000517205": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:creams"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0021130494606": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130494279": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130494262": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0029243000103": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:pastas"
    ],
    "note": ""
  },
  "0075386040209": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:salted-snacks"
    ],
    "note": ""
  },
  "0727452000111": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spices",
      "en:chili-peppers",
      "fr:piments-verts",
      "en:groceries",
      "en:salted-snacks"
    ],
    "note": ""
  },
  "0028189121415": {
    "family": "canned-preserved",
    "processForm": "pickled",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Sliced jalapenos, preserved."
  },
  "0810091780435": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces"
    ],
    "note": ""
  },
  "0079426212076": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0079426231008": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses",
      "en:condiments",
      "en:cow-cheeses",
      "en:sauces",
      "en:cheeses-from-the-united-kingdom",
      "en:cheeses-from-england",
      "en:cheddar-cheese",
      "en:groceries"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0079426211109": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces"
    ],
    "note": ""
  },
  "0021130341634": {
    "family": "canned-preserved",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": "Diced green chiles, packaged preserve."
  },
  "0072878176248": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips"
    ],
    "note": ""
  },
  "0072878811002": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0076397030166": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:chili-peppers"
    ],
    "note": ""
  },
  "0075386048588": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:meals",
      "en:sauces",
      "en:pepper-sauces",
      "en:stews",
      "en:Salted-snacks"
    ],
    "note": ""
  },
  "0070132101500": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:fish-and-meat-and-eggs",
      "en:offals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0070132006034": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:canned-vegetables"
    ],
    "note": ""
  },
  "0041331124225": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:prepared-vegetables",
      "en:pulses",
      "en:chickpeas",
      "en:canned-legumes",
      "en:cooked-vegetables",
      "en:canned-chickpeas",
      "en:canned-common-beans",
      "en:cooked-chick-peas"
    ],
    "note": ""
  },
  "0041331124669": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:canned-legumes",
      "en:Undefined"
    ],
    "note": ""
  },
  "0041331123327": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:black-beans",
      "en:canned-common-beans"
    ],
    "note": ""
  },
  "0044300106376": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:beans"
    ],
    "note": ""
  },
  "0851769007737": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:sauces"
    ],
    "note": ""
  },
  "0039000010108": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:sweet-peppers",
      "en:canned-peppers"
    ],
    "note": ""
  },
  "0039000010214": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:canned-vegetables",
      "en:Undefined"
    ],
    "note": ""
  },
  "0810091780213": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:prepared-vegetables",
      "en:refried-beans"
    ],
    "note": ""
  },
  "0039000018937": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:hot-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0039000018944": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0041501621233": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:condiments",
      "en:sauces",
      "en:dessert-sauces",
      "en:light-custard-cream-with-vanilla"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0072101011339": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0072101011162": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0074880030051": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:curry-sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0737628001002": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:Groceries"
    ],
    "note": ""
  },
  "0011152096278": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0027000380116": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods"
    ],
    "note": "Whole peeled plum tomatoes."
  },
  "0064144282630": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0073214006069": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:dried-vegetables",
      "en:dried-tomatoes"
    ],
    "note": ""
  },
  "0021130111619": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:dried-vegetables",
      "en:tomatoes",
      "en:dried-tomatoes"
    ],
    "note": ""
  },
  "0021130338269": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0073214009459": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "0044300525429": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0044300107236": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:prepared-vegetables",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:refried-beans"
    ],
    "note": ""
  },
  "0021130341153": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0027000380499": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes",
      "en:diced-tomatoes"
    ],
    "note": ""
  },
  "0070796400094": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:tomato-pastes"
    ],
    "note": ""
  },
  "0027000388150": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:tomatoes",
      "en:tomato-pastes"
    ],
    "note": ""
  },
  "0854693000164": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": ""
  },
  "0854693000621": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products",
      "en:tomato-pulps"
    ],
    "note": ""
  },
  "0015300430785": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0052603289658": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0051000011770": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0051000279750": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0051000286574": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0051000011510": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0051000253019": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0042272005512": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0042272005581": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:prepared-vegetables",
      "en:refried-beans"
    ],
    "note": ""
  },
  "0042272005505": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:prepared-vegetables",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:refried-beans",
      "en:undefined"
    ],
    "note": ""
  },
  "0042272005895": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0044300000094": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:seeds",
      "en:canned-plant-based-foods",
      "en:legume-seeds",
      "en:meals",
      "en:prepared-vegetables",
      "en:pulses",
      "en:common-beans",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:pinto-beans",
      "en:refried-beans",
      "en:Beans"
    ],
    "note": ""
  },
  "0810091780299": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:prepared-vegetables",
      "en:refried-beans"
    ],
    "note": ""
  },
  "0810091780282": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:Beans"
    ],
    "note": ""
  },
  "0079893340104": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:canned-foods",
      "en:legumes",
      "en:canned-plant-based-foods",
      "en:meals",
      "en:prepared-vegetables",
      "en:canned-legumes",
      "en:canned-common-beans",
      "en:refried-beans"
    ],
    "note": ""
  },
  "0051000246370": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0051000012319": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0051000161505": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0051000015419": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:chicken-soups",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0051000016218": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0051000058874": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:meals",
      "en:soups",
      "en:vegetable-soups",
      "en:tomato-soups",
      "en:Prepared Soups"
    ],
    "note": ""
  },
  "0051000059772": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups",
      "en:Cream of Chicken"
    ],
    "note": ""
  },
  "0051000060075": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:meals",
      "en:mushrooms-and-their-products",
      "en:soups",
      "en:canned-meals",
      "en:vegetable-soups",
      "en:canned-soups",
      "en:cream-soups",
      "en:cream-of-mushroom-soups"
    ],
    "note": ""
  },
  "0051000021076": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups",
      "en:bouillon-de-poulet"
    ],
    "note": ""
  },
  "0051000123268": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "0051000115539": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals"
    ],
    "note": ""
  },
  "0051000115515": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:meals",
      "en:mushrooms-and-their-products",
      "en:soups",
      "en:cream-soups",
      "en:canned-meals",
      "en:cream-of-mushroom-soups"
    ],
    "note": ""
  },
  "0051000166814": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetables-based-foods",
      "en:meals",
      "en:mushrooms-and-their-products",
      "en:soups",
      "en:cream-soups",
      "en:cream-of-mushroom-soups"
    ],
    "note": ""
  },
  "0051000291141": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:meals",
      "en:soups"
    ],
    "note": ""
  },
  "0073731060025": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads",
      "en:Mexican Dinner Mixes"
    ],
    "note": ""
  },
  "0021130338221": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:tomatoes-and-their-products",
      "en:vegetables",
      "en:canned-tomato-products",
      "en:canned-vegetables",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0021130338351": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:vegetables",
      "en:canned-vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes",
      "en:canned-tomatoes"
    ],
    "note": ""
  },
  "0850031990524": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese"
    ],
    "note": ""
  },
  "0052100827957": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:aromatic-plants",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:herbs",
      "en:dried-aromatic-plants",
      "en:ground-dried-aromatic-plants",
      "en:mixed-herbs",
      "en:herbes-de-provence",
      "en:thyme",
      "en:dried-thyme",
      "en:groceries"
    ],
    "note": ""
  },
  "0052100443393": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spices",
      "en:paprika"
    ],
    "note": ""
  },
  "0052100005867": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices"
    ],
    "note": ""
  },
  "0052100005836": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [],
    "note": "Dried herb mixture."
  },
  "0052100004938": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:cumin",
      "en:ground-cumin-seeds"
    ],
    "note": ""
  },
  "0052100035505": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:culinary-plants",
      "en:dried-products",
      "en:spices",
      "en:dried-plant-based-foods",
      "en:garlic-and-their-products",
      "en:coriander-products",
      "en:fenugreek-products",
      "en:garlic",
      "en:ground-dried-vegetables",
      "en:spice-mix",
      "en:cumin",
      "en:curry-powder",
      "en:fenugreek-seeds",
      "en:garlic-powder",
      "en:turmeric",
      "en:turmeric-powder",
      "en:groceries",
      "en:ground-cumin-seeds",
      "en:red-pepper"
    ],
    "note": ""
  },
  "0052100827933": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:aromatic-plants",
      "en:herbs",
      "en:rosemary",
      "en:groceries"
    ],
    "note": ""
  },
  "0079893411033": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:aromatic-plants",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:herbs",
      "en:dried-aromatic-plants",
      "en:rosemary",
      "en:dried-rosemary"
    ],
    "note": ""
  },
  "0079893411118": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:aromatic-plants",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:herbs",
      "en:dried-aromatic-plants",
      "en:thyme",
      "en:dried-thyme"
    ],
    "note": ""
  },
  "0079893126418": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices"
    ],
    "note": ""
  },
  "0079893411293": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:groceries"
    ],
    "note": ""
  },
  "0079893411019": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:aromatic-plants",
      "en:herbs",
      "en:dill"
    ],
    "note": ""
  },
  "0079893411071": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:herbs-and-spices",
      "en:aromatic-plants",
      "en:spices",
      "en:herbs",
      "en:basils",
      "en:Groceries"
    ],
    "note": ""
  },
  "0079893411194": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:chili-peppers",
      "en:capsicum-frutescens",
      "en:cayenne-peppers",
      "en:cayenne-powder"
    ],
    "note": ""
  },
  "0079893411361": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:ground-spice"
    ],
    "note": ""
  },
  "0079893411224": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:mixtures-of-herbs-and-spices"
    ],
    "note": ""
  },
  "0016291441149": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0016291441880": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:spice-mix"
    ],
    "note": ""
  },
  "0052100830155": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spices",
      "en:spice-mix"
    ],
    "note": ""
  },
  "0052100028729": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0016291441200": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0052100840079": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0052100840062": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices"
    ],
    "note": ""
  },
  "0052100827889": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:culinary-plants",
      "en:aromatic-plants",
      "en:herbs"
    ],
    "note": ""
  },
  "0027000852507": {
    "family": "canned-preserved",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:canned-foods",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:canned-plant-based-foods",
      "en:canned-vegetables",
      "en:sauces",
      "en:tomatoes-and-their-products",
      "en:tomato-sauces",
      "en:groceries"
    ],
    "note": ""
  },
  "8027498025454": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:rices-for-risotto",
      "en:Prepared mixes for risotto",
      "it:Preparati per risotto"
    ],
    "note": ""
  },
  "0819028110154": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:variety-packs",
      "en:ice-cream-bars",
      "en:ice-cream-bar-variety-packs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0766313192138": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:ginger"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0715756100255": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:berries",
      "en:blackberries"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0037842096823": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-vegetable",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:culinary-plants",
      "en:fresh-foods",
      "en:fresh-plant-based-foods",
      "en:fresh-vegetables",
      "en:onions-and-their-products",
      "en:onions",
      "en:shallots",
      "en:fresh-shallots"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0894697002184": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters"
    ],
    "note": ""
  },
  "0828904002186": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-fruit",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:fresh-fruits"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0818849020161": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-fruit",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruit-based-foods-and-beverages",
      "en:fruits-and-vegetables-based-foods",
      "en:fruit-based-foods",
      "en:fruits",
      "en:fresh-fruits",
      "en:kiwifruits",
      "en:fresh-kiwifruits"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0096619140466": {
    "family": "fruit",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:frozen-foods",
      "en:fruit-based-foods-and-beverages",
      "en:fruits-and-vegetables-based-foods",
      "en:fruit-based-foods",
      "en:fruits",
      "en:frozen-plant-based-foods",
      "en:berries",
      "en:frozen-fruits",
      "en:blueberries",
      "en:frozen-berries",
      "en:frozen-blueberries"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "7404003900108": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:tropical-fruits",
      "en:bananas"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "8809566871848": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-beverages",
      "en:fruit-based-beverages",
      "en:juices-and-nectars",
      "en:fruit-juices"
    ],
    "note": ""
  },
  "0096619533602": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:quinoa"
    ],
    "note": ""
  },
  "0877971005286": {
    "family": "packaged-other",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-savory",
    "sourceCategoriesTags": [
      "en:frozen-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:stuffed-pastas"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0850727004979": {
    "family": "seafood",
    "processForm": "marinated",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:seafood",
      "en:fishes-and-their-products",
      "en:fishes"
    ],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0041190075294": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:apples",
      "en:sweet-apples"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0850024267961": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:cooking-helpers",
      "en:dessert-mixes",
      "en:base-formulation-for-chocolate-mousse"
    ],
    "note": ""
  },
  "0850024267954": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:milk-chocolates",
      "en:milk-chocolate-bar"
    ],
    "note": ""
  },
  "0850024267978": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:bars",
      "en:candy-chocolate-bars"
    ],
    "note": ""
  },
  "0850024267930": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:milk-chocolates"
    ],
    "note": ""
  },
  "0898575003058": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:dark-chocolates",
      "en:chocolates-with-hazelnuts"
    ],
    "note": ""
  },
  "0898575001337": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0898575001696": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0099482526764": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates"
    ],
    "note": ""
  },
  "0850281006204": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:sauces",
      "en:hot-sauces"
    ],
    "note": ""
  },
  "0850281006488": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments"
    ],
    "note": ""
  },
  "0850281006808": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments"
    ],
    "note": ""
  },
  "0860007279423": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [],
    "note": "Vinaigrette dressing."
  },
  "0858010005580": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolates",
      "en:milk-chocolates"
    ],
    "note": ""
  },
  "0858010005689": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolates"
    ],
    "note": ""
  },
  "0858010005627": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:confectioneries",
      "en:chocolate-candies",
      "en:chocolates",
      "en:dark-chocolates"
    ],
    "note": ""
  },
  "0874492005405": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:dark-chocolates",
      "en:dark-chocolate-bar"
    ],
    "note": ""
  },
  "0099482444730": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices"
    ],
    "note": ""
  },
  "0099482444846": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:condiments",
      "en:vegetables-based-foods",
      "en:culinary-plants",
      "en:dried-products",
      "en:dried-plant-based-foods",
      "en:garlic-and-their-products",
      "en:ground-dried-vegetables",
      "en:garlic-powder"
    ],
    "note": ""
  },
  "0855352008057": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:non-alcoholic-beverages",
      "en:non-alcoholic-beers",
      "en:non-alcoholic-ipa"
    ],
    "note": ""
  },
  "0057836022782": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:vegetables",
      "en:tomatoes-and-their-products",
      "en:tomatoes"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0057836022614": {
    "family": "vegetable",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0041570059173": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:almonds",
      "en:undefined"
    ],
    "note": ""
  },
  "0099482474867": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:salty-snacks",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:salted-nuts",
      "en:cashew-nuts",
      "en:salted-cashews"
    ],
    "note": ""
  },
  "0072830005616": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses",
      "en:cow-cheeses",
      "en:cheeses-from-the-united-kingdom",
      "en:cheeses-from-england",
      "en:cheddar-cheese"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0850022543043": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "produce-fruit",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:berries",
      "en:fresh-fruits",
      "en:blueberries"
    ],
    "note": "OFF分类含fresh类标签；储温未提供。"
  },
  "0011110009258": {
    "family": "meat-poultry",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-savory",
    "sourceCategoriesTags": [
      "en:frozen-foods",
      "en:meats-and-their-products",
      "en:meats",
      "en:sandwiches",
      "en:frozen-meats",
      "en:hamburgers",
      "en:beef-hamburgers"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0085239058404": {
    "family": "spices-oils",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:vegetable-fats",
      "en:olive-tree-products",
      "en:vegetable-oils",
      "en:olive-oils",
      "en:extra-virgin-olive-oils",
      "en:virgin-olive-oils"
    ],
    "note": ""
  },
  "0085239084533": {
    "family": "sweetener",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sweetener",
    "sourceCategoriesTags": [
      "en:sweeteners",
      "en:sugars",
      "en:granulated-sugars"
    ],
    "note": "Granulated sugar."
  },
  "0034000052004": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:cocoa-and-its-products",
      "en:cocoa-and-chocolate-powders",
      "en:cocoa-powders"
    ],
    "note": ""
  },
  "0747599640155": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:cocoa-and-its-products",
      "en:chocolates",
      "en:baking-decorations",
      "en:dark-chocolate-chips"
    ],
    "note": ""
  },
  "0071012050505": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:flours",
      "en:cereal-flours",
      "en:wheat-flours",
      "en:common-wheat-flours",
      "en:whole-wheat-flours",
      "en:whole-common-wheat-flours"
    ],
    "note": ""
  },
  "0762111795755": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0085239041154": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fats",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:nut-butters",
      "en:almond-butters"
    ],
    "note": ""
  },
  "0051500243213": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:breakfasts",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "fr:pates-a-tartiner",
      "en:nut-butters"
    ],
    "note": ""
  },
  "0009800892204": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0014113910026": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:salty-snacks",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:pistachios",
      "en:roasted-pistachios",
      "en:salted-nuts",
      "en:salted-pistachios"
    ],
    "note": ""
  },
  "0070910000100": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:milks"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0085239047316": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:spreads",
      "en:condiments",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus",
      "en:Groceries"
    ],
    "note": ""
  },
  "0085239047439": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spreads",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus",
      "en:classic-hummus",
      "en:groceries"
    ],
    "note": ""
  },
  "0096619384884": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fats",
      "en:spreads",
      "en:spreadable-fats",
      "en:animal-fats",
      "en:dairy-spreads",
      "en:milkfat",
      "en:butters",
      "en:salted-butters",
      "en:sweet-cream-butters"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0675625371189": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats"
    ],
    "note": ""
  },
  "0096619000036": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:milks-liquid-and-powder",
      "en:milks",
      "en:whole-milks",
      "en:vitamin d3"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0295344206984": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [
      "en:salad"
    ],
    "note": ""
  },
  "0074471042388": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0021130140978": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0051500720028": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:plant-based-spreads",
      "en:nuts-and-their-products",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters",
      "en:crunchy-peanut-butters"
    ],
    "note": ""
  },
  "0051500720011": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:creamy-peanut-butters"
    ],
    "note": ""
  },
  "0037600105408": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:spreads",
      "en:cereals-and-potatoes",
      "en:plant-based-spreads",
      "en:nuts-and-their-products",
      "en:oilseed-purees",
      "en:nut-butters"
    ],
    "note": ""
  },
  "0037600106740": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:fats",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters"
    ],
    "note": ""
  },
  "0037600106184": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:fats",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0051500740163": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0051500241639": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0051500241776": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:creamy-peanut-butters"
    ],
    "note": ""
  },
  "0037600105682": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:fats",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:creamy-peanut-butters"
    ],
    "note": ""
  },
  "0037600106139": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:plant-based-spreads",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:oilseed-purees",
      "en:products-without-gluten",
      "en:legume-butters",
      "en:peanut-butters",
      "en:crunchy-peanut-butters"
    ],
    "note": ""
  },
  "0051500710166": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0051500700167": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:plant-based-spreads",
      "en:nuts-and-their-products",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters"
    ],
    "note": ""
  },
  "0051500255377": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:crunchy-peanut-butters"
    ],
    "note": ""
  },
  "0051500255162": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:breakfasts",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "fr:pates-a-tartiner",
      "en:nut-butters",
      "en:creamy-peanut-butters"
    ],
    "note": ""
  },
  "0037600105033": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:crunchy-peanut-butters"
    ],
    "note": ""
  },
  "0037600105064": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:fats",
      "en:plant-based-spreads",
      "en:nuts-and-their-products",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0037600110877": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:fats",
      "en:legumes",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:vegetable-fats",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:Crema de cacahuates",
      "en:Crema de untar"
    ],
    "note": ""
  },
  "0037600110723": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:peanut-butters",
      "en:nut-butters",
      "en:crunchy-peanut-butters"
    ],
    "note": ""
  },
  "0076840004294": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:ice-cream-tubs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0076840485116": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:ice-cream-tubs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0076840100354": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0076840100477": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0076840100583": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:ice-cream-tubs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0881334016413": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:beverage-preparations",
      "en:coffees",
      "en:ground-coffees"
    ],
    "note": ""
  },
  "0881334000467": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0782605161064": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0021130454907": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0079893124230": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods"
    ],
    "note": ""
  },
  "0762111206039": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0762111622914": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0041790004359": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0021130512621": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0043000205815": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0043000200544": {
    "family": "snack-sweet",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [],
    "note": "Gelatin dessert mix."
  },
  "0856069005018": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:cooking-helpers",
      "en:baking-mixes"
    ],
    "note": ""
  },
  "0705599013119": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:cakes",
      "en:cooking-helpers",
      "en:baking-mixes",
      "en:dessert-mixes",
      "en:muffins",
      "en:pastry-helpers",
      "en:cake-mixes"
    ],
    "note": ""
  },
  "0856069005001": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:cakes",
      "en:cooking-helpers",
      "en:baking-mixes",
      "en:dessert-mixes",
      "en:muffins",
      "en:pastry-helpers",
      "en:cake-mixes",
      "en:fruit-muffins",
      "en:banana-muffins",
      "en:Baking Mix"
    ],
    "note": ""
  },
  "0028400310468": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:potatoes-and-their-products",
      "en:crisps",
      "en:salty-snacks-made-from-potato",
      "en:potato-crisps"
    ],
    "note": ""
  },
  "0028400070980": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:Condimentos",
      "en:Salsas",
      "en:Salsas con queso",
      "en:Salsas de chiles",
      "en:Salsas para mojar"
    ],
    "note": ""
  },
  "0028400200684": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:potatoes-and-their-products",
      "en:crisps",
      "en:salty-snacks-made-from-potato",
      "en:potato-crisps",
      "en:flavoured-potato-crisps",
      "en:barbecue-crisps"
    ],
    "note": ""
  },
  "0028400201285": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:potatoes-and-their-products",
      "en:crisps",
      "en:salty-snacks-made-from-potato",
      "en:potato-crisps"
    ],
    "note": ""
  },
  "0028400201322": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:crisps",
      "en:potato-crisps"
    ],
    "note": ""
  },
  "0028400070942": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:american-style-sauces"
    ],
    "note": ""
  },
  "0048001013568": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:mayonnaises"
    ],
    "note": ""
  },
  "0851769007751": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:herbs-and-spices",
      "en:spices",
      "en:spice-mix",
      "en:groceries"
    ],
    "note": ""
  },
  "0044000042035": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:chocolate-biscuits",
      "en:drop-cookies",
      "en:chocolate-chip-cookies"
    ],
    "note": ""
  },
  "0810091781111": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments"
    ],
    "note": ""
  },
  "0009800895496": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "fr:pates-a-tartiner",
      "en:hazelnut-spreads",
      "en:chocolate-spreads",
      "en:cocoa-and-hazelnuts-spreads"
    ],
    "note": ""
  },
  "0051500001639": {
    "family": "canned-preserved",
    "processForm": "preserved",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-produce",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:breakfasts",
      "en:spreads",
      "en:fruits-based-foods",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams",
      "en:berry-jams",
      "en:strawberry-jams"
    ],
    "note": ""
  },
  "0180626000162": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0810063343040": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:beverage-preparations",
      "en:coffees",
      "en:ground-coffees"
    ],
    "note": ""
  },
  "0762111206138": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0762111206121": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0079893413679": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0079893159133": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:coffees",
      "en:ground-coffees"
    ],
    "note": ""
  },
  "0810291008964": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0810291008940": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0810291001002": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits"
    ],
    "note": ""
  },
  "0014100099970": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:chocolate-biscuits"
    ],
    "note": ""
  },
  "0039978113771": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:flours",
      "en:specific-products",
      "en:cereal-flours",
      "en:products-for-specific-diets",
      "en:products-without-gluten",
      "en:oat-flours"
    ],
    "note": ""
  },
  "0039978113221": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products"
    ],
    "note": ""
  },
  "0039978113139": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:flours"
    ],
    "note": ""
  },
  "0011110016508": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:legumes-and-their-products",
      "en:cereals-and-potatoes",
      "en:spreads",
      "en:nuts-and-their-products",
      "en:plant-based-spreads",
      "en:oilseed-purees",
      "en:legume-butters",
      "en:nut-butters",
      "en:peanut-butters"
    ],
    "note": ""
  },
  "0078742014692": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0683609999007": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0078742086729": {
    "family": "meat-poultry",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-savory",
    "sourceCategoriesTags": [
      "en:frozen-foods",
      "en:meats-and-their-products",
      "en:meats",
      "en:frozen-meats",
      "en:meatballs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0681131092906": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pizzas-pies-and-quiches",
      "en:pizzas"
    ],
    "note": ""
  },
  "0681131091282": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pizzas-pies-and-quiches",
      "en:pizzas"
    ],
    "note": ""
  },
  "0031142523850": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses",
      "en:italian-cheeses",
      "en:parmigiano-reggiano"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0078742223612": {
    "family": "meat-poultry",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:meals"
    ],
    "note": "Cooked fried chicken; storage conditions not stated."
  },
  "0096619141968": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:dried-products",
      "en:fruits",
      "en:dried-plant-based-foods",
      "en:cherries",
      "en:dried-fruits"
    ],
    "note": ""
  },
  "0681131175838": {
    "family": "non-food-review",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-non-food",
    "sourceCategoriesTags": [
      "en:oral-debriding-agent"
    ],
    "note": "Topical hydrogen peroxide; non-food personal-care/health item."
  },
  "0851770007566": {
    "family": "supplement",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-supplements",
    "sourceCategoriesTags": [
      "en:meat-alternatives",
      "en:dietary-supplements",
      "en:meat-analogues",
      "en:bodybuilding-supplements",
      "en:protein-powders"
    ],
    "note": ""
  },
  "0009300001021": {
    "family": "spices-oils",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-spices",
    "sourceCategoriesTags": [
      "en:null"
    ],
    "note": ""
  },
  "0037600804677": {
    "family": "meat-poultry",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:meats-and-their-products",
      "en:meats",
      "en:prepared-meats"
    ],
    "note": "Pepperoni is processed meat; storage requirements not provided."
  },
  "0031200343277": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0014800513240": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:vegetable-based-foods-and-beverages",
      "en:vegetables-based-foods",
      "en:tomatoes-and-their-products"
    ],
    "note": ""
  },
  "0031200200310": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:fruit-based-foods-and-beverages",
      "en:plant-based-beverages",
      "en:fruit-based-beverages",
      "en:artificially-sweetened-beverages"
    ],
    "note": ""
  },
  "0031200281272": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:undefined"
    ],
    "note": ""
  },
  "0052000042313": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:artificially-sweetened-beverages",
      "en:sweetened-beverages"
    ],
    "note": ""
  },
  "0028400032810": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:groceries"
    ],
    "note": ""
  },
  "0028400067409": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:condiments",
      "en:sauces",
      "en:dips",
      "en:cheese-dip",
      "en:groceries"
    ],
    "note": ""
  },
  "0028400314138": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:popcorn"
    ],
    "note": ""
  },
  "0602652259432": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals"
    ],
    "note": ""
  },
  "0810050716949": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:confectioneries",
      "en:candies",
      "en:gummi-candies"
    ],
    "note": ""
  },
  "0894700010267": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:desserts",
      "en:dairy-desserts",
      "en:fermented-dairy-desserts",
      "en:fermented-dairy-desserts-with-fruits",
      "en:yogurts",
      "en:fruit-yogurts",
      "en:greek-style-yogurts"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0078742148878": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0041780001597": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:crisps",
      "en:potato-crisps"
    ],
    "note": ""
  },
  "0041780271600": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:potatoes-and-their-products",
      "en:crisps",
      "en:salty-snacks-made-from-potato",
      "en:potato-crisps",
      "en:potatoes",
      "en:Russet potatoes"
    ],
    "note": ""
  },
  "0073420000110": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:spreads",
      "en:creams",
      "en:fermented-creams",
      "en:spreadable-fats",
      "en:sour-creams"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0073504611027": {
    "family": "meat-poultry",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-savory",
    "sourceCategoriesTags": [
      "en:frozen-foods",
      "en:meats-and-their-products",
      "en:meats",
      "en:sandwiches",
      "en:frozen-meats",
      "en:hamburgers",
      "en:beef-hamburgers"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0028400083140": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:crisps",
      "en:corn-chips"
    ],
    "note": ""
  },
  "0196212241048": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-beverages",
      "en:fruit-based-beverages",
      "en:juices-and-nectars",
      "en:fruit-juices",
      "en:nutritional"
    ],
    "note": ""
  },
  "0021908115412": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:biscuit-cookie-snack-w-nut-filling"
    ],
    "note": ""
  },
  "0602652260858": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars"
    ],
    "note": ""
  },
  "0602652419287": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars",
      "en:cereal-bars-with-nuts"
    ],
    "note": ""
  },
  "0818290019554": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:dairy-substitutes",
      "en:milk-substitutes",
      "en:plant-based-milk"
    ],
    "note": ""
  },
  "0687456213408": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars",
      "en:fruits-cereal-bars",
      "en:strawberry-cereal-bars"
    ],
    "note": ""
  },
  "0071464200800": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:vegetable-based-foods-and-beverages",
      "en:plant-based-beverages",
      "en:juices-and-nectars",
      "en:vegetable-based-beverages",
      "en:vegetable-juices",
      "en:carrot-juices"
    ],
    "note": ""
  },
  "0818290014801": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:desserts",
      "en:dairy-desserts",
      "en:fermented-dairy-desserts",
      "en:yogurts",
      "en:greek-style-yogurts"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0816401027528": {
    "family": "supplement",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-supplements",
    "sourceCategoriesTags": [
      "en:dietary-supplements",
      "en:protein-supplement"
    ],
    "note": ""
  },
  "0078742294766": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breads",
      "en:flatbreads"
    ],
    "note": ""
  },
  "0014113701037": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:salty-snacks",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:pistachios",
      "en:salted-nuts",
      "en:salted-pistachios",
      "en:but"
    ],
    "note": ""
  },
  "0846548029499": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:nuts-and-their-products",
      "en:nuts"
    ],
    "note": ""
  },
  "0194346218301": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:cakes"
    ],
    "note": ""
  },
  "0078742085432": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:cakes",
      "en:cheesecakes"
    ],
    "note": ""
  },
  "0052000208443": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages",
      "en:sweetened-beverages"
    ],
    "note": ""
  },
  "0021908130750": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:sweet-snacks",
      "en:nuts-and-their-products",
      "en:bars",
      "en:nut-bars",
      "en:cashew-nut-bars",
      "en:peanut-bars",
      "en:fruit-bar"
    ],
    "note": ""
  },
  "0064144102358": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks"
    ],
    "note": ""
  },
  "0602652670664": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars"
    ],
    "note": ""
  },
  "0602652419300": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars",
      "en:chocolate-cereal-bars"
    ],
    "note": ""
  },
  "0602652670633": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars"
    ],
    "note": ""
  },
  "0602652670596": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars",
      "en:fruits-cereal-bars"
    ],
    "note": ""
  },
  "0602652204005": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:snacks"
    ],
    "note": ""
  },
  "0602652419317": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:cereal-bars",
      "en:cereal-bars-with-nuts",
      "en:chocolate-cereal-bars",
      "en:fruits-cereal-bars",
      "en:banana-cereal-bars"
    ],
    "note": ""
  },
  "0818290017031": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:dairy-substitutes",
      "en:cereals-and-their-products",
      "en:milk-substitutes",
      "en:plant-based-beverages",
      "en:plant-based-milk-alternatives",
      "en:cereal-based-drinks",
      "en:oat-based-drinks"
    ],
    "note": ""
  },
  "0085239035573": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:raw-mixed-nuts"
    ],
    "note": ""
  },
  "0041780271495": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:cereals-and-potatoes",
      "en:salty-snacks",
      "en:appetizers",
      "en:chips-and-fries",
      "en:crisps",
      "en:potato-crisps"
    ],
    "note": ""
  },
  "0033844002244": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:specific-products",
      "en:products-for-specific-diets",
      "en:spices",
      "en:products-without-gluten",
      "en:chili-peppers",
      "fr:capsicum-frutescens",
      "en:cayenne-peppers",
      "en:cayenne-powder"
    ],
    "note": ""
  },
  "0028000214951": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:cocoa-and-its-products",
      "en:cocoa-and-chocolate-powders",
      "en:cocoa-powders"
    ],
    "note": ""
  },
  "0070470003238": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:desserts",
      "en:dairy-desserts",
      "en:fermented-dairy-desserts",
      "en:yogurts"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0888849000210": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:bars",
      "en:dietary-supplements",
      "en:bodybuilding-supplements",
      "en:protein-bars"
    ],
    "note": ""
  },
  "0014100087830": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:wafers",
      "en:chocolate-biscuits",
      "en:stuffed-wafers",
      "en:nut-stuffed-wafers",
      "en:chocolate-stuffed-wafers",
      "en:hazelnut-cream-stuffed-wafers"
    ],
    "note": ""
  },
  "0875754008301": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks",
      "en:biscuits-and-cakes",
      "en:biscuits-and-crackers",
      "en:biscuits",
      "en:wafers",
      "en:chocolate-biscuits",
      "en:stuffed-wafers",
      "en:chocolate-stuffed-wafers"
    ],
    "note": ""
  },
  "0075370007058": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0705599019630": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:cereals-and-their-products",
      "en:breakfast-cereals"
    ],
    "note": ""
  },
  "0613008719524": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:tea-based-beverages",
      "en:iced-teas"
    ],
    "note": ""
  },
  "0850009647771": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:sweet-snacks"
    ],
    "note": ""
  },
  "0850628002548": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:dietary-supplements",
      "en:bodybuilding-supplements",
      "en:protein-powders"
    ],
    "note": ""
  },
  "0851770007801": {
    "family": "supplement",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-supplements",
    "sourceCategoriesTags": [
      "en:dietary-supplements",
      "en:bodybuilding-supplements"
    ],
    "note": ""
  },
  "0875045182369": {
    "family": "meat-poultry",
    "processForm": "raw-candidate",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:meats-and-their-products",
      "en:beef-and-its-products",
      "en:meats",
      "en:beef"
    ],
    "note": "原料/冷熏/腌制商品的保鲜条件未提供，先不安排货架。"
  },
  "0646670524714": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:stuffed-pastas",
      "en:fresh-pasta"
    ],
    "note": ""
  },
  "0856069005957": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:salty-snacks",
      "en:appetizers",
      "en:biscuits-and-crackers",
      "en:crackers-appetizers"
    ],
    "note": ""
  },
  "0673803054220": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fermented-foods",
      "en:fermented-milk-products",
      "en:cheeses",
      "en:sliced-cheeses"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0681131395434": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spreads",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus"
    ],
    "note": ""
  },
  "0078742364759": {
    "family": "grain-legume",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:lentils-beans"
    ],
    "note": "Lentils."
  },
  "0681131395557": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spreads",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus"
    ],
    "note": ""
  },
  "0681131138475": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spreads",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus",
      "en:groceries"
    ],
    "note": ""
  },
  "0194346252138": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spreads",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus"
    ],
    "note": ""
  },
  "0767707002156": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:dairies",
      "en:fats",
      "en:spreads",
      "en:spreadable-fats",
      "en:animal-fats",
      "en:dairy-spreads",
      "en:milkfat",
      "en:butters",
      "en:unsalted-butters"
    ],
    "note": "乳制品家族明确，但来源未提供冷藏标识。"
  },
  "0075019012023": {
    "family": "sweetener",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sweetener",
    "sourceCategoriesTags": [
      "en:breakfasts",
      "en:spreads",
      "en:sweet-spreads",
      "en:bee-products",
      "en:farming-products",
      "en:sweeteners",
      "en:honeys"
    ],
    "note": "Raw clover honey."
  },
  "0041570072561": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:nuts-and-their-products",
      "en:nuts",
      "en:almonds",
      "en:Undefined"
    ],
    "note": ""
  },
  "0853311003600": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:fermented-foods",
      "en:hot-beverages",
      "en:plant-based-beverages",
      "en:fermented-drinks",
      "en:teas",
      "en:tea-based-beverages",
      "en:kombuchas"
    ],
    "note": ""
  },
  "0048500205716": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-beverages",
      "en:fruit-based-beverages",
      "en:juices-and-nectars",
      "en:fruit-juices",
      "en:orange-juices",
      "en:squeezed-fruit-juices",
      "en:squeezed-orange-juices"
    ],
    "note": ""
  },
  "4061459276343": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:cereal-grains",
      "en:rices",
      "en:aromatic-rices",
      "en:indica-rices",
      "en:long-grain-rices",
      "en:jasmine-rice",
      "en:Thai him Mali jasmine rice"
    ],
    "note": ""
  },
  "4099100004786": {
    "family": "soup-broth",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-canned-soup",
    "sourceCategoriesTags": [
      "en:canned-foods",
      "en:meals",
      "en:soups",
      "en:canned-meals",
      "en:canned-soups"
    ],
    "note": ""
  },
  "4099100004779": {
    "family": "soup-broth",
    "processForm": "prepared",
    "storageCondition": "unknown",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-ready-meals",
    "sourceCategoriesTags": [
      "en:broths"
    ],
    "note": ""
  },
  "4099100134360": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages",
      "en:waters",
      "en:spring-waters",
      "en:mineral-waters",
      "en:natural-mineral-waters"
    ],
    "note": ""
  },
  "4099100149432": {
    "family": "tea-coffee",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-tea-coffee",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-foods",
      "en:coffees"
    ],
    "note": ""
  },
  "0049000016796": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:beverages",
      "en:plant-based-beverages",
      "en:carbonated-drinks",
      "en:fruit-based-beverages",
      "en:sodas",
      "en:fruit-sodas"
    ],
    "note": ""
  },
  "0017082876317": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:snacks",
      "en:meats-and-their-products",
      "en:beef-and-its-products",
      "en:meats",
      "en:prepared-meats",
      "en:dried-meats",
      "en:prepared-beef-meats",
      "en:beef-jerkies"
    ],
    "note": ""
  },
  "0850068520039": {
    "family": "bakery",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-bakery",
    "sourceCategoriesTags": [
      "en:scottish-shortbread"
    ],
    "note": ""
  },
  "8847103557121": {
    "family": "packaged-other",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-other",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:dried-products",
      "en:fruits",
      "en:dried-plant-based-foods",
      "en:tropical-fruits",
      "en:dried-fruits",
      "en:pineapple",
      "en:dried-pineapple"
    ],
    "note": ""
  },
  "0034856890089": {
    "family": "snack-sweet",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-snacks",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:snacks",
      "en:breakfasts",
      "en:spreads",
      "en:sweet-snacks",
      "en:confectioneries",
      "en:plant-based-spreads",
      "en:sweet-spreads",
      "en:fruit-and-vegetable-preserves",
      "en:jams",
      "en:candies",
      "en:gummi-candies",
      "nl:varken-gelatine"
    ],
    "note": ""
  },
  "0021000023226": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:meals",
      "en:pasta-dishes",
      "en:pastas",
      "en:microwave-meals"
    ],
    "note": ""
  },
  "0074570950157": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:ice-cream-tubs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0039978033765": {
    "family": "grain-legume",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:breakfasts",
      "en:cereals-and-potatoes",
      "en:seeds",
      "en:cereals-and-their-products",
      "en:breakfast-cereals",
      "en:cereal-grains",
      "en:flakes",
      "en:cereal-flakes",
      "en:rolled-flakes",
      "en:rolled-oats",
      "en:oat"
    ],
    "note": ""
  },
  "0021000077175": {
    "family": "dairy",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dairy",
    "sourceCategoriesTags": [],
    "note": ""
  },
  "0810063710392": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:beverages-and-beverages-preparations",
      "en:beverages",
      "en:non-alcoholic-beverages",
      "en:carbonated-drinks",
      "en:soft-drinks",
      "en:sodas",
      "en:Probiotic Drink"
    ],
    "note": ""
  },
  "4099100197679": {
    "family": "pasta-noodle",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-pasta",
    "sourceCategoriesTags": [
      "en:meals",
      "en:pasta-dishes",
      "en:macaroni-and-cheese",
      "en:basil-garlic",
      "en:macaroni-and-cheese-pesto",
      "en:macaroni-cheese-pesto"
    ],
    "note": ""
  },
  "0074570037001": {
    "family": "snack-sweet",
    "processForm": "frozen",
    "storageCondition": "frozen-confirmed",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "freezer-dessert",
    "sourceCategoriesTags": [
      "en:desserts",
      "en:frozen-foods",
      "en:frozen-desserts",
      "en:ice-creams-and-sorbets",
      "en:ice-creams",
      "en:ice-cream-tubs",
      "en:coffee-ice-cream-tubs"
    ],
    "note": "OFF taxonomy明确标注冷冻。"
  },
  "0078742308890": {
    "family": "beverage",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-beverages",
    "sourceCategoriesTags": [
      "en:cooking-helpers"
    ],
    "note": ""
  },
  "0681131138499": {
    "family": "sauce-condiment",
    "processForm": "packaged",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-sauces",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:condiments",
      "en:spreads",
      "en:plant-based-spreads",
      "en:salted-spreads",
      "en:sauces",
      "en:dips",
      "en:hummus",
      "en:Groceries"
    ],
    "note": ""
  },
  "0697658201219": {
    "family": "grain-legume",
    "processForm": "dried",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "manual-name-review",
    "merchandisingState": "placed",
    "displayGroup": "ambient-dry-grain",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:seeds"
    ],
    "note": "Hemp hearts/shelled seeds."
  },
  "0091636000021": {
    "family": "fruit",
    "processForm": "fresh-whole",
    "storageCondition": "unknown",
    "classificationConfidence": "candidate",
    "merchandisingState": "pending-review",
    "displayGroup": "review-storage",
    "sourceCategoriesTags": [
      "en:plant-based-foods-and-beverages",
      "en:plant-based-foods",
      "en:fruits-and-vegetables-based-foods",
      "en:fruits-based-foods",
      "en:fruits",
      "en:citrus",
      "en:mandarins"
    ],
    "note": "人工阅读名称/规格后判断为整鲜候选；需人工确认。"
  },
  "0052391851518": {
    "family": "seafood",
    "processForm": "canned",
    "storageCondition": "ambient-likely",
    "classificationConfidence": "taxonomy-confirmed",
    "merchandisingState": "placed",
    "displayGroup": "ambient-seafood-preserved",
    "sourceCategoriesTags": [
      "en:seafood",
      "en:fishes-and-their-products",
      "en:canned-foods",
      "en:fishes",
      "en:fatty-fishes",
      "en:canned-fishes",
      "en:sardines",
      "en:canned-sardines",
      "en:sardines-in-tomato-sauce"
    ],
    "note": ""
  }
};

export const openPricesMerchandisingFamilies: Record<string, { label: string; kind: 'food' | 'non_food'; sectionId: string | null }> = {
  "meat-poultry": {
    "label": "肉禽",
    "kind": "food",
    "sectionId": "meat"
  },
  "seafood": {
    "label": "水产",
    "kind": "food",
    "sectionId": "seafood"
  },
  "dairy": {
    "label": "乳制品",
    "kind": "food",
    "sectionId": "dairy"
  },
  "grain-legume": {
    "label": "谷物与豆类",
    "kind": "food",
    "sectionId": "pantry"
  },
  "pasta-noodle": {
    "label": "意面与面食",
    "kind": "food",
    "sectionId": "pantry"
  },
  "canned-preserved": {
    "label": "罐藏与腌渍食品",
    "kind": "food",
    "sectionId": "pantry"
  },
  "soup-broth": {
    "label": "汤与高汤",
    "kind": "food",
    "sectionId": "pantry"
  },
  "sauce-condiment": {
    "label": "酱料与调味",
    "kind": "food",
    "sectionId": "pantry"
  },
  "spices-oils": {
    "label": "香料与油",
    "kind": "food",
    "sectionId": "pantry"
  },
  "tea-coffee": {
    "label": "茶与咖啡",
    "kind": "food",
    "sectionId": "pantry"
  },
  "beverage": {
    "label": "饮料",
    "kind": "food",
    "sectionId": "pantry"
  },
  "bakery": {
    "label": "烘焙与饼干",
    "kind": "food",
    "sectionId": "bakery"
  },
  "snack-sweet": {
    "label": "零食与甜点",
    "kind": "food",
    "sectionId": "pantry"
  },
  "supplement": {
    "label": "营养补充品",
    "kind": "food",
    "sectionId": "pantry"
  },
  "packaged-other": {
    "label": "其他包装食品",
    "kind": "food",
    "sectionId": "pantry"
  },
  "unclassified-review": {
    "label": "分类待确认",
    "kind": "food",
    "sectionId": null
  },
  "sweetener": {
    "label": "蜂蜜与甜味剂",
    "kind": "food",
    "sectionId": "pantry"
  },
  "non-food-review": {
    "label": "非食品个护",
    "kind": "non_food",
    "sectionId": "household"
  },
  "fruit": {
    "label": "水果",
    "kind": "food",
    "sectionId": "fruit"
  },
  "vegetable": {
    "label": "蔬菜",
    "kind": "food",
    "sectionId": "vegetables"
  }
};
