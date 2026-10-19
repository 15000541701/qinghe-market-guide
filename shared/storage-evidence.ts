import type { Product } from './types';

export type StorageCondition = NonNullable<Product['storageCondition']>;
export type StorageSignal =
  | 'frozen'
  | 'chilled'
  | 'chilled-or-frozen'
  | 'ambient'
  | 'ambient-until-ripe'
  | 'ambient-or-chilled'
  | 'fresh-never-frozen'
  | 'cool-place';
export type StorageField = 'specifications' | 'highlights' | 'introduction' | 'description';
export type StorageFinding = { signal: StorageSignal; quote: string; field: StorageField };
export type StorageText = Partial<Record<StorageField, string | string[]>>;
export type StorageResolution = {
  condition: StorageCondition | null;
  /** Exact source sentence that decided the condition. */
  quote?: string;
  /** Source sentences that disagree; the record stays in review. */
  conflict?: string[];
};

const fields: StorageField[] = ['specifications', 'highlights', 'introduction', 'description'];

// Source pages contain consistent misspellings (“Refridgerated”, “Refrigated”, “Keeprefrigerated”).
function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/refridg/g, 'refrig')
    .replace(/refrigat/g, 'refrigerat')
    .replace(/keeprefrig/g, 'keep refrig')
    .replace(/requried/g, 'required')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentences(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .flatMap((text) => text.split(/(?<=[.!?;])\s+|\s*\n+\s*|\s+\|\s+|\s*•\s*/))
    .map((text) => text.trim())
    .filter(Boolean);
}

