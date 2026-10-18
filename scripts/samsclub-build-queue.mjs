import fs from 'node:fs/promises';
import path from 'node:path';
import { publicCategoryLinks, publicCategorySnapshot } from './samsclub-bulk.mjs';

const root = process.cwd();
const dir = path.join(root, '.cache/samsclub-bulk');
const pages = path.join(dir, 'verified-pages');
const pendingFile = path.join(dir, 'pending-pages.json');
const deferredFile = path.join(dir, 'deferred-pages.json');
const read = async (file, fallback) => fs.readFile(file, 'utf8').then(JSON.parse).catch(() => fallback);
const MAIN_CATEGORIES = [
  'meat', 'seafood', 'dairy', 'bakery', 'deli', 'fruit', 'vegetables', 'frozen',
  'pantry', 'seasoning', 'snacks', 'beverages', 'paper-goods', 'cleaning', 'home',
  'pet', 'baby', 'personal-care', 'clothing',
];
const MAIN_SET = new Set(MAIN_CATEGORIES);
const GOAL_PER_MAIN = 100;
const MAX_UNKNOWN_PDP_PROBES = 24;
const MAX_UNKNOWN_CATEGORY_PROBES = 2;

const pending = await read(pendingFile, []);
const progress = await read(path.join(pages, 'progress.json'), { completed: [] });
const ledger = await read(path.join(dir, 'queue-discovery.json'), { pages: {}, categories: {} });
const catalog = await read(path.join(root, 'shared/samsclub-catalog.json'), []);
const deferredSaved = await read(deferredFile, []);
const previousDeferred = Array.isArray(deferredSaved)
  ? deferredSaved
  : Array.isArray(deferredSaved.tasks) ? deferredSaved.tasks : [];

