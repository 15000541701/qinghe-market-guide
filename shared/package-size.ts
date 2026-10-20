import type { Product } from './types';

export type PackageSize = NonNullable<Product['packageSize']>;
export type PackageSource = {
  name: string;
  specifications?: string[];
  price?: number;
  /** Retailer unit price for the selected quote, e.g. “$0.39/oz”. */
  unitPriceText?: string | null;
  finalCostByWeight?: boolean;
};

type Dimension = 'g' | 'ml';
type Measure = {
  amount: number;
  dimension: Dimension;
  key: string;
  text: string;
  index: number;
  end: number;
};
type Count = { count: number; text: string; index: number; end: number };
type UnitPrice = { price: number; dimension: Dimension | 'piece'; perUnit: number };
type Range = { low: number; high: number; value: number };

const gramsPer: Record<string, number> = { oz: 28.349523125, lb: 453.59237, kg: 1000, g: 1 };
const millilitersPer: Record<string, number> = {
  floz: 29.5735295625,
  gal: 3785.411784,
  qt: 946.352946,
  pt: 473.176473,
  l: 1000,
  ml: 1,
};
// Larger units that are written before a smaller remainder: “1 lb. 6 oz.”, “1 qt. 8 fl. oz.”.
const unitRank: Record<string, number> = { lb: 2, oz: 1, gal: 4, qt: 3, pt: 2, floz: 1 };

const number = String.raw`(\d{1,3}(?:,\d{3})+|\d+\/\d+|\d+(?:\.\d+)?|\.\d+)`;
const measurePattern = new RegExp(
  String.raw`(?<![\w.])${number}\s*-?\s*(fl\.?\s*oz|fluid\s+ounces?|oz|ounces?|lbs?|pounds?|kg|kilograms?|grams?|g|ml|milliliters?|liters?|litres?|l|gal(?:lons?)?|qt|quarts?|pt|pints?)\.?(?![a-z])`,
  'gi',
);
// “21-25 ct. per pound” describes size grading, not a pack count.
const countPattern = new RegExp(
  String.raw`(?<![\w.\-/])${number}\s*-?\s*(pk|packs?|ct|count|pcs?|pieces?|dozen|dz)\.?(?![a-z])(?!\s*(?:per|\/)\s*(?:pound|lb))`,
  'gi',
);

function parseNumber(text: string) {
  if (text.includes('/')) {
    const [top, bottom] = text.split('/').map(Number);
    return bottom ? top / bottom : NaN;
  }
  return Number(text.replace(/,/g, ''));
}

function unitKey(unit: string) {
  const value = unit.toLowerCase().replace(/[\s.]/g, '');
  if (value.startsWith('fl')) return 'floz';
  if (value === 'oz' || value.startsWith('ounce')) return 'oz';
  if (value.startsWith('lb') || value.startsWith('pound')) return 'lb';
  if (value === 'kg' || value.startsWith('kilogram')) return 'kg';
  if (value === 'g' || value.startsWith('gram')) return 'g';
  if (value === 'ml' || value.startsWith('milliliter')) return 'ml';
  if (value === 'l' || value.startsWith('liter') || value.startsWith('litre')) return 'l';
  if (value.startsWith('gal')) return 'gal';
  if (value === 'qt' || value.startsWith('quart')) return 'qt';
  return 'pt';
}

function measures(text: string): Measure[] {
  const merged: Measure[] = [];
  for (const match of text.matchAll(measurePattern)) {
    const key = unitKey(match[2]);
    const amount = parseNumber(match[1]);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const grams = gramsPer[key];
    const item: Measure = {
      amount: amount * (grams ?? millilitersPer[key]),
      dimension: grams ? 'g' : 'ml',
      key,
      text: match[0].trim(),
      index: match.index!,
      end: match.index! + match[0].length,
    };
    const previous = merged.at(-1);
    if (
      previous &&
      previous.dimension === item.dimension &&
      (unitRank[previous.key] || 0) > (unitRank[item.key] || 0) &&
      unitRank[item.key] &&
      /^[\s,]*(?:and\s+)?$/i.test(text.slice(previous.end, item.index))
    )
      merged[merged.length - 1] = {
        ...previous,
        amount: previous.amount + item.amount,
        key: item.key,
        text: `${previous.text} ${item.text}`,
        end: item.end,
      };
    else merged.push(item);
  }
  return merged;
}

