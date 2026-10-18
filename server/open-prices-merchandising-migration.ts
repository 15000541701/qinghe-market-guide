import type { Product } from '../shared/types';
import {
  openPricesMerchandisingByBarcode,
  openPricesMerchandisingFamilies,
  type OpenPricesMerchandisingDecision,
} from '../shared/open-prices-merchandising';

const knownProcessForms = new Set([
  'fresh-whole',
  'canned',
  'dried',
  'smoked',
  'marinated',
  'fermented',
  'frozen',
  'prepared',
  'pickled',
  'preserved',
  'instant-ready',
  'packaged',
  'unknown',
]);

export type ClassifiedOpenPricesProduct = Product & {
  sourceCategoriesTags?: string[];
  merchandisingNote?: string;
};

export function decisionForOpenPricesBarcode(
  barcode: string,
  sourceCategoriesTags: string[],
): OpenPricesMerchandisingDecision {
  return (
    openPricesMerchandisingByBarcode[barcode] || {
      family: 'unclassified-review',
      processForm: 'unknown',
      storageCondition: 'unknown',
      classificationConfidence: 'needs-review',
      merchandisingState: 'pending-review',
      displayGroup: 'unclassified-review',
      sourceCategoriesTags: [...sourceCategoriesTags],
      note: '没有逐条条码分类决策；确认商品资料和储存条件后再分类与安排货架。',
    }
  );
}

export function classifyOpenPricesProduct(
  product: Product,
  decision: OpenPricesMerchandisingDecision,
): ClassifiedOpenPricesProduct {
  const family = openPricesMerchandisingFamilies[decision.family]
    ? decision.family
    : 'unclassified-review';
  const processForm = knownProcessForms.has(decision.processForm)
    ? (decision.processForm as NonNullable<Product['processingForm']>)
    : 'unknown';

  return {
    ...product,
    category: family,
    merchandisingFamily: family,
    processingForm: processForm,
    storageCondition: decision.storageCondition,
    classificationConfidence: decision.classificationConfidence,
    merchandisingState:
      family === 'unclassified-review' && decision.merchandisingState === 'placed'
        ? 'pending-review'
        : decision.merchandisingState,
    displayGroup:
      family === 'unclassified-review' && decision.merchandisingState === 'placed'
        ? 'unclassified-review'
        : decision.displayGroup,
    sourceCategoriesTags: [...decision.sourceCategoriesTags],
    merchandisingNote: decision.note || undefined,
  };
}
