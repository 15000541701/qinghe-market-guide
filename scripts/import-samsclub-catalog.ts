import { db, getProducts } from '../server/db';

// db.ts imports newly collected Item # records in one transaction and preserves existing edits.
try {
  const products = getProducts();
  const samsClub = products.filter((product) => product.sourceRetailer === 'Sam’s Club US');
  const onSale = samsClub.filter((product) => product.status !== 'archived');
  const categories = onSale.reduce<Record<string, number>>((counts, product) => {
    counts[product.category] = (counts[product.category] || 0) + 1;
    return counts;
  }, {});
  console.log(JSON.stringify({
    totalProducts: products.length,
    samsClubProducts: samsClub.length,
    otherProducts: products.length - samsClub.length,
    archived: samsClub.length - onSale.length,
    placed: onSale.filter((product) => product.merchandisingState === 'placed').length,
    awaitingPlacement: onSale.filter((product) => product.merchandisingState !== 'placed').length,
    categories,
  }, null, 2));
} finally {
  db.close();
}