function counts(text: string): Count[] {
  return [...text.matchAll(countPattern)].flatMap((match) => {
    const value = parseNumber(match[1]);
    if (!Number.isInteger(value) || value <= 0) return [];
    // A range such as “16-24 ct.” is not a pack count.
    if (/\d\s*-\s*$/.test(text.slice(Math.max(0, match.index! - 3), match.index!))) return [];
    return [
      {
        count: /^d/i.test(match[2]) ? value * 12 : value,
        text: match[0].trim(),
        index: match.index!,
        end: match.index! + match[0].length,
      },
    ];
  });
}

function unitPrice(text: string | null | undefined): UnitPrice | null {
  const match = text?.match(/\$?\s*(\d+(?:\.\d+)?)\s*\/\s*(foz|oz|lb|ea|dz|ct)\b/i);
  if (!match || !(Number(match[1]) > 0)) return null;
  const price = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === 'foz') return { price, dimension: 'ml', perUnit: millilitersPer.floz };
  if (unit === 'oz') return { price, dimension: 'g', perUnit: gramsPer.oz };
  if (unit === 'lb') return { price, dimension: 'g', perUnit: gramsPer.lb };
  return { price, dimension: 'piece', perUnit: unit === 'dz' ? 12 : 1 };
}

/**
 * Quantity range implied by price ÷ unit price. Unit prices are rounded to cents (a $0.01/foz
 * water price spans a wide range) and can come from another quote, so callers add a tolerance.
 */
function implied(price: number | undefined, quote: UnitPrice | null, tolerance = 0): Range | null {
  if (!quote || !price || price <= 0) return null;
  return {
    low: (price / (quote.price + 0.005)) * quote.perUnit * (1 - tolerance),
    high: (price / Math.max(quote.price - 0.005, 0.001)) * quote.perUnit * (1 + tolerance),
    value: (price / quote.price) * quote.perUnit,
  };
}

// Sam’s Club quotes sprays and syrups per fluid ounce even when the label states ounces, so
// weight and volume candidates are compared in ounces.
function ounces(amount: number, dimension: Dimension) {
  return amount / (dimension === 'g' ? gramsPer.oz : millilitersPer.floz);
}

function rounded(quantity: number, unit: PackageSize['unit']) {
  return unit === 'piece' ? quantity : Math.round(quantity);
}

function size(
  quantity: number,
  unit: PackageSize['unit'],
  basis: string,
  flags: Pick<PackageSize, 'estimated' | 'ambiguous'> = {},
): PackageSize {
  return { quantity: rounded(quantity, unit), unit, ...flags, basis };
}

const label = (value: { text: string }) => value.text.replace(/\s+/g, ' ');
const isEggs = (name: string) =>
  /\beggs\b/i.test(name) &&
  !/\begg whites?\b|\b(?:noodles?|substitute|bites?|salad|sandwich|patties)\b/i.test(name);

function specificationMeasure(lines: string[]) {
  for (const line of lines) {
    const match = line.match(
      /^\s*(?:total\s+)?net\s*(?:weight|wt\.?|volume|vol\.?|contents?|quantity)(?!\s*per\b)\s*:?\s*(.+)$/i,
    );
    const found = match && measures(match[1])[0];
    if (found) return { measure: found, line: line.trim() };
  }
  // A spec line that is only a measure (“4 lbs.”, “45 oz. package”) states the net contents.
  for (const line of lines) {
    const found = measures(line);
    if (
      found.length === 1 &&
      /^\s*$/.test(line.slice(0, found[0].index)) &&
      /^\s*(?:package|bag|box|pack|total)?\.?\s*$/i.test(line.slice(found[0].end))
    )
      return { measure: found[0], line: line.trim() };
  }
  return null;
}

/**
 * Net contents of one sold unit from source text. Explicit “Net weight/volume” lines win unless
 * the retailer unit price contradicts them and supports the listing name; multi-packs are
 * multiplied only when the listing says “each” or the unit price confirms it. Weighed goods are
 * estimated from the estimated price ÷ per-pound price.
 */
