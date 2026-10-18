#!/usr/bin/env node
// Resumable public-page collector. Browser fallback is opt-in; only public pages are read.
import { execFile } from 'node:child_process';
import { Resolver } from 'node:dns/promises';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import sharp from 'sharp';
import { chromium } from 'playwright';
import {
  DEFAULT_CATEGORY,
  accessChallenge,
  canonicalProductUrl,
  categoryProducts,
  detailProduct,
  imageRequestUrl,
  nextData,
} from './samsclub-poc.mjs';

const exec = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ROOT = path.resolve('.');
const CATALOG_FILE = path.join(ROOT, 'shared/samsclub-catalog.json');
const IMAGE_ROOT = path.join(ROOT, 'public/images/samsclub');
const GROCERY_ROOT = 'https://www.samsclub.com/cp/grocery/1444';
const BLOCKED_CAMPAIGN =
  /(?:all-day-grazing|comfy-food|game-day|new-grocery|new-lower|limited-time|halloween|thanksgiving|pumpkin|seasonal|grilling-food|power-protein|kids-table|holiday-relief)/i;

const CDN_DNS_FILE = path.join(ROOT, '.cache/samsclub-bulk/cdn-dns.json');
const cdnResolver = new Resolver({ timeout: 2000, tries: 1 });
const savedCdnDns = await fs.readFile(CDN_DNS_FILE, 'utf8').then(JSON.parse).catch(() => null);
let cdnAddress = savedCdnDns?.hostname === 'i5.samsclubimages.com' && /^\d+(?:\.\d+){3}$/.test(savedCdnDns?.address || '') ? savedCdnDns.address : undefined;
let cdnAddressExpiresAt = Number(savedCdnDns?.expiresAt || 0);
let cdnAddressStaleUntil = Number(savedCdnDns?.resolvedAt || 0) + 15 * 60 * 1000;
let cdnLookup;
async function imageConnectionArgs(url, kind) {
  const target = new URL(url);
  if (kind !== 'image' || target.protocol !== 'https:' || target.hostname !== 'i5.samsclubimages.com') return [];
  // The OS host lookup can stall while the configured DNS resolver still works.
  // Resolve this same public CDN with that resolver; retain the original HTTPS
  // hostname and certificate verification. No alternate servers or proxies.
  if (!cdnAddress || Date.now() >= cdnAddressExpiresAt) {
    cdnLookup ||= cdnResolver.resolve4(target.hostname, { ttl: true }).then(async (addresses) => {
      if (!addresses.length) throw new Error('No IPv4 address returned for the image CDN.');
      cdnAddress = addresses[0].address;
      cdnAddressExpiresAt = Date.now() + Math.max(1, Math.min(60, addresses[0].ttl)) * 1000;
      cdnAddressStaleUntil = Date.now() + 15 * 60 * 1000;
      await writeJson(CDN_DNS_FILE, { hostname: target.hostname, address: cdnAddress, resolvedAt: Date.now(), expiresAt: cdnAddressExpiresAt });
    }).catch((error) => {
      if (!cdnAddress || Date.now() >= cdnAddressStaleUntil) throw error;
      cdnAddressExpiresAt = Math.min(cdnAddressStaleUntil, Date.now() + 15000);
    }).finally(() => { cdnLookup = undefined; });
    try { await cdnLookup; } catch { return []; }
  }
  return ['--resolve', `${target.hostname}:443:${cdnAddress}`];
}

function parseArgs(args) {
  if (args.includes('--help')) {
    console.log('node scripts/samsclub-bulk.mjs [--browser] [--discover-only] [--limit-per-category=100] [--category=PUBLIC_URL] [--out=DIRECTORY] [--refresh]');
    console.log('Reads public Sam’s Club category/product pages, stops at access challenges, and resumes from saved HTML and Item # records.');
    return { help: true };
  }
  const value = (name, fallback) =>
    args.find((arg) => arg.startsWith(name + '='))?.slice(name.length + 1) ?? fallback;
  const limit = Number(value('--limit-per-category', '100'));
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error('--limit-per-category must be between 1 and 100.');
  const category = value('--category', '');
  if (category) {
    const url = new URL(category);
    if (url.protocol !== 'https:' || url.hostname !== 'www.samsclub.com')
      throw new Error('--category must be a public Sam’s Club US URL.');
  }
  const out = path.resolve(
    value('--out', '.cache/samsclub-bulk/' + new Date().toISOString().slice(0, 10)),
  );
  return {
    out,
    limit,
    category,
    refresh: args.includes('--refresh'),
    discoverOnly: args.includes('--discover-only'),
    browser: args.includes('--browser'),
    offline: args.includes('--offline'),
  };
}

async function exists(file) {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp-' + process.pid;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await fs.rename(temporary, file);
}

function safeFileName(url, pageNo) {
  const base = url.pathname
    .replace(/^\/+|\/+$/g, '')
    .replace(/\//g, '__')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 180);
  return base + (pageNo ? '-page-' + pageNo : '') + '.html';
}

function selectedHeaders(raw) {
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (['location', 'content-type', 'date', 'server'].includes(name))
      result[name] = value;
  }
  return result;
}

