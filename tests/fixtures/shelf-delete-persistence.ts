import {
  getProducts,
  getProduct,
  getShelves,
  saveShelvesAndProductsAtomically,
} from '../../server/db';
import { applyPlacement, unplaced } from '../../shared/placement';
if (!process.env.DATA_DIR?.includes('qinghe-shelf-persistence-'))
  throw new Error('Temporary test database required');
if (process.argv[2] === 'remove') {
  const product = getProducts().find(
    (item) =>
      item.sourceRetailer === 'Sam’s Club US' &&
      item.merchandisingState === 'placed' &&
      item.shelfId,
  )!;
  const shelf = getShelves().find((item) => item.id === product.shelfId)!;
  const installed = getProducts().filter(
    (item) => item.status !== 'archived' && item.shelfId === shelf.id,
  );
  const pending = installed.map((item) => ({
    ...applyPlacement(item, unplaced(), []),
    manualPlacement: true,
  }));
  saveShelvesAndProductsAtomically(
    [{ ...shelf, deleted: true, layoutRevision: (shelf.layoutRevision || 0) + 1 }],
    pending,
  );
  process.stdout.write(
    JSON.stringify({
      id: shelf.id,
      products: installed.map((item) => ({ id: item.id, price: item.price, stock: item.stock })),
    }),
  );
} else {
  const expected = JSON.parse(process.argv[3]);
  process.stdout.write(
    JSON.stringify({
      visible: getShelves().some((item) => item.id === expected.id),
      deleted: getShelves(true).find((item) => item.id === expected.id)?.deleted,
      products: expected.products.map((item: { id: string }) => {
        const product = getProduct(item.id)!;
        return {
          id: product.id,
          price: product.price,
          stock: product.stock,
          placement: product.shelfId || null,
          manual: product.manualPlacement,
        };
      }),
    }),
  );
}