const idOf = (url) => new URL(url).pathname.split('/').filter(Boolean).at(-1);
// Sam's Club PDP URL usItemId is a source page ID, never the store Item #.
const sourcePageIdOf = (url) => {
  try {
    const id = idOf(url);
    return /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
};
const productPageId = (task) => String(
  sourcePageIdOf(task.url) || task.sourcePageId || task.pageId || idOf(task.url),
);
const taskKey = (task) => task.kind === 'product'
  ? 'product:' + productPageId(task)
  : 'category:' + String(task.categoryId || idOf(task.url)) + ':' + String(
      task.page || (() => { try { return new URL(task.url).searchParams.get('page') || 1; } catch { return 1; } })(),
    );

const known = new Set([
  ...(progress.completed || []).map((entry) => taskKey({
    url: entry.url,
    kind: entry.kind || (/\/ip\//.test(entry.url) ? 'product' : 'category'),
    pageId: entry.page_id,
    sourcePageId: entry.source_page_id,
    categoryId: entry.category_id,
    page: entry.page,
  })),
  ...catalog.map((item) => 'product:' + String(
    item.sourcePageId || sourcePageIdOf(item.sourceUrl) || '',
  )),
]);

const scope = /grocery|fresh|flower|beef|poultry|seafood|pork|lamb|meat|dairy|egg|milk|cheese|butter|yogurt|frozen|vegetable|produce|fruit|bakery|bread|baking|cake|pastry|deli|prepared|breakfast|pantry|rice|pasta|grain|bean|canned|sauce|season|spice|oil|vinegar|sugar|flour|salt|snack|candy|chocolate|nuts|chips|popcorn|cookies|crackers|beverage|drink|water|juice|soda|coffee|tea|paper|toilet|tissue|towel|laundry|cleaning|disposable|dish|trash|pet|dog|cat\b|litter|baby|diaper|infant|nursery|formula|personal|oral|tooth|dental|deodorant|shampoo|soap|skin|beauty|hair|cosmetic|clothing|apparel|women|men\b|kids|socks|underwear|home|household|kitchen|bath|bed|cookware|storage/i;
const exclude = /pharmacy|health-wellness|travel|tires?|auto-|electronics|patio|garden|outdoor|office|furniture|jewelry|gift-card|alcohol|wine|beer|halloween|thanksgiving|christmas|curbside|pickup|shipping|live-well-your-way/i;

const SOURCE_MAIN = new Map();
const addIds = (main, ids) => ids.forEach((id) => SOURCE_MAIN.set(String(id), main));
addIds('meat', ['1548', '1546', '1550', '3520103', '16250217', '1624', '16230953']);
addIds('seafood', ['3060101', '10080118', '15830165', '8007']);
addIds('dairy', ['1507']);
addIds('bakery', ['1445', '12580117', '9158', '1580109', '1580105']);
addIds('deli', ['7290106', '15370265', '670102']);
addIds('fruit', ['1538']);
addIds('vegetables', ['1539']);
addIds('pantry', ['450193', '1466', '1474', '1467', '1484', '2263', '2264', '2260']);
addIds('seasoning', ['1544', '1529', '1532']);
addIds('snacks', ['16290442', '16290440', '13430107', '690107', '1465', '16650639', '1464', '1460', '2259', '1462', '16650640', '16660919', '1461', '15191088', '13030124', '9280112', '11940128', '16290789', '610195']);
addIds('beverages', ['1493', '1495', '1496', '15110121', '1501', '1502', '1504', '1506', '2080101', '2080109', '16270422']);
addIds('paper-goods', ['450199', '1110179', '2450101']);
addIds('cleaning', ['1564', '1559', '9149']);
addIds('home', ['1285', '450203', '1424', '10220126', '1373', '1433', '1023', '1358', '1381', '1389', '9151', '1250115', '2234', '1384', '1383', '1830', '10270125', '1438', '1422', '10220130', '1963', '10270123', '1434', '16730296', '1440', '5280109', '1306']);
addIds('pet', ['2011', '2022', '2024', '3450119']);
addIds('baby', ['1946', '1954', '1956', '2110101', '2110105', '2580101', '3230105', '3010101', '4700137', '15510457', '1340131', '8049', '3530101', '2211', '2360125', '21000361', '16630248', '11980104']);
addIds('personal-care', ['10230120', '10230119', '1625', '1672', '15770163', '2670101', '1622', '420195', '15770164', '16230259', '3190103', '15720492', '16660205', '16280188', '1626', '700103', '15770126', '1400105', '15720529', '1890129']);
addIds('clothing', ['1959', '1960', '1961', '8096', '14450203', '4070105', '4700109', '4070113', '2920105', '16700409', '6030121', '3940113', '16631196', '8051', '13060102', '12400102', '2920103', '14320119', '1320121', '2060101', '15620265', '12410126', '15370111', '13180127', '13180126', '1694', '16290921', '1621', '2070', '15500321']);
addIds('frozen', ['1514', '1516', '1517', '1519', '1483', '1521', '8222']);

const MIXED_SOURCE_IDS = new Set([
  '1444', '1515', '1537', '1545', '430221', '450203', '9232',
  '1516', '1517', '1519', '1483', '1521', '8222',
]);
const mainForUrl = (raw) => {
  try {
    const match = new URL(raw).pathname.match(/\/(?:browse|cp)\/(?:.*\/)?(\d+)\/?$/);
    return match ? String(match[1]) : '';
  } catch {
    return '';
  }
};
const safeDescription = (task) => {
  let route = '';
  try { route = new URL(task.url).pathname; } catch { /* invalid URLs are rejected below */ }
  return String(task.categoryName || task.label || '') + ' ' + route;
};
const MAIN_ID_SCOPE = new Set([
  ...SOURCE_MAIN.keys(), ...MIXED_SOURCE_IDS,
  '1961', '1960', '1959', '2011', '1946', '450203', '10230120', '10230119',
]);
const categoryInScope = (task) => {
  let url;
  try { url = new URL(task.url); } catch { return false; }
  if (url.protocol !== 'https:' || url.hostname !== 'www.samsclub.com') return false;
  if (task.kind === 'product') return /^\/ip\/.+\/\d+\/?$/.test(url.pathname);
  if (task.kind !== 'category') return false;
  if (task.page !== undefined && (!Number.isInteger(Number(task.page)) || Number(task.page) < 1)) return false;
  const queryPage = url.searchParams.get('page');
  if (queryPage !== null && (!/^\d+$/.test(queryPage) || Number(queryPage) < 1)) return false;
  if (/\/all-departments\/?$/.test(url.pathname)) return true;
  if (!/^\/(?:browse|cp)\/(?:[^/]+\/)*\d+\/?$/.test(url.pathname)) return false;
  const description = safeDescription(task);
  const sourceId = String(task.categoryId || mainForUrl(task.url));
  return !exclude.test(description) && (MAIN_ID_SCOPE.has(sourceId) || scope.test(description));
};

const titleFruit = /\b(?:fruit|berries|berry|apples?|oranges?|bananas?|grapes?|melon|pears?|mango|peach|plums?|pineapple|kiwi|lemons?)\b/i;
const titleVegetable = /\b(?:vegetables?|tomatoes?|potatoes?|onions?|carrots?|lettuce|spinach|broccoli|peppers?|cucumbers?|mushrooms?|asparagus|celery|corn|squash|avocados?)\b/i;
const titleSeafood = /\b(?:salmon|shrimp|fish|crab|lobster|scallop|seafood|tuna|cod|tilapia|halibut|oyster|trout|clam|mussels?)\b/i;
const titleMeat = /\b(?:meat|poultry|chicken|beef|pork|turkey|lamb|mutton|steak|sausage|brisket|burger|bacon|hot dogs?)\b/i;
const mixedIdMain = (id, text) => {
  if (id === '1537' || id === '9232') return titleFruit.test(text) ? 'fruit' : titleVegetable.test(text) ? 'vegetables' : null;
  if (id === '1545') return titleSeafood.test(text) ? 'seafood' : titleMeat.test(text) ? 'meat' : null;
  if (id === '1515') return titleSeafood.test(text) ? 'seafood' : titleMeat.test(text) ? 'meat' : 'frozen';
  if (['1516', '1517', '1519', '1483', '1521', '8222'].includes(id))
    return titleSeafood.test(text) ? 'seafood' : titleMeat.test(text) ? 'meat' : 'frozen';
  return null;
};
const inferMain = (task) => {
  const ownId = String(task.categoryId || mainForUrl(task.url));
  let ownPath = '';
  let parentId = '';
  try {
    const ownUrl = new URL(task.url);
    ownPath = ownUrl.pathname.split('/').filter(Boolean).slice(0, -1).join(' ');
    if (task.sourceCategoryUrl) parentId = mainForUrl(task.sourceCategoryUrl);
  } catch { /* text rules below still help from task labels */ }
  const sourceText = [task.categoryName || task.label || '', ownPath].join(' ').toLowerCase();
  const listing = String(task.listingName || '').toLowerCase();
  const text = sourceText + ' ' + listing;

  if (MIXED_SOURCE_IDS.has(ownId)) {
    const mixed = mixedIdMain(ownId, text);
    if (mixed) return mixed;
  }
  if (SOURCE_MAIN.has(ownId) && !MIXED_SOURCE_IDS.has(ownId)) return SOURCE_MAIN.get(ownId);

  // Child routes named "Shop All" can inherit only their explicit public parent.
  const genericChild = /\b(?:shop all|all products|all items|browse all)\b/i.test(sourceText);
  if (genericChild && SOURCE_MAIN.has(parentId)) return SOURCE_MAIN.get(parentId);

  // Explicit non-food taxonomy wins over ingredient words in listing titles.
  if (/\b(?:pet supplies?|pet food|pet care|pet accessories|pet supplements?|dog food|cat food|cat litter|pet litter)\b/.test(sourceText) || /\b(?:pet|dog|cat)\s+(?:food|treats?|litter|toys?|supplies|supplements|beds?)\b/.test(listing)) return 'pet';
  if (/\b(?:baby|toddler|infant|maternity|nursery|diapers?|baby wipes|baby food|infant formula|car seats?|strollers?|baby clothing)\b/.test(sourceText) || /\b(?:diapers?|baby wipes|baby food|infant formula|toddler|baby clothing|car seats?|strollers?)\b/.test(listing)) return 'baby';
  if (/\b(?:cleaning supplies?|laundry supplies?|janitorial supplies?|air fresheners?|dish soap|dishwashing|disinfectants?|trash bags?|garbage bags?|floor cleaners?)\b/.test(sourceText) || /\b(?:laundry detergent|dish soap|dishwashing liquid|cleaning spray|disinfectants?|trash bags?|garbage bags?|air fresheners?|floor cleaner)\b/.test(listing)) return 'cleaning';
  if (/\b(?:paper goods|toilet paper|paper towels?|facial tissues?|napkins?|disposable tableware|paper plates?)\b/.test(sourceText) || /\b(?:toilet paper|paper towels?|facial tissues?|napkins?|paper plates?)\b/.test(listing)) return 'paper-goods';
  if (/\b(?:personal care|beauty|oral care|dental care|hair care|skin care|bath & body|cosmetics?|shaving|deodorants?|health & beauty)\b/.test(sourceText) || /\b(?:shampoo|conditioner|toothpaste|toothbrush|deodorant|razors?|skin care|cosmetics?|body wash)\b/.test(listing)) return 'personal-care';
  if (/\b(?:clothing|apparel|fashion|footwear|women'?s clothing|men'?s clothing|outerwear|activewear|socks|underwear|sleepwear|shoes)\b/.test(sourceText)) return 'clothing';
  if (/\b(?:home|household essentials|kitchen & dining|kitchen appliances|cookware|kitchen storage|bath|bedding|storage & organization|mattresses|home décor|home improvement)\b/.test(sourceText) || /\b(?:cookware|bed sheets|mattress|storage bins?|kitchen appliances?|bath towels?)\b/.test(listing)) return 'home';

  // Explicit beverage and seasoning classes precede ingredient/seafood words.
  if (/\b(?:beverages?|drinks?|coffee|tea|cocoa|water|juice|soda|drink mixes?)\b/.test(sourceText)) return 'beverages';
  if (/\b(?:seasonings?|spices?|salt|sauces?|condiments?|oil|oils|vinegar|dressings?|salsa|ketchup|mustard|mayonnaise|marinade)\b/.test(sourceText) || /\b(?:fish sauce|oyster sauce|shrimp paste|anchovy paste|shrimp sauce)\b/.test(listing)) return 'seasoning';
  if (/\b(?:snacks?|candy|chocolate|chips?|popcorn|crackers?|pretzels?|jerky)\b/.test(sourceText)) return 'snacks';
  if (/\b(?:beverages?|drinks?|coffee|tea|water|juice|soda)\b/.test(listing) && !/\b(?:milk chocolate|chocolate milk)\b/.test(listing)) return 'beverages';
  if (/\b(?:bone broth|broth powder|bouillon|stock powder|rice|pasta|grains?|beans?|flour|oats?|cereal|soups?|broth|canned|pantry)\b/.test(sourceText) || /\b(?:bone broth|broth powder|bouillon|stock powder)\b/.test(listing)) return 'pantry';
  if (titleSeafood.test(text)) return 'seafood';
  if (titleMeat.test(text)) return 'meat';
  if (/\b(?:dairy|eggs?|cheese|milk|butter|yogurt)\b/.test(text)) return 'dairy';
  if (/\b(?:bakery|bread|cake|croissant|pastry|muffins?)\b/.test(text)) return 'bakery';
  if (/\b(?:deli|prepared meals?|rotisserie)\b/.test(sourceText)) return 'deli';
  if (titleFruit.test(text)) return 'fruit';
  if (titleVegetable.test(text) || /\b(?:fresh vegetables?|produce)\b/.test(sourceText)) return 'vegetables';
  if (/\b(?:frozen|deep[\s-]*frozen)\b/.test(text)) return 'frozen';
  if (/\b(?:pantry|baking goods|ingredients?|rice|pasta|grains?|beans?|flour|oats?|cereal|soups?|broth|canned)\b/.test(sourceText)) return 'pantry';
  if (SOURCE_MAIN.has(parentId)) return SOURCE_MAIN.get(parentId);
  return null;
};

const deferred = new Map();
const productCandidates = new Map();
const categoryCandidates = new Map();
let additions = 0;
const normalizedTask = (task) => {
  const { deferredReason, deferredMainCategory, ...clean } = task;
  // Observed public PDP redirect on 2026-10-17. This changes the page ID only;
  // the destination's own Item # is still parsed independently before import.
  if (clean.kind === 'product' && String(clean.pageId || sourcePageIdOf(clean.url)) === '13715013326') {
    return { ...clean, url: 'https://www.samsclub.com/ip/Member-s-Mark-Bolster-Pet-Bed-Choose-Size-Color/15082168230', pageId: '15082168230', sourcePageId: '15082168230', redirectedFrom: clean.url };
  }
  // Public navigation from category 1023 was observed redirecting here on 2026-10-16.
  if (clean.kind === 'category' && String(clean.categoryId) === '1023') {
    const url = new URL('https://www.samsclub.com/browse/shop-all-kitchen-appliances-electrics/21010407');
    if (Number(clean.page) > 1) url.searchParams.set('page', String(clean.page));
    return { ...clean, url: url.toString(), categoryId: '21010407', categoryName: 'Kitchen Appliances & Electrics' };
  }
  return clean;
};
const rememberDeferred = (task, reason, mainCategory = null) => {
  if (!categoryInScope(task)) return;
  const clean = normalizedTask(task);
  deferred.set(taskKey(clean), { ...clean, deferredReason: reason, deferredMainCategory: mainCategory || null });
};
const addCandidate = (task, source = 'pending') => {
  if (!categoryInScope(task)) return;
  const clean = normalizedTask(task);
  const key = taskKey(clean);
  if (known.has(key)) return;
  let alreadyQueued = false;
  if (clean.kind === 'product') {
    const pageId = productPageId(clean);
    if (!/^\d+$/.test(pageId)) return;
    const existing = productCandidates.get(pageId);
    alreadyQueued = Boolean(existing);
    if (!existing || (!inferMain(existing) && inferMain(clean))) productCandidates.set(pageId, clean);
  } else {
    alreadyQueued = categoryCandidates.has(key);
    categoryCandidates.set(key, clean);
  }
  if (source !== 'pending' && !alreadyQueued) additions++;
};
for (const task of pending) addCandidate(task);
for (const task of previousDeferred) addCandidate(task);
for (const input of ['incoming-pages.json', 'incoming-products.json'])
  for (const task of await read(path.join(dir, input), [])) addCandidate(task, input);

for (const name of await fs.readdir(pages)) {
  if (!name.endsWith('.meta.json')) continue;
  const metadata = await read(path.join(pages, name), null);
  if (!metadata?.url || /\/ip\//.test(metadata.url)) continue;
  const metadataTask = {
    kind: 'category',
    url: metadata.url,
    categoryId: metadata.category_id || mainForUrl(metadata.url),
    categoryName: metadata.category_name || metadata.categoryName || metadata.label || '',
  };
  if (!categoryInScope(metadataTask)) continue;
  const file = metadata.html_file
    ? path.resolve(root, metadata.html_file)
    : path.join(pages, name.replace(/(?:\.html)?\.meta\.json$/, '.html'));
  if (ledger.pages[file]) continue;
  let html;
  try { html = await fs.readFile(file, 'utf8'); } catch { continue; }
  const snapshot = publicCategorySnapshot(html, metadata.url);
  const categoryId = String(snapshot?.categoryId || metadata.category_id || mainForUrl(metadata.url));
  const label = metadata.category_name || metadata.categoryName || html.match(/<title>(.*?)<\/title>/i)?.[1] || categoryId;
  const stats = ledger.categories[categoryId] || { name: label, urls: [], pages: [], available: snapshot?.totalCount ?? null };
  stats.urls = Array.isArray(stats.urls) ? stats.urls : [];
  stats.pageIds = Array.isArray(stats.pageIds)
    ? stats.pageIds
    : [...new Set(stats.urls.map(sourcePageIdOf).filter(Boolean))];
  stats.pages = Array.isArray(stats.pages) ? stats.pages : [];
  if (!stats.pages.includes(metadata.url)) stats.pages.push(metadata.url);

  if (snapshot) {
    stats.available = snapshot.totalCount;
    for (const candidate of snapshot.candidates) {
      const pageId = String(candidate.page_id || sourcePageIdOf(candidate.product_url) || '');
      if (!pageId || stats.pageIds.includes(pageId)) continue;
      if (stats.pageIds.length >= GOAL_PER_MAIN) break;
      stats.pageIds.push(pageId);
      if (!stats.urls.includes(candidate.product_url)) stats.urls.push(candidate.product_url);
      addCandidate({
        url: candidate.product_url,
        kind: 'product',
        pageId,
        sourcePageId: pageId,
        listingName: candidate.name || null,
        categoryId,
        categoryName: label,
        sourceCategoryUrl: metadata.url,
        listingPrice: candidate.listing_price,
        listingUnitPrice: candidate.listing_unit_price,
      }, 'snapshot');
    }

    const sourceSlots = Math.max(0, GOAL_PER_MAIN - stats.pageIds.length);
    if (sourceSlots > 0) {
      const maxPage = Math.min(snapshot.maxPage, Math.ceil(GOAL_PER_MAIN / (snapshot.pageSize || 45)));
      for (let page = 2; page <= maxPage; page++) {
        const url = new URL(metadata.url);
        url.searchParams.set('page', String(page));
        addCandidate({
          url: url.toString(), kind: 'category', categoryId, categoryName: label,
          sourceCategoryUrl: metadata.url, page, perCategoryLimit: GOAL_PER_MAIN,
        }, 'snapshot');
      }
    }
  } else {
    for (const child of publicCategoryLinks(html, metadata.url)) {
      const task = {
        url: child.url,
        kind: 'category',
        categoryId: child.categoryId,
        categoryName: child.label,
        sourceCategoryUrl: metadata.url,
        page: 1,
        perCategoryLimit: GOAL_PER_MAIN,
      };
      if (categoryInScope(task)) addCandidate(task, 'snapshot');
    }
  }
  ledger.categories[categoryId] = stats;
  ledger.pages[file] = {
    url: metadata.url,
    candidates: snapshot?.candidates.length || 0,
    processedAt: new Date().toISOString(),
  };
}

const mainCounts = new Map(MAIN_CATEGORIES.map((main) => [main, 0]));
const seenItemIds = new Set();
for (const item of catalog) {
  if (!MAIN_SET.has(item.category)) continue;
  const uniqueId = String(item.itemId || item.itemNumber || item.sourcePageId || item.sourceUrl || '');
  if (uniqueId && seenItemIds.has(uniqueId)) continue;
  if (uniqueId) seenItemIds.add(uniqueId);
  mainCounts.set(item.category, (mainCounts.get(item.category) || 0) + 1);
}

const candidateGroups = new Map(MAIN_CATEGORIES.map((main) => [main, []]));
const unknownProducts = [];
for (const task of productCandidates.values()) {
  const main = inferMain(task);
  if (main && MAIN_SET.has(main)) candidateGroups.get(main).push(task);
  else unknownProducts.push(task);
}
for (const tasks of candidateGroups.values()) tasks.sort((a, b) =>
  (String(a.sourceCategoryUrl || '').localeCompare(String(b.sourceCategoryUrl || ''))) ||
  productPageId(a).localeCompare(productPageId(b)),
);

const selectedProducts = [];
const queuedByMain = new Map(MAIN_CATEGORIES.map((main) => [main, 0]));
const deferredReasons = new Map();
for (const main of MAIN_CATEGORIES) {
  const current = mainCounts.get(main) || 0;
  const capacity = Math.max(0, GOAL_PER_MAIN - current);
  const candidates = candidateGroups.get(main) || [];
  const selected = candidates.slice(0, capacity);
  selectedProducts.push(...selected);
  queuedByMain.set(main, selected.length);
  for (const task of candidates.slice(capacity)) {
    rememberDeferred(task, current >= GOAL_PER_MAIN ? 'main-category-cap-reached' : 'predicted-main-category-candidate-cap', main);
    deferredReasons.set('product:' + main, (deferredReasons.get('product:' + main) || 0) + 1);
  }
}
for (const task of unknownProducts.slice(0, MAX_UNKNOWN_PDP_PROBES)) selectedProducts.push(task);
for (const task of unknownProducts.slice(MAX_UNKNOWN_PDP_PROBES)) {
  rememberDeferred(task, 'main-category-not-predictable-from-public-listing', null);
}

const productShortfall = (main) => Math.max(
  0,
  GOAL_PER_MAIN - (mainCounts.get(main) || 0) - (queuedByMain.get(main) || 0),
);
const categoryByMain = new Map(MAIN_CATEGORIES.map((main) => [main, []]));
const unknownCategories = [];
for (const task of categoryCandidates.values()) {
  const main = inferMain(task);
  if (main && MAIN_SET.has(main)) categoryByMain.get(main).push(task);
  else unknownCategories.push(task);
}
const selectedCategories = [];
for (const main of MAIN_CATEGORIES) {
  const current = mainCounts.get(main) || 0;
  const shortfall = productShortfall(main);
  const candidates = categoryByMain.get(main) || [];
  if (current >= GOAL_PER_MAIN) {
    for (const task of candidates) rememberDeferred(task, 'main-category-cap-reached', main);
    deferredReasons.set('category:' + main, candidates.length);
    continue;
  }
  if (shortfall === 0) {
    for (const task of candidates) rememberDeferred(task, 'pdp-candidates-cover-main-category-goal', main);
    deferredReasons.set('category:' + main, candidates.length);
    continue;
  }
  // Fetch one listing/navigation page per underfilled main class at a time.
  const [next, ...rest] = candidates;
  if (next) selectedCategories.push(next);
  for (const task of rest) rememberDeferred(task, 'deferred-until-current-main-category-pdps-are-read', main);
}
const totalShortfall = MAIN_CATEGORIES.reduce((sum, main) => sum + productShortfall(main), 0);
if (totalShortfall > 0) {
  const eligibleUnknown = unknownCategories.filter((task) => {
    const text = safeDescription(task);
    return scope.test(text) && !exclude.test(text);
  });
  selectedCategories.push(...eligibleUnknown.slice(0, MAX_UNKNOWN_CATEGORY_PROBES));
  for (const task of eligibleUnknown.slice(MAX_UNKNOWN_CATEGORY_PROBES))
    rememberDeferred(task, 'deferred-ambiguous-source-category', null);
} else {
  for (const task of unknownCategories) rememberDeferred(task, 'all-main-category-goals-covered-by-current-pdps', null);
}

// Round-robin PDP work by the least-covered main class; source page IDs remain globally unique.
const productQueues = new Map(MAIN_CATEGORIES.map((main) => [main, []]));
for (const task of selectedProducts) {
  const main = inferMain(task);
  if (main && MAIN_SET.has(main)) productQueues.get(main).push(task);
}
const unknownQueue = selectedProducts.filter((task) => !MAIN_SET.has(inferMain(task)));
const mainOrder = [...MAIN_CATEGORIES].sort((a, b) =>
  (mainCounts.get(a) || 0) - (mainCounts.get(b) || 0) || a.localeCompare(b),
);
const mixed = [];
let mainCursor = 0;
let categoryCursor = 0;
const categoriesByClass = new Map(MAIN_CATEGORIES.map((main) => [main, [...categoryByMain.get(main).filter((task) => selectedCategories.includes(task))]]));
for (const task of selectedCategories.filter((task) => !MAIN_SET.has(inferMain(task)))) {
  if (!categoriesByClass.has('unknown')) categoriesByClass.set('unknown', []);
  categoriesByClass.get('unknown').push(task);
}
const categoryOrder = [...mainOrder.filter((main) => categoriesByClass.get(main)?.length), ...(categoriesByClass.get('unknown')?.length ? ['unknown'] : [])];
const hasProducts = () => mainOrder.some((main) => productQueues.get(main)?.length) || unknownQueue.length > 0;
const hasCategories = () => categoryOrder.some((main) => categoriesByClass.get(main)?.length);
const takeProduct = () => {
  for (let visited = 0; visited < mainOrder.length; visited++) {
    const main = mainOrder[mainCursor++ % mainOrder.length];
    const group = productQueues.get(main);
    if (group?.length) {
      mixed.push(group.shift());
      return true;
    }
  }
  if (unknownQueue.length) {
    mixed.push(unknownQueue.shift());
    return true;
  }
  return false;
};
const takeCategory = (preferredMain = null) => {
  if (!hasCategories()) return false;
  if (preferredMain && categoriesByClass.get(preferredMain)?.length) {
    mixed.push(categoriesByClass.get(preferredMain).shift());
    return true;
  }
  for (let visited = 0; visited < categoryOrder.length; visited++) {
    const main = categoryOrder[categoryCursor++ % categoryOrder.length];
    const group = categoriesByClass.get(main);
    if (group?.length) {
      mixed.push(group.shift());
      return true;
    }
  }
  return false;
};

// Make an unrepresented main class visible in every short collection batch.
// With clothing currently at zero, its category route must lead the queue. The next
// category page appears in slot three so a 5–6 page CUA batch always reaches it.
const zeroPriorityOrder = ['clothing', ...mainOrder.filter((main) => main !== 'clothing')];
const zeroCoverageMain = zeroPriorityOrder.find((main) =>
  (mainCounts.get(main) || 0) === 0 && categoriesByClass.get(main)?.length,
);
if (zeroCoverageMain) takeCategory(zeroCoverageMain);
else {
  takeProduct();
  takeProduct();
}
if (zeroCoverageMain) takeProduct();
takeCategory();

let productsSinceCategory = 0;
while (hasProducts() || hasCategories()) {
  const addedProduct = takeProduct();
  if (addedProduct) productsSinceCategory++;
  if (hasCategories() && (!hasProducts() || productsSinceCategory >= 4)) {
    if (takeCategory()) productsSinceCategory = 0;
  }
  if (!addedProduct && !hasCategories()) break;
}

// Keep every deferred task recoverable; it is reconsidered after the next catalog/import refresh.
const deferredArray = [...deferred.values()];
await fs.writeFile(pendingFile + '.tmp', JSON.stringify(mixed, null, 2));
await fs.rename(pendingFile + '.tmp', pendingFile);
await fs.writeFile(path.join(dir, 'queue-discovery.json'), JSON.stringify(ledger, null, 2));
await fs.writeFile(deferredFile + '.tmp', JSON.stringify({ updatedAt: new Date().toISOString(), tasks: deferredArray }, null, 2));
await fs.rename(deferredFile + '.tmp', deferredFile);
console.log(JSON.stringify({
  queued: mixed.length,
  newTasks: additions,
  sourceCategories: Object.keys(ledger.categories).length,
  categoryTasks: mixed.filter((task) => task.kind === 'category').length,
  detailTasks: mixed.filter((task) => task.kind === 'product').length,
  catalogByMain: Object.fromEntries(mainCounts),
  predictedPdpByMain: Object.fromEntries(queuedByMain),
  deferred: deferredArray.length,
  deferredReasons: Object.fromEntries(deferredReasons),
}));