async function fetchPublic(url, file, kind, options) {
  const auditFile = file + '.http.json';
  if (!options.refresh && (await exists(file))) {
    const audit = await fs.readFile(auditFile, 'utf8').then(JSON.parse);
    if (audit.url !== url || audit.status !== 200)
      throw new Error('Cached public-page provenance mismatch: ' + file);
    return { body: await fs.readFile(file), audit, cached: true };
  }
  if (options.offline) throw new Error('Missing offline snapshot: ' + file);
  if (await exists(file) && !options.refresh)
    throw new Error('Refusing to overwrite an existing snapshot without provenance: ' + file);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = file + '.part';
  const headerFile = file + '.headers';
  const startedAt = new Date().toISOString();
  try {
    const connectionArgs = await imageConnectionArgs(url, kind);
    const { stdout } = await exec(
      'curl',
      [
        ...connectionArgs,
        '--silent',
        '--show-error',
        '--proto',
        '=https',
        '--connect-timeout',
        '10',
        '--max-time',
        '40',
        '--max-filesize',
        String(kind === 'html' ? 12 * 1024 * 1024 : 20 * 1024 * 1024),
        '--user-agent',
        'QingheCatalogPoC/1.0 (public-page research)',
        '--dump-header',
        headerFile,
        '--output',
        temporary,
        '--write-out',
        '%{http_code}',
        url,
      ],
      { maxBuffer: 1024 * 1024, timeout: 45000 },
    );
    const status = Number(stdout.trim());
    const rawHeaders = await fs.readFile(headerFile, 'utf8').catch(() => '');
    const headers = selectedHeaders(rawHeaders);
    const body = await fs.readFile(temporary).catch(() => Buffer.alloc(0));
    const audit = {
      url,
      status,
      captured_at: startedAt,
      completed_at: new Date().toISOString(),
      headers,
    };
    await writeJson(auditFile, audit);
    const sample = kind === 'html' ? body.subarray(0, 20000).toString('utf8') : '';
    if (status !== 200) {
      const error = new Error('HTTP ' + status + ' for ' + url);
      error.status = status;
      error.blocked = accessChallenge(status, rawHeaders, sample);
      if (error.blocked) error.message = 'Access challenge received; stopped without retrying or bypassing it.';
      throw error;
    }
    if (accessChallenge(status, rawHeaders, sample)) {
      const error = new Error('Access challenge received; stopped without retrying or bypassing it.');
      error.blocked = true;
      throw error;
    }
    if (!body.length) throw new Error('Empty HTTP response for ' + url);
    if (kind === 'html' && !/text\/html/i.test(headers['content-type'] || ''))
      throw new Error('Public page response is not text/html for ' + url);
    if (kind === 'image' && !/^image\//i.test(headers['content-type'] || ''))
      throw new Error('CDN response is not image/*; refusing to save it.');
    await fs.rename(temporary, file);
    return { body, audit, cached: false };
  } finally {
    await fs.rm(temporary, { force: true });
    await fs.rm(headerFile, { force: true });
  }
}

function browserPageIsChallenge(page, html) {
  return (
    page.url().includes('/are-you-human') ||
    accessChallenge(200, '', String(html || '').slice(0, 20000))
  );
}

async function manualBrowserChallenge(page, url, options) {
  if (!options.terminal)
    throw Object.assign(new Error('Sam’s Club requires manual human verification in the collection browser.'), {
      blocked: true,
    });
  console.error('Sam’s Club access challenge is open in the separate collection Chrome window.');
  let html = await page.content().catch(() => '');
  while (browserPageIsChallenge(page, html)) {
    await options.terminal.question(
      'Complete the visible Sam’s Club verification yourself. When the requested page is available, press Enter here to continue: ',
    );
    html = await page.content().catch(() => '');
  }
  return html;
}

async function fetchInBrowser(url, file, kind, options, reason) {
  const page = options.browserPage;
  if (!page)
    throw Object.assign(new Error('Browser fallback is unavailable.'), { blocked: true });
  await fs.mkdir(path.dirname(file), { recursive: true });
  let body;
  let headers = {};
  if (kind === 'html') {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    if (!response || response.status() >= 400) {
      if (response && accessChallenge(response.status(), ''))
        await manualBrowserChallenge(page, url, options);
      else
        throw new Error('Browser HTTP ' + (response?.status() || 'unknown') + ' for ' + url);
    }
    let html = await page.content();
    if (browserPageIsChallenge(page, html))
      html = await manualBrowserChallenge(page, url, options);
    else {
      const requested = new URL(url);
      const actual = new URL(page.url());
      if (actual.origin !== requested.origin || actual.pathname !== requested.pathname)
        throw new Error('Browser navigated to an unexpected public URL: ' + page.url());
    }
    body = Buffer.from(html);
    headers['content-type'] = 'text/html; charset=utf-8';
  } else {
    const request = options.browserContext.request;
    let response = await request.get(url, { timeout: 45000, maxRedirects: 0 });
    if (response.status() !== 200) {
      const responseHeaders = response.headers();
      const location = responseHeaders.location || '';
      if (
        accessChallenge(
          response.status(),
          location ? 'location: ' + location : '',
          (await response.text().catch(() => '')).slice(0, 20000),
        )
      ) {
        const challengeUrl = new URL(location || url, url).toString();
        await page.goto(challengeUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await manualBrowserChallenge(page, url, options);
        response = await request.get(url, { timeout: 45000, maxRedirects: 0 });
      }
    }
    if (response.status() !== 200)
      throw Object.assign(new Error('Browser HTTP ' + response.status() + ' for ' + url), {
        blocked: accessChallenge(response.status(), ''),
      });
    headers = response.headers();
    body = await response.body();
    if (!/^image\//i.test(headers['content-type'] || ''))
      throw new Error('Browser CDN response is not image/*; refusing to save it.');
  }
  const audit = {
    url,
    status: 200,
    captured_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    headers: { 'content-type': headers['content-type'] || '' },
    transport: 'Chrome public-page extraction after manual verification when required',
    fallback_reason: reason,
  };
  await fs.writeFile(file, body);
  await writeJson(file + '.http.json', audit);
  options.browserReady = true;
  return { body, audit, cached: false };
}

async function fetchWithFallback(url, file, kind, options) {
  if (options.browserReady && options.browserPage)
    return fetchInBrowser(url, file, kind, options, 'same manually verified Chrome context');
  try {
    return await fetchPublic(url, file, kind, options);
  } catch (error) {
    if (!options.browserPage || options.offline) throw error;
    if (error.status && !error.blocked) throw error;
    return fetchInBrowser(url, file, kind, options, error.message);
  }
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&#0*39;|&#x0*27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function plainText(value) {
  return decodeEntities(String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:li|p|h[1-6]|div|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function plainLines(value) {
  return decodeEntities(String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:li|p|h[1-6]|div|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, ' '))
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function categoryIdentity(url) {
  const match = url.pathname.match(/\/(?:browse|cp)\/(?:.*\/)?(\d+)\/?$/);
  return match?.[1] || url.pathname;
}

function canonicalCategoryUrl(raw, baseUrl) {
  let url;
  try {
    url = new URL(decodeEntities(raw), baseUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'www.samsclub.com') return null;
  if (!/^\/(?:browse|cp)\/(?:.+\/)?\d+\/?$/.test(url.pathname)) return null;
  if (/\/(?:pharmacy|auto-services|electronics|membership-benefits|travel|tires?|patio-garden)(?:\/|$)/i.test(url.pathname))
    return null;
  if (/\/(?:members?-mark(?:-|\/)|member's-mark)/i.test(url.pathname)) return null;
  if (BLOCKED_CAMPAIGN.test(url.pathname)) return null;
  url.searchParams.delete('mid');
  url.searchParams.delete('page');
  url.hash = '';
  return url;
}

function navigationLinks(html, fromUrl) {
  const links = new Map();
  const add = (href, label) => {
    const url = canonicalCategoryUrl(href, fromUrl);
    if (!url || url.pathname === fromUrl.pathname) return;
    const key = url.pathname;
    if (!links.has(key))
      links.set(key, {
        url: url.toString(),
        categoryId: categoryIdentity(url),
        label: label || url.pathname.split('/').at(-2)?.replace(/-/g, ' ') || 'Sam’s Club category',
      });
  };
  const anchors = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchors)) {
    const href = match[1].match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const label = plainText(match[2]).slice(0, 140);
    add(href, label);
  }
  // Some public landing pages put navigation targets in their server-rendered page data
  // instead of anchor tags. Read those published category routes from the same HTML.
  const routes = [
    /https:\/\/www\.samsclub\.com\/(?:browse|cp)\/[^"'\\\s<>]{1,240}/gi,
    /(?<![\w.])\/(?:browse|cp)\/[^"'\\\s<>]{1,240}/gi,
  ];
  for (const route of routes)
    for (const match of html.matchAll(route)) add(match[0], '');
  return [...links.values()];
}

export function publicCategoryLinks(html, pageUrl) {
  return navigationLinks(html, new URL(pageUrl));
}

function categorySnapshot(html, url) {
  try {
    const props = nextData(html);
    const search = props?.initialData?.searchResult;
    if (!search?.itemStacks?.length) return null;
    const pagination = search.paginationV2 || {};
    const pageProperties = pagination.pageProperties || {};
    const maxPage = Number(pagination.maxPage || 1);
    return {
      candidates: categoryProducts(html),
      page: Number(pageProperties.page || 1),
      maxPage: Number.isInteger(maxPage) && maxPage > 0 ? maxPage : 1,
      pageSize: Number(pageProperties.ps || pageProperties.limit || 45),
      totalCount: Number(search.aggregatedCount || search.itemStacks[0]?.count || 0),
      categoryId: String(pageProperties.cat_id || categoryIdentity(url)),
    };
  } catch {
    return null;
  }
}

export function publicCategorySnapshot(html, pageUrl) {
  return categorySnapshot(html, new URL(pageUrl));
}

function publicPageTitle(html) {
  return decodeEntities(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').trim();
}

export async function loadCatalog() {
  return JSON.parse(await fs.readFile(CATALOG_FILE, 'utf8'));
}

export async function appendCatalogRecord(record) {
  const current = await loadCatalog();
  if (current.some((item) => String(item.itemId) === String(record.itemId)))
    return { added: false, reason: 'item-id-already-present' };
  if (current.some((item) => item.sourceUrl === record.sourceUrl))
    return { added: false, reason: 'source-url-already-present' };
  const temporary = CATALOG_FILE + '.bulk-' + process.pid + '.tmp';
  await fs.writeFile(temporary, JSON.stringify([...current, record], null, 2) + '\n');
  await fs.rename(temporary, CATALOG_FILE);
  return { added: true };
}

function classify(record, node, rawProduct, specifications) {
  const sourcePath = (rawProduct?.category?.path || []).map((entry) => entry?.name).filter(Boolean);
  const sourcePathText = sourcePath.join(' ').toLowerCase();
  const title = String(record.product.product_name || '').toLowerCase();
  const leaf = String(sourcePath.at(-1) || '').toLowerCase();
  // PDP-owned category paths are the product's own taxonomy. Use the listing
  // label only when the PDP has no path; listing pages can carry unrelated ads.
  const local = sourcePath.length ? '' : String(node.label || '').toLowerCase();
  // Keep ancestor nodes: public PDPs often put the useful family above a very
  // specific leaf such as “Gum & Mints” or “Breakfast Breads”.
  const sourceLabels = (sourcePath.length ? sourcePath.join(' ') : local).toLowerCase();
  const sourceTaxonomy = (sourcePath.length ? sourcePath.join(' ') : node.label || '').toLowerCase();
  const floralTaxonomy = sourcePath.length ? sourcePath : [String(node.label || '')];
  const floralMerchandisePath = floralTaxonomy.some((name) =>
    /^(?:floral|fresh flowers?|flowers?|bouquets?|garlands?|greenery|bulk flowers?\s*(?:&|and)\s*greenery)$/i.test(String(name).trim()),
  ) && !/\b(?:grocery|food|herbs?|soap|perfumes?|colognes?|fragrances?|personal care|beauty)\b/i.test(
    floralTaxonomy.join(' '),
  );
  const homeCategoryTaxonomy = sourceTaxonomy.replace(/\b(?:fresh\s+)?home delivery\b/g, ' ');
  const specific = leaf + ' ' + local + ' ' + title;
  const titleFruit = /\b(?:fruit|berries|berry|strawberries?|blueberries?|raspberries?|blackberries?|cherries?|apples?|oranges?|bananas?|grapes?|melon|pears?|mango|peach|plums?|pineapples?|kiwis?|lemons?|limes?|avocados?)\b/i;
  const titleVegetable = /\b(?:vegetables?|salads?|coleslaw|slaw|lettuce|spinach|broccoli|cauliflower|tomatoes?|potatoes?|onions?|carrots?|peppers?|cucumbers?|mushrooms?|asparagus|celery|corn|squash|cabbage|greens|kale)\b/i;
  const frozenWord = /\b(?:deep[\s-]*frozen|frozen)\b/i;
  const toyTaxonomy = /\b(?:toys?|dolls?|playsets?|costumes?)\b/i.test(sourceTaxonomy);
  const frozenFoodTaxonomy = !toyTaxonomy && frozenWord.test(sourceTaxonomy) &&
    /\b(?:grocery|food|meat|poultry|seafood|fish|produce|fruit|vegetables?|dairy|bakery|deli|pantry|snacks?|beverages?)\b/i.test(sourceTaxonomy);
  const frozenFoodTitle = !toyTaxonomy && frozenWord.test(title) &&
    /\b(?:food|meals?|pizza|fruit|berries|vegetables?|broccoli|chicken|beef|pork|turkey|lamb|seafood|fish|shrimp|salmon|ice cream|sorbet|gelato|desserts?|yogurt|fries|nuggets?|dumplings?|pasta|waffles?|pancakes?|sausage|burgers?|bread|rolls?|smoothies?|beverages?)\b/i.test(title) &&
    !/\b(?:maker|machine|appliance|device|toy|doll|playset|costume|blender|massager)\b/i.test(title);
  const frozenFoodSignal = frozenFoodTaxonomy || frozenFoodTitle;
  let category = 'samsclub-' + String(node.categoryId || categoryIdentity(new URL(node.url)));
  let categoryName = node.title || node.label || 'Sam’s Club category';
  let family = 'other';
  let processingGroup = '';
  let nonFood = false;
  const choose = (id, name, group) => {
    category = id;
    categoryName = name;
    family = group;
  };

  // Explicit public non-food taxonomy takes precedence over ingredient words in
  // product names (for example, chicken-flavored dog food or milk-based baby food).
  if (floralMerchandisePath) {
    // Keep the source category (usually a flower page ID) and avoid inferring a
    // produce family from words such as “greens” in garland product names.
  } else if (sourcePath.length && /^(?:fresh )?fruits?$/.test(leaf)) {
    choose('fruit', '水果', 'produce');
  } else if (sourcePath.length && /^(?:fresh )?vegetables?$/.test(leaf)) {
    choose('vegetables', '蔬菜', 'produce');
  } else if (
    sourcePath.length &&
    /\b(?:fruit cups?|applesauce|apple sauce|pudding)\b/.test(leaf) &&
    /\bpantry\b/.test(sourcePathText)
  ) {
    choose('pantry', '粮油调味', 'pantry');
  } else if (
    sourcePath.length &&
    (
      /\bsushi\b/.test(sourcePathText) ||
      (/\b(?:deli|prepared meals?)\b/.test(sourcePathText) &&
        /\b(?:salads?|sandwiches?|wraps?|prepared meals?|rotisserie|ready to eat|ready to serve)\b/.test(sourcePathText + ' ' + title))
    )
  ) {
    choose('deli', '熟食', 'deli');
    processingGroup = 'prepared';
  } else if (
    sourcePath.length &&
    /\b(?:packaged salads?|salads?)\b/.test(sourcePathText)
  ) {
    // Sam’s Club places these ready-to-eat bowls under Produce > Packaged
    // Salads. Keep their official produce category while recording preparation.
    choose('vegetables', '蔬菜', 'produce');
    processingGroup = 'prepared';
  } else if (!sourcePath.length && /\bsalads?\b/.test(title)) {
    choose('vegetables', '蔬菜', 'produce');
    processingGroup = 'prepared';
  } else if (
    /\b(?:smart pets?|pet supplies?|pet food|pet care|pet accessories|pet supplements?|dog food|cat food|cat litter|pet litter)\b/.test(sourceTaxonomy) ||
    /\b(?:pet|dog|cat)\s+(?:food|treats?|litter|toys?|supplies|supplements|beds?)\b/.test(title)
  ) {
    choose('pet', '宠物食品与用品', 'pet');
    nonFood = true;
  } else if (
    /\b(?:baby(?:\s*&\s*toddler)?|toddler|infant|maternity|nursery|diapers?|baby wipes|baby food|infant formula|car seats?|strollers?|baby clothing)\b/.test(sourceTaxonomy) ||
    /\b(?:diapers?|baby wipes|baby food|infant formula|toddler|baby clothing|car seats?|strollers?)\b/.test(title)
  ) {
    choose('baby', '母婴用品', 'baby');
    nonFood = true;
  } else if (
    /\b(?:cleaning supplies?|laundry supplies?|janitorial supplies?|air fresheners?|dish soap|dishwashing|disinfectants?|trash bags?|garbage bags?|floor cleaners?)\b/.test(sourceTaxonomy) ||
    /\b(?:laundry detergent|dish soap|dishwashing liquid|cleaning spray|disinfectants?|trash bags?|garbage bags?|air fresheners?|floor cleaner)\b/.test(title)
  ) {
    choose('cleaning', '日用清洁', 'cleaning');
    nonFood = true;
  } else if (
    /\b(?:paper goods|toilet paper|paper towels?|facial tissues?|napkins?|disposable tableware|paper plates?)\b/.test(sourceTaxonomy) ||
    /\b(?:toilet paper|paper towels?|facial tissues?|napkins?|paper plates?)\b/.test(title)
  ) {
    choose('paper-goods', '纸品与湿巾', 'paper-goods');
    nonFood = true;
  } else if (
    /\b(?:personal care|beauty|oral care|dental care|hair care|skin care|bath & body|cosmetics?|shaving|deodorants?|pharmacy|health & beauty|perfumes?|colognes?|eau de (?:parfum|toilette))\b/.test(sourceTaxonomy) ||
    /\b(?:shampoo|conditioner|toothpaste|toothbrush|deodorant|razors?|skin care|cosmetics?|body wash|body lotions?|body creams?|body butter|body moisturizers?|hand creams?|foot creams?|hand lotions?|foot lotions?|hand moisturizers?|foot moisturizers?|facial moisturizers?|moisturizing creams?|moisturizing lotions?|lip balms?|lip masks?|perfumes?|colognes?|eau de (?:parfum|toilette))\b/.test(title)
  ) {
    choose('personal-care', '个护', 'personal-care');
    nonFood = true;
  } else if (
    /\b(?:clothing|apparel|fashion|footwear|women'?s clothing|men'?s clothing|outerwear|activewear|socks|underwear|sleepwear|shoes)\b/.test(sourceTaxonomy)
  ) {
    choose('clothing', '服饰', 'clothing');
    nonFood = true;
  } else if (
    /\b(?:home|household essentials|household storage|kitchen & dining|kitchen appliances|cookware|kitchen storage|bath|bedding|furniture|storage & organization|garage storage|deck storage|outdoor storage|mattresses|home décor|home improvement)\b/.test(homeCategoryTaxonomy) ||
    /\b(?:cookware|bed sheets|mattress|storage bins?|storage totes?|storage cabinets?|kitchen appliances?|bath towels?|garage shelving|wall hooks?|utility carts?|outdoor trash cans?)\b/.test(title) ||
    (/\bcommand\b/.test(title) && /\bhooks?\b/.test(title))
  ) {
    choose('home', '家居', 'home');
    nonFood = true;
  } else if (/\b(?:beverages?|drinks?|coffee|tea|cocoa|water|juice|soda|drink mixes?)\b/.test(sourceLabels)) {
    choose('beverages', '饮料咖啡', 'beverages');
  } else if (
    !/\bfrozen\b/.test(sourceTaxonomy) &&
    /\b(?:snacks?|cand(?:y|ies)|chocolates?|chips?|popcorn|cookies?|crackers?|pretzels?|gums?|mints?)\b/.test(sourceLabels)
  ) {
    choose('snacks', '零食糖果', 'snacks');
  // Classify prepared powders and shelf products before matching meat terms;
  // a name such as “beef bone broth powder” is pantry food, not raw meat.
  } else if (/\b(?:bone broth|broth powder|bouillon|stock powder)\b/.test(title)) {
    choose('pantry', '粮油调味', 'pantry');
  } else if (/\b(?:protein powder|nutrition powder|collagen|dietary supplement)\b/.test(title)) {
    choose('supplements', '营养补充', 'supplements');
  } else if (/\b(?:jerky|snack sticks|beef sticks|pork sticks)\b/.test(title)) {
    choose('snacks', '零食肉干', 'snacks');
  } else if (
    /\b(?:fish sauce|oyster sauce|shrimp paste|anchovy paste|shrimp sauce)\b/.test(title) ||
    /\b(?:seasonings?|spices?|salt|sauces?|condiments?|oil|oils|vinegar|dressings?|salsa|ketchup|mustard|mayonnaise|marinade)\b/.test(sourceTaxonomy)
  ) {
    choose('seasoning', '调味', 'seasoning');
  } else if (
    sourcePath.length &&
    /\b(?:pantry|baking(?: goods?)?|ingredients?|rice|pasta|grains?|beans?|flours?|oats?|cereal|soups?|broth|canned)\b/.test(sourceTaxonomy)
  ) {
    // Pantry families sit above specific leaves such as sweeteners, baking
    // staples, and crystallized citrus packets in Sam’s Club PDP breadcrumbs.
    choose('pantry', '粮油调味', 'pantry');
  } else if (
    frozenFoodSignal &&
    !/\b(?:meat|poultry|seafood|fish|chicken|beef|pork|lamb|turkey)\b/.test(sourceTaxonomy + ' ' + title)
  ) {
    choose('frozen', '冷冻食品', 'frozen');
  } else if (
    /\b(?:salmon|shrimp|fish|crab|lobster|scallop|seafood|tuna|cod|tilapia|halibut|oyster|trout)\b/.test(specific) ||
    (/seafood/.test(leaf) && !/\b(?:chicken|beef|pork|turkey|brisket|steak|burger)\b/.test(title))
  ) {
    choose('seafood', '水产', 'seafood');
    processingGroup = /\b(?:fully cooked|cooked|ready to eat|smoked)\b/.test(title) ? 'prepared' : 'raw';
  } else if (
    /\b(?:meat|poultry|chicken|beef|pork|turkey|lamb|mutton|steak|sausage|brisket|burger|bacon|hot dogs?)\b/.test(specific) ||
    /\b(?:meat|poultry|beef|pork|chicken|turkey|lamb|mutton)\b/.test(leaf)
  ) {
    choose('meat', '肉禽', 'meat');
    processingGroup = /\b(?:fully cooked|cooked|ready to eat|rotisserie|smoked)\b/.test(title)
      ? 'prepared'
      : 'raw';
  } else if (/\b(?:dairy|eggs?|cheese|milk|butter|yogurt)\b/.test(specific)) {
    choose('dairy', '乳品蛋类', 'dairy');
  } else if (/\b(?:bakery|breads?|buns?|rolls?|bagels?|cakes?|croissants?|pastries?|muffins?)\b/.test(sourceTaxonomy + ' ' + specific)) {
    choose('bakery', '烘焙', 'bakery');
  } else if (
    /\b(?:deli|prepared meals?|rotisserie)\b/.test(sourcePathText) ||
    (!sourcePath.length && /\b(?:deli|prepared meals?|rotisserie)\b/.test(local + ' ' + title))
  ) {
    choose('deli', '熟食', 'deli');
  } else if (titleFruit.test(title)) {
    choose('fruit', '水果', 'produce');
  } else if (titleVegetable.test(title)) {
    // “Produce” and “Fresh Fruit & Vegetables” are mixed PDP labels. Infer the
    // leaf only from the product subject, never from the mixed label itself.
    choose('vegetables', '蔬菜', 'produce');
  } else if (/\bfrozen\b/.test(leaf + ' ' + title)) {
    choose('frozen', '冷冻食品', 'frozen');
  } else if (
    /\b(?:seasonings?|spices?|salt|sauces?|condiments?|oil|oils|vinegar|dressings?|salsa|ketchup|mustard|mayonnaise|marinade)\b/.test(sourceLabels)
  ) {
    choose('seasoning', '调味', 'seasoning');
  } else if (
    /\b(?:pantry|baking(?: goods?)?|ingredients?|rice|pasta|grains?|beans?|flours?|oats?|cereal|soups?|broth|canned)\b/.test(sourceLabels)
  ) {
    choose('pantry', '粮油调味', 'pantry');
  } else if (/\b(?:snacks?|candy|chocolate|chips?|popcorn)\b/.test(sourceLabels)) {
    choose('snacks', '零食糖果', 'snacks');
  } else if (
    /\b(?:seasonings?|spices?|salt|sauces?|condiments?|oil|oils|vinegar|dressings?|salsa|ketchup|mustard|mayonnaise|marinade)\b/.test(title)
  ) {
    choose('seasoning', '调味', 'seasoning');
  } else if (/\b(?:snacks?|candy|chocolate|chips?|popcorn)\b/.test(title)) {
    choose('snacks', '零食糖果', 'snacks');
  } else if (/\b(?:beverages?|drinks?|coffee|tea|water|juice|soda)\b/.test(sourceLabels + ' ' + title)) {
    choose('beverages', '饮料咖啡', 'beverages');
  } else if (
    /\b(?:pantry|baking(?: goods?)?|ingredients?|rice|pasta|grains?|beans?|flours?|oats?|cereal|soups?|broth|canned)\b/.test(title)
  ) {
    choose('pantry', '粮油调味', 'pantry');
  }

  // Some public category IDs carry useful taxonomy when their translated label is
  // too short to classify (for example, “Smart Pet” and numeric-only Cookies).
  if (family === 'other') {
    const sourceCategoryId = String(node.categoryId || rawProduct?.category?.id || '');
    const sourceCategoryFallbacks = {
      '3450119': ['pet', '宠物食品与用品', 'pet', true],
      '1464': ['snacks', '零食糖果', 'snacks', false],
    };
    const fallback = sourceCategoryFallbacks[sourceCategoryId];
    if (fallback) {
      choose(fallback[0], fallback[1], fallback[2]);
      nonFood = fallback[3];
    }
  }

  const specificationText = (specifications || []).join(' ').toLowerCase();
  const coldChoiceSpecified = /keep refrigerated or frozen|refrigerate or freeze/.test(specificationText);
  const foodFamily = ['meat', 'seafood', 'dairy', 'bakery', 'deli', 'produce', 'pantry', 'seasoning', 'snacks', 'beverages'].includes(family);
  const officialPetFood = family === 'pet' && /\b(?:pet food|dog food|cat food)\b/.test(sourceTaxonomy);
  const officialBabyFood = family === 'baby' && /\b(?:baby food|infant food|infant formula|baby formula)\b/.test(sourceTaxonomy);
  const nameExplicitlyFrozen = frozenWord.test(title) &&
    (foodFamily || officialPetFood || officialBabyFood || (family === 'frozen' && frozenFoodSignal));
  const frozenThemeToy = frozenWord.test(title + ' ' + sourceTaxonomy) &&
    /\b(?:toys?|dolls?|playsets?|costumes?)\b/.test(title + ' ' + sourceTaxonomy);
  let storageCondition = 'unknown';
  if (nameExplicitlyFrozen) {
    storageCondition = 'frozen-confirmed';
  } else if (coldChoiceSpecified) {
    storageCondition = 'chilled-or-frozen-confirmed';
  } else if (/keep frozen|store frozen/.test(specificationText)) {
    storageCondition = 'frozen-confirmed';
  } else if (/keep refrigerated/.test(specificationText)) {
    storageCondition = 'chilled-confirmed';
  } else if (
    nonFood || frozenThemeToy ||
    (['bakery', 'snacks', 'beverages', 'pantry', 'seasoning', 'supplements'].includes(family) &&
      /\b(?:bakery|snacks?|beverages?|pantry|coffee|tea|cocoa|candy|seasonings?|spices?|oil|vinegar|sauce|condiments?|rice|pasta|grain|beans|canned|shelf[- ]stable|room temperature|ambient)\b/.test(
        sourceTaxonomy + ' ' + title,
      ))
  ) {
    storageCondition = 'ambient-likely';
  }
  let displayGroup = 'unclassified-review';
  if (nonFood) displayGroup = 'non-food-' + family;
  else if (storageCondition === 'chilled-confirmed')
    displayGroup = 'chilled-' + family + (processingGroup ? '-' + processingGroup : '');
  else if (storageCondition === 'frozen-confirmed') {
    displayGroup = family === 'frozen'
      ? /\b(?:ice cream|sorbet|gelato|frozen yogurt|dessert)\b/.test(title)
        ? 'freezer-dessert'
        : 'freezer-savory'
      : 'frozen-' + family + (processingGroup ? '-' + processingGroup : '');
  }
  else if (storageCondition === 'ambient-likely') displayGroup = 'ambient-' + family;
  else if (family !== 'other')
    displayGroup = 'review-' + family + (processingGroup ? '-' + processingGroup : '');
  return { category, categoryName, storageCondition, displayGroup, nonFood };
}

function packageInfo(name, specifications, shortDescription) {
  const text = [name, ...specifications, shortDescription || ''].join(' ');
  const match = text.match(/(\d+(?:\.\d+)?)\s*(fl\s*oz|fluid\s*ounces?|oz|ounces?|lbs?|pounds?|kg|g|ml|liters?|litres?)\b/i);
  if (match) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase().replace(/\s+/g, ' ');
    if (unit.startsWith('fl') || unit.startsWith('fluid')) return { quantity: Math.round(amount * 29.5735), unit: 'ml' };
    if (unit === 'oz' || unit.startsWith('ounce')) return { quantity: Math.round(amount * 28.3495), unit: 'g' };
    if (unit === 'lb' || unit === 'lbs' || unit.startsWith('pound')) return { quantity: Math.round(amount * 453.592), unit: 'g' };
    if (unit === 'kg') return { quantity: Math.round(amount * 1000), unit: 'g' };
    if (unit === 'g') return { quantity: Math.round(amount), unit: 'g' };
    if (unit === 'ml') return { quantity: Math.round(amount), unit: 'ml' };
    if (unit.startsWith('liter') || unit.startsWith('litre')) return { quantity: Math.round(amount * 1000), unit: 'ml' };
  }
  const count = text.match(/(\d+)\s*(?:count|ct|pieces?|pcs)\b/i);
  return count ? { quantity: Number(count[1]), unit: 'piece' } : { quantity: 1, unit: 'package' };
}

function displayUnit(name, sourceText) {
  const text = (String(name || '') + ' ' + String(sourceText || '')).toLowerCase();
  if (/\b(?:bottle|jug|carafe)\b/.test(text)) return '瓶';
  if (/\b(?:jar|can|tub|tin)\b/.test(text)) return '罐';
  if (/\b(?:carton|box)\b/.test(text)) return '盒';
  if (/\b(?:bag|pouch|sack)\b/.test(text)) return '袋';
  if (/\btray\b/.test(text)) return '盘';
  if (/\b(?:pack|case|package)\b/.test(text)) return '包';
  return '件';
}

export function toCatalogRecord(parsed, candidate, node, capturedAt, rawData) {
  const product = parsed.product;
  const rawProduct = rawData?.product;
  const idml = rawData?.idml || {};
  const priceQuotes = parsed.prices.map((quote) => ({
    price: quote.price,
    currency: quote.currency || 'USD',
    channel: quote.channel,
    clubId: quote.club_id || null,
    clubName: quote.club_name || null,
    city: quote.city || null,
    capturedAt: quote.captured_at || capturedAt,
    unitPriceText: quote.unit_price_text || null,
    finalCostByWeight: quote.final_cost_by_weight === true,
  }));
  const selected = parsed.prices.find((quote) => quote.selected_channel) || parsed.prices[0];
  const textPrice = String(candidate.listing_price || '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/)?.[1];
  const introHtml = idml.longDescription || idml.shortDescription || rawProduct?.shortDescription || '';
  const summaryHtml = rawProduct?.shortDescription || idml.shortDescription || '';
  const highlights = [];
  for (const match of String(summaryHtml).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const item = plainText(match[1]);
    if (item && !highlights.includes(item)) highlights.push(item);
  }
  if (!highlights.length) {
    for (const item of idml.productHighlights || []) {
      const value = plainText(item?.value);
      if (value && !highlights.includes(value)) highlights.push(value);
    }
  }
  const specifications = [];
  for (const section of idml.specifications || []) {
    for (const line of plainLines(section?.value || section?.name || '')) {
      if (!specifications.includes(line)) specifications.push(line);
    }
  }
  if (!specifications.length) {
    for (const line of product.specifications || []) {
      const text = typeof line === 'string' ? plainText(line) : plainText(line?.value || line?.name);
      if (text && !specifications.includes(text)) specifications.push(text);
    }
  }
  const category = classify(parsed, node, rawProduct, specifications);
  const name = product.product_name;
  const brand = product.brand || null;
  const itemId = product.item_id;
  const sourcePageId = String(
    rawProduct?.usItemId || candidate.pageId || candidate.sourcePageId ||
      new URL(candidate.product_url).pathname.split('/').filter(Boolean).at(-1),
  );
  const finalCostByWeight = selected?.final_cost_by_weight === true;
  const packageSize = finalCostByWeight
    ? { quantity: 1, unit: 'package' }
    : packageInfo(name, specifications, summaryHtml);
  return {
    itemId,
    sourcePageId,
    originalName: name,
    name,
    category: category.category,
    categoryName: category.categoryName,
    storageCondition: category.storageCondition,
    displayGroup: category.displayGroup,
    unit: finalCostByWeight ? '份（估重）' : displayUnit(name, summaryHtml),
    packageSize,
    description: plainText(summaryHtml) || name,
    barcode: product.barcode || null,
    brand,
    sourceUrl: candidate.product_url,
    capturedAt,
    price: selected?.price ?? (textPrice ? Number(textPrice) : 0),
    selectedChannel: selected?.channel || '',
    clubId: selected?.club_id || null,
    finalCostByWeight,
    gallery: [],
    introduction: plainText(introHtml) || plainText(summaryHtml) || name,
    introductionIsSummary: !idml.longDescription,
    highlights,
    specifications,
    prices: priceQuotes,
  };
}

async function ensureDerived(file, inputFile, dimensions, existingAudit) {
  if (await exists(file)) {
    const metadata = await sharp(await fs.readFile(file)).metadata();
    if (!metadata.width || !metadata.height) throw new Error('Existing derived image is invalid: ' + file);
    return { width: metadata.width, height: metadata.height, preserved: true };
  }
  const temporary = file + '.part';
  await sharp(await fs.readFile(inputFile))
    .resize(dimensions, dimensions, { fit: 'contain', background: '#ffffff' })
    .jpeg({ quality: 92 })
    .toFile(temporary);
  await fs.rename(temporary, file);
  if (existingAudit) await writeJson(file + '.source.json', existingAudit);
  return { width: dimensions, height: dimensions, preserved: false };
}

export async function saveGalleryImage(itemId, image, options) {
  const folder = path.join(IMAGE_ROOT, itemId);
  await fs.mkdir(folder, { recursive: true });
  const index = String(image.image_index).padStart(2, '0');
  const jpgFile = path.join(folder, index + '.jpg');
  const auditFile = jpgFile + '.http.json';
  let sourceAudit;
  if (await exists(jpgFile)) {
    if (!(await exists(auditFile)))
      throw new Error('Refusing to overwrite or reuse an image without source provenance: ' + jpgFile);
    sourceAudit = JSON.parse(await fs.readFile(auditFile, 'utf8'));
    if (sourceAudit.url !== image.image_url || sourceAudit.status !== 200)
      throw new Error('Existing gallery image provenance mismatch: ' + jpgFile);
  } else {
    if (options.offline) throw new Error('Missing offline gallery image: ' + jpgFile);
    const temporary = jpgFile + '.download';
    try {
    const fetched = await fetchWithFallback(image.image_url, temporary, 'image', options);
      sourceAudit = fetched.audit;
      const metadata = await sharp(fetched.body).metadata();
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp'].includes(metadata.format))
        throw new Error('Downloaded file is not a supported decodable image.');
      await sharp(fetched.body).resize({ width: 16, height: 16, fit: 'inside' }).raw().toBuffer();
      const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
      if (metadata.format === 'jpeg') {
        await fs.rename(temporary, jpgFile);
      } else {
        const original = path.join(folder, index + '-original.' + extension);
        if (await exists(original))
          throw new Error('Refusing to overwrite an existing original image: ' + original);
        await fs.rename(temporary, original);
        await sharp(await fs.readFile(original)).jpeg({ quality: 95 }).toFile(jpgFile + '.part');
        await fs.rename(jpgFile + '.part', jpgFile);
        sourceAudit.original_file = path.relative(ROOT, original);
      }
      sourceAudit.width = metadata.width;
      sourceAudit.height = metadata.height;
      sourceAudit.format = metadata.format;
      sourceAudit.byte_size = fetched.body.length;
      sourceAudit.requested_width = 2000;
      sourceAudit.requested_height = 2000;
      sourceAudit.meets_2000_both_axes = metadata.width >= 2000 && metadata.height >= 2000;
      await writeJson(auditFile, sourceAudit);
    } finally {
      await fs.rm(temporary, { force: true });
      await fs.rm(temporary + '.http.json', { force: true });
    }
  }
  const metadata = await sharp(await fs.readFile(jpgFile)).metadata();
  const thumbFile = path.join(folder, 'thumb-' + index + '.jpg');
  await ensureDerived(thumbFile, jpgFile, 160);
  return {
    url: '/images/samsclub/' + itemId + '/' + index + '.jpg',
    thumbnailUrl: '/images/samsclub/' + itemId + '/thumb-' + index + '.jpg',
    sourceUrl: image.source_image_url,
    width: metadata.width,
    height: metadata.height,
  };
}

export async function ensureCard(itemId) {
  const folder = path.join(IMAGE_ROOT, itemId);
  return ensureDerived(path.join(folder, 'card.jpg'), path.join(folder, '00.jpg'), 640);
}

async function updateSummary(directory, summary) {
  summary.updated_at = new Date().toISOString();
  await writeJson(path.join(directory, 'summary.json'), summary);
}

function pageUrl(baseUrl, pageNo) {
  const url = new URL(baseUrl);
  if (pageNo > 1) url.searchParams.set('page', String(pageNo));
  return url.toString();
}

async function discover(options, summary) {
  const pageDir = path.join(options.out, 'html', 'categories');
  await fs.mkdir(pageDir, { recursive: true });
  const roots = options.category
    ? [{ url: options.category, label: 'User-selected category', depth: 0, discoveredFrom: 'user-selected category' }]
    : [
        { url: GROCERY_ROOT, label: 'Grocery', depth: 0, discoveredFrom: 'public Sam’s Club Grocery navigation' },
        { url: DEFAULT_CATEGORY, label: 'Member’s Mark Fresh Foods & Bakery', depth: 1, discoveredFrom: 'user-selected category' },
      ];
  const queue = [...roots];
  const visited = new Map();
  const planned = new Map();
  let blocked = false;
  while (queue.length && !blocked) {
    const node = queue.shift();
    const key = new URL(node.url).pathname;
    if (visited.has(key)) continue;
    const filename = path.join(pageDir, safeFileName(new URL(node.url)));
    try {
      await sleep(600);
      const result = await fetchWithFallback(node.url, filename, 'html', options);
      const html = result.body.toString('utf8');
      const snapshot = categorySnapshot(html, new URL(node.url));
      const completeNode = {
        ...node,
        categoryId: node.categoryId || categoryIdentity(new URL(node.url)),
        title: publicPageTitle(html),
        status: 'fetched',
        candidatesOnFirstPage: snapshot?.candidates.length || 0,
        page: snapshot?.page || null,
        maxPage: snapshot?.maxPage || null,
        pageSize: snapshot?.pageSize || null,
        totalCount: snapshot?.totalCount || null,
      };
      visited.set(key, completeNode);
      planned.set(key, completeNode);
      await writeJson(path.join(options.out, 'category-plan.json'), [...planned.values()]);
      if (node.depth < 2) {
        for (const child of navigationLinks(html, new URL(node.url))) {
          const childKey = new URL(child.url).pathname;
          if (visited.has(childKey) || planned.has(childKey)) continue;
          const childNode = {
            ...child,
            depth: node.depth + 1,
            discoveredFrom: node.url,
          };
          planned.set(childKey, childNode);
          queue.push(childNode);
        }
      }
      console.log(
        '[discover] ' +
          (completeNode.title || node.label) +
          ': ' +
          (snapshot ? snapshot.candidates.length + ' first-page candidates, ' + snapshot.maxPage + ' pages' : 'navigation page'),
      );
      await writeJson(path.join(options.out, 'category-plan.json'), [...planned.values()]);
    } catch (error) {
      summary.failures.push({ stage: 'category', url: node.url, error: error.message });
      if (error.blocked) {
        blocked = true;
        summary.stop_reason = error.message;
        summary.blocked_at = node.url;
      }
      const failed = { ...node, status: error.blocked ? 'blocked' : 'failed', error: error.message };
      planned.set(key, failed);
      await writeJson(path.join(options.out, 'category-plan.json'), [...planned.values()]);
      if (error.blocked) break;
    }
  }
  summary.categories_discovered = [...planned.values()].length;
  summary.categories_with_listing = [...planned.values()].filter((node) => node.maxPage).length;
  return { categories: [...planned.values()], blocked };
}

async function loadCategoryCandidates(node, options, summary) {
  const directory = path.join(options.out, 'html', 'categories');
  const firstFile = path.join(directory, safeFileName(new URL(node.url)));
  if (!(await exists(firstFile))) return [];
  const firstHtml = await fs.readFile(firstFile, 'utf8');
  const first = categorySnapshot(firstHtml, new URL(node.url));
  if (!first) return [];
  const collected = [...first.candidates];
  const maxPage = Math.min(first.maxPage, Math.ceil(options.limit / Math.max(first.pageSize, 1)));
  for (let page = 2; page <= maxPage; page++) {
    const url = pageUrl(node.url, page);
    const file = path.join(directory, safeFileName(new URL(node.url), page));
    try {
      await sleep(600);
      const result = await fetchWithFallback(url, file, 'html', options);
      const html = result.body.toString('utf8');
      const snapshot = categorySnapshot(html, new URL(url));
      if (!snapshot || snapshot.page !== page || snapshot.categoryId !== first.categoryId)
        throw new Error('Pagination identity did not match public page metadata.');
      collected.push(...snapshot.candidates);
    } catch (error) {
      summary.failures.push({ stage: 'category-page', url, error: error.message });
      if (error.blocked) {
        summary.stop_reason = error.message;
        summary.blocked_at = url;
        error.blocked = true;
      }
      throw error;
    }
  }
  const unique = new Map();
  for (const candidate of collected) {
    if (!unique.has(candidate.product_url)) unique.set(candidate.product_url, candidate);
  }
  const result = [...unique.values()].slice(0, options.limit);
  await writeJson(path.join(options.out, 'candidates-' + node.categoryId + '.json'), result);
  node.candidates = result.length;
  node.pageCountFetched = Math.min(first.maxPage, maxPage);
  node.totalCount = first.totalCount || node.totalCount;
  return result;
}

async function collectProduct(candidate, node, options, summary, seenItems, seenUrls) {
  if (seenUrls.has(candidate.product_url)) {
    summary.duplicates_by_source_url++;
    return null;
  }
  seenUrls.add(candidate.product_url);
  const detailFile = path.join(options.out, 'html', 'products', candidate.page_id + '.html');
  await sleep(600);
  const fetched = await fetchWithFallback(candidate.product_url, detailFile, 'html', options);
  const html = fetched.body.toString('utf8');
  const parsed = detailProduct(html, candidate, fetched.audit.captured_at);
  const itemId = parsed.product.item_id;
  if (seenItems.has(itemId)) {
    summary.duplicates_by_item_id++;
    return null;
  }
  const rawData = nextData(html)?.initialData?.data;
  const record = toCatalogRecord(parsed, candidate, node, fetched.audit.captured_at, rawData);
  const gallery = [];
  for (const image of parsed.images) {
    const saved = await saveGalleryImage(itemId, image, options);
    gallery.push(saved);
    summary.gallery_images_downloaded++;
    if (!options.offline) await sleep(250);
    await updateSummary(options.out, summary);
  }
  if (!gallery.length) throw new Error('No main-product allImages gallery was available.');
  record.gallery = gallery;
  await ensureCard(itemId);
  const inserted = await appendCatalogRecord(record);
  if (!inserted.added) {
    if (inserted.reason === 'item-id-already-present') summary.duplicates_by_item_id++;
    else summary.duplicates_by_source_url++;
    return null;
  }
  seenItems.add(itemId);
  summary.products_added++;
  summary.price_observations_added += record.prices.length;
  console.log(
    '[product] ' + record.categoryName + ' · Item # ' + itemId + ' · ' + record.gallery.length + ' images · ' + record.name,
  );
  await updateSummary(options.out, summary);
  return record;
}

async function runCollection(options) {
  if (options.offline && options.refresh)
    throw new Error('--offline and --refresh cannot be combined.');
  await fs.mkdir(options.out, { recursive: true });
  const summaryFile = path.join(options.out, 'summary.json');
  const summary = (await exists(summaryFile))
    ? JSON.parse(await fs.readFile(summaryFile, 'utf8'))
    : {
        started_at: new Date().toISOString(),
        category_url: options.category || DEFAULT_CATEGORY,
        per_category_limit: options.limit,
        transport: options.browser
          ? 'ordinary public HTTPS; Chrome visible manual-verification fallback after a challenge; no private APIs'
          : 'ordinary public HTTPS HTML and image requests; no browser, credentials, or private APIs',
        categories_discovered: 0,
        categories_with_listing: 0,
        products_added: 0,
        gallery_images_downloaded: 0,
        price_observations_added: 0,
        duplicates_by_item_id: 0,
        duplicates_by_source_url: 0,
        failures: [],
      };
  const catalog = await loadCatalog();
  const seenItems = new Set(catalog.map((record) => String(record.itemId)));
  const seenUrls = new Set(catalog.map((record) => record.sourceUrl));
  const planFile = path.join(options.out, 'category-plan.json');
  let discovery;
  if (!options.refresh && !options.browser && (await exists(planFile))) {
    discovery = { categories: JSON.parse(await fs.readFile(planFile, 'utf8')), blocked: false };
    console.log('[resume] loaded ' + discovery.categories.length + ' categories from saved plan');
  } else {
    discovery = await discover(options, summary);
  }
  if (options.discoverOnly) {
    await updateSummary(options.out, summary);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  let stopped = discovery.blocked;
  for (const node of discovery.categories) {
    if (stopped || node.status === 'blocked') break;
    if (node.status === 'failed') {
      summary.failures.push({
        stage: 'category-skipped',
        url: node.url,
        error: node.error || 'Public category page was unavailable.',
      });
      continue;
    }
    let candidates;
    try {
      candidates = await loadCategoryCandidates(node, options, summary);
    } catch (error) {
      if (error.blocked) {
        stopped = true;
        break;
      }
      continue;
    }
    if (!candidates.length) continue;
    summary.category_candidate_counts ||= {};
    summary.category_candidate_counts[node.categoryId] = candidates.length;
    await writeJson(path.join(options.out, 'category-plan.json'), discovery.categories);
    await updateSummary(options.out, summary);
    for (const [index, candidate] of candidates.entries()) {
      if (stopped) break;
      try {
        const record = await collectProduct(candidate, node, options, summary, seenItems, seenUrls);
        if (record) {
          summary.last_success = {
            item_id: record.itemId,
            category_id: node.categoryId,
            source_url: record.sourceUrl,
            captured_at: record.capturedAt,
          };
        }
        console.log(
          '[queue] ' + node.categoryId + ' ' + (index + 1) + '/' + candidates.length +
            ' · added ' + summary.products_added,
        );
      } catch (error) {
        summary.failures.push({
          stage: error.blocked ? 'access-challenge' : 'product',
          category_id: node.categoryId,
          product_url: candidate.product_url,
          error: error.message,
        });
        if (error.blocked) {
          stopped = true;
          summary.stop_reason = error.message;
          summary.blocked_at = candidate.product_url;
          console.error('Stopped on public access challenge. No retry or bypass will be attempted.');
          break;
        }
      }
      await updateSummary(options.out, summary);
    }
  }
  summary.completed_at = new Date().toISOString();
  summary.complete = !stopped && discovery.categories.every((node) => !node.status || node.status === 'fetched');
  summary.remaining_note = stopped
    ? 'Stopped after an access challenge. Keep this output directory and resume only after Sam’s Club access is available again.'
    : 'Collection covered publicly discovered category pages up to the per-category cap.';
  await updateSummary(options.out, summary);
  console.log(JSON.stringify(summary, null, 2));
  if (stopped) process.exitCode = 2;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) return;
  if (!options.browser) return runCollection(options);
  const browser = await chromium.launch({ channel: 'chrome', headless: false });
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  options.browserContext = browserContext;
  options.browserPage = await browserContext.newPage();
  options.terminal = createInterface({ input: stdin, output: stdout });
  console.log('Opened a separate Chrome collection window for public Sam’s Club pages.');
  try {
    await runCollection(options);
  } finally {
    options.terminal.close();
    await browser.close();
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