// After-opening, leftover, thawed and prepared-bottle instructions describe home use, not how
// the unopened product is sold. They may still prove ambient storage before opening.
const homeUse =
  /\b(?:after opening|once opened|once (?:the \w+ is )?open|after (?:being )?opened|opened or unopened|leftovers?|once thawed|after thawing|thawed|prepared formula|feed immediately|once (?:they're |they are )?ripe(?:ned)?|when ripe|to optimize freshness|to prolong|for (?:longer|long-term) storage)\b/;
// Serving tips and preferences (“you can keep them in your fridge”) are not storage requirements.
const optional =
  /\b(?:can|may|could) (?:also )?be (?:kept |stored )?(?:frozen|refrigerated)\b|\b(?:you )?can (?:also )?(?:keep|store)\b|\bbest (?:stored|kept)\b/;
const unopened = /\bbefore opening\b|\bunopened\b|\buntil opened\b/;
const ambientSignals = new Set<StorageSignal>([
  'ambient',
  'ambient-until-ripe',
  'ambient-or-chilled',
]);

const patterns: Array<[StorageSignal, RegExp]> = [
  [
    'ambient-until-ripe',
    /\b(?:store(?:d)?|keep|leave) (?:at )?(?:ambient|room temperature|on (?:the|your) counter)(?: temperature)? until (?:ripe|ripened)\b|\b(?:allow|leave)(?: \w+)? to ripen (?:at room temperature|on (?:the|your) counter)\b|\bstorage:? ambient then refrigerate\b/,
  ],
  [
    'ambient-or-chilled',
    /\b(?:store(?:d)?|kept) (?:at )?(?:ambient|room temperature|in (?:a )?cool,? (?:and )?dry place)(?: temperature)? or (?:refrigerat|kept refrigerated|in the refrigerator)/,
  ],
  [
    'chilled-or-frozen',
    /\b(?:keep|store|storage(?: instructions)?:?)(?: \w+)? refrigerated or frozen\b|\b(?:keep|store) frozen or refrigerated\b|\brefrigerate or freeze\b/,
  ],
  [
    'frozen',
    /\b(?:keep|store|stored|kept|must be kept|should be kept)(?: \w+)? (?:deep )?frozen\b|\bstorage(?: instructions)?:? (?:keep )?frozen\b|\b(?:delivered|shipped|sold) frozen\b|\bfrozen and ready[- ]to[- ]bake\b|\bstore in (?:the |a |your )?freezer\b/,
  ],
  [
    'chilled',
    /\b(?:keep|store|stored|kept|must be kept|should be kept)(?: (?:it|them|this(?: product)?|product|eggs|cheese))? (?:refrigerated|chilled)\b|\b(?:keep|store|stored|kept)(?: (?:it|them|this(?: product)?|product))? in (?:the |a |your )?(?:refrigerator|fridge)\b|\bstorage(?: instructions)?:? (?:keep )?(?:refrigerated|in (?:the )?refrigerator)\b|\bmust be refrigerated\b|(?<!not |n't )\brequires? refrigeration\b|^refrigerated\b|\bthis refrigerated \w+|\binsulated\b.*\bwith ice packs?\b/,
  ],
  [
    'ambient',
    /\bshelf[- ]stable(?!: no)\b|\bno refrigeration (?:is )?(?:required|needed|necessary)\b|\bnon[- ]refrigerated\b|\b(?:do|does|did) not require refrigeration\b|\bwithout (?:the need for )?refrigeration\b|\bstore(?:d)?(?: [a-z]+){0,6} at room temperature\b|\bstore ambient\b|\bstorage:? ambient\b|\b(?:store|keep|stored)(?: it| them)? in (?:a )?(?:cool,? (?:and )?)?(?:dry|dark),? (?:and )?(?:dry |dark )?(?:place|area|location)\b|\bstorage(?: instructions)?:? (?:store in a )?cool,? dry (?:place|area|location)\b|\brefrigerate after opening\b|\bdo not refrigerate\b/,
  ],
  ['fresh-never-frozen', /\b(?:always )?fresh,? (?:and )?never frozen\b|\bnever been frozen\b/],
  ['cool-place', /\b(?:store|keep)(?: \w+)? in (?:a )?cool (?:place|location)\b/],
];

export function storageFindings(text: StorageText): StorageFinding[] {
  const findings: StorageFinding[] = [];
  for (const field of fields) {
    for (const sentence of sentences(text[field])) {
      // Question headings (“Is this kept in the refrigerator?”) are not statements.
      if (sentence.endsWith('?')) continue;
      const normalized = normalize(sentence);
      const match = patterns.find(([, pattern]) => pattern.test(normalized));
      if (!match) continue;
      const [signal] = match;
      if (homeUse.test(normalized) && !ambientSignals.has(signal)) continue;
      if (optional.test(normalized) && (signal === 'frozen' || signal === 'chilled')) continue;
      findings.push({ signal, quote: sentence, field });
    }
  }
  return findings;
}

function resolveField(findings: StorageFinding[]): StorageResolution {
  const first = (signal: StorageSignal) => findings.find((finding) => finding.signal === signal);
  const coldBoth = first('chilled-or-frozen');
  const frozen = first('frozen');
  const chilled = first('chilled');
  const ambient = findings.find((finding) => ambientSignals.has(finding.signal));
  const cold = coldBoth || frozen || chilled;
  if (cold && ambient) return { condition: null, conflict: [cold.quote, ambient.quote] };
  if (coldBoth) return { condition: 'chilled-or-frozen-confirmed', quote: coldBoth.quote };
  if (frozen && chilled) return { condition: null, conflict: [frozen.quote, chilled.quote] };
  if (frozen) return { condition: 'frozen-confirmed', quote: frozen.quote };
  if (chilled) return { condition: 'chilled-confirmed', quote: chilled.quote };
  if (ambient) return { condition: 'ambient-likely', quote: ambient.quote };
  return { condition: null };
}

/**
 * Decide retail storage from explicit source statements. The specification table outranks
 * highlights, which outrank marketing copy (general tips there mention other products). Weak
 * hints (“fresh, never frozen”, “cool place”) decide only for families where they are
 * unambiguous; disagreement within the deciding field stays in review.
 */
export function resolveStorage(findings: StorageFinding[], family: string): StorageResolution {
  // “Shelf-stable before opening” describes the sealed retail unit even when the spec table
  // repeats a generic “keep refrigerated” meant for opened packs.
  const sealedAmbient = findings.find(
    (finding) => finding.signal === 'ambient' && unopened.test(normalize(finding.quote)),
  );
  if (
    sealedAmbient &&
    !findings.some(
      (finding) => finding.signal === 'frozen' || finding.signal === 'chilled-or-frozen',
    )
  )
    return { condition: 'ambient-likely', quote: sealedAmbient.quote };
  for (const field of fields) {
    const result = resolveField(findings.filter((finding) => finding.field === field));
    if (result.condition || result.conflict) return result;
  }
  const fresh = findings.find((finding) => finding.signal === 'fresh-never-frozen');
  if (fresh && ['meat', 'seafood'].includes(family))
    return { condition: 'chilled-confirmed', quote: fresh.quote };
  const cool = findings.find((finding) => finding.signal === 'cool-place');
  if (cool && family === 'floral') return { condition: 'ambient-likely', quote: cool.quote };
  return { condition: null };
}