export function packageSizeFromSource(source: PackageSource): PackageSize {
  const name = source.name.replace(/\s+/g, ' ');
  const quote = unitPrice(source.unitPriceText);
  const quoteNote = source.unitPriceText ? `单价 ${source.unitPriceText}` : '';
  const nameCounts = counts(name);

  if (isEggs(name) && nameCounts[0])
    return size(nameCounts[0].count, 'piece', `名称：${label(nameCounts[0])}（按枚计）`);

  if (source.finalCostByWeight || /\bpriced per (?:pound|lb)\b/i.test(name)) {
    const estimate = quote?.dimension === 'g' ? implied(source.price, quote) : null;
    return estimate
      ? size(
          estimate.value,
          'g',
          `估重：页面估价 $${source.price!.toFixed(2)} ÷ ${source.unitPriceText}`,
          {
            estimated: true,
          },
        )
      : size(1, 'package', '称重商品，来源未给出每磅单价', { estimated: true });
  }

  // Candidates differ by the pack count, so a loose tolerance still separates them.
  const loose = quote && quote.dimension !== 'piece' ? implied(source.price, quote, 0.12) : null;
  const pieceRange = quote?.dimension === 'piece' ? implied(source.price, quote, 0.12) : null;
  const quoted = (amount: number, dimension: Dimension) => {
    if (!loose || !quote || quote.dimension === 'piece') return null;
    const value = ounces(amount, dimension);
    return (
      value >= ounces(loose.low, quote.dimension) && value <= ounces(loose.high, quote.dimension)
    );
  };

  const fromName = (): PackageSize | null => {
    const measure = measures(name)[0];
    const count = nameCounts.find((item) => !measure || item.index !== measure.index);
    if (measure && count) {
      const multiplied = measure.amount * count.count;
      const multipliedBasis = `名称：${label(measure)} × ${label(count)}`;
      const statedBasis = `名称：总量 ${label(measure)}（${label(count)}）`;
      if (loose) {
        if (quoted(multiplied, measure.dimension))
          return size(multiplied, measure.dimension, `${multipliedBasis}；${quoteNote} 印证`);
        if (quoted(measure.amount, measure.dimension))
          return size(measure.amount, measure.dimension, `${statedBasis}；${quoteNote} 印证`);
        return size(
          measure.amount,
          measure.dimension,
          `名称 ${label(measure)}、${label(count)} 与${quoteNote}不一致`,
          {
            ambiguous: true,
          },
        );
      }
      if (/^\W*each\b/i.test(name.slice(measure.end)))
        return size(multiplied, measure.dimension, multipliedBasis);
      if (count.index < measure.index || /\(\s*$/.test(name.slice(0, measure.index)))
        return size(measure.amount, measure.dimension, statedBasis);
      if (pieceRange && count.count >= pieceRange.low && count.count <= pieceRange.high)
        return size(multiplied, measure.dimension, `${multipliedBasis}；${quoteNote} 印证件数`);
      return size(multiplied, measure.dimension, `${multipliedBasis}（多包装，未能用单价印证）`, {
        ambiguous: true,
      });
    }
    if (measure) {
      if (quoted(measure.amount, measure.dimension) === false)
        return size(
          measure.amount,
          measure.dimension,
          `名称 ${label(measure)} 与${quoteNote}不一致`,
          {
            ambiguous: true,
          },
        );
      return size(measure.amount, measure.dimension, `名称：${label(measure)}`);
    }
    return null;
  };

  const specified = specificationMeasure(source.specifications || []);
  const named = fromName();
  if (specified) {
    const { measure, line } = specified;
    // Some source spec tables are stale (“Fuji Apples, 5 lbs.” with “Net weight: 4 lbs.”).
    if (
      quoted(measure.amount, measure.dimension) === false &&
      named &&
      !named.ambiguous &&
      named.unit !== 'piece' &&
      quoted(named.quantity, named.unit as Dimension)
    )
      return { ...named, basis: `${named.basis}；规格表“${line}”与${quoteNote}不符` };
    return size(measure.amount, measure.dimension, `规格表：${line}`);
  }
  if (named) return named;

  const exact = quote && quote.dimension !== 'piece' ? implied(source.price, quote) : null;
  // Only a precise unit price (narrow rounding range) may stand in for missing net contents.
  if (exact && quote && quote.dimension !== 'piece' && exact.high - exact.low <= exact.value * 0.08)
    return size(
      exact.value,
      quote.dimension,
      `按页面价格 $${source.price!.toFixed(2)} ÷ ${source.unitPriceText} 推算`,
      {
        estimated: true,
      },
    );
  const count = nameCounts[0];
  if (count) return size(count.count, 'piece', `名称：${label(count)}`);
  return size(1, 'package', '来源未写明净含量');
}

/** Whether a stored package size may be used for ingredient conversion. */
export function packageSizeReliable(value: PackageSize | undefined) {
  return (
    !!value &&
    Number.isFinite(value.quantity) &&
    value.quantity > 0 &&
    value.unit !== 'package' &&
    !value.ambiguous
  );
}
