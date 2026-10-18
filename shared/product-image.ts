export function validProductImage(value: string) {
  if (/^\/images\/samsclub\/\d+\/(?:card|\d{2}|thumb-\d{2})\.jpg$/.test(value)) return true;
  if (/^\/(?:images\/[a-z0-9-]+\.(?:jpg|svg)|uploads\/[a-f0-9-]+\.jpg)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (/^img\d+\.360buyimg\.com$/.test(url.hostname) ||
        url.hostname === 'images.openfoodfacts.net' ||
        url.hostname === 'images.openfoodfacts.org' ||
        /^i\d+\.samsclubimages\.com$/.test(url.hostname)) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export type ProductImageSize = 'card' | 'list' | 'map' | 'admin';

const offProductImagePath =
  /^\/images\/products\/(?:\d{3}\/){3}\d{4}\/[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?:jpe?g|png|webp)$/i;

export function isOfficialOpenFoodFactsImage(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'images.openfoodfacts.org' &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      offProductImagePath.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** OFF image-size variants are presentation URLs; the product's stored source stays intact. */
export function productImageVariantUrl(value: string, size: ProductImageSize): string {
  if (size === 'card' || !isOfficialOpenFoodFactsImage(value)) return value;
  const url = new URL(value);
  if (!/\.400\.(?:jpe?g|png|webp)$/i.test(url.pathname)) return value;
  url.pathname = url.pathname.replace(/\.400\.(jpe?g|png|webp)$/i, '.200.$1');
  return url.toString();
}

export function productImageRequestUrl(value: string, size: ProductImageSize): string {
  if (!isOfficialOpenFoodFactsImage(value)) return productImageVariantUrl(value, size);
  // All UI contexts share the same canonical 200px cache entry.
  return `/api/product-image?src=${encodeURIComponent(value)}&size=map`;
}
