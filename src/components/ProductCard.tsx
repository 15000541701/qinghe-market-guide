import { ArrowUpRight, Check, MapPin, Plus } from 'lucide-react';
import { categoryLabels } from '../../shared/catalog';
import type { Product } from '../../shared/types';
import { money } from '../lib';
import { productLocationLabel } from '../../shared/layout';
import { availableForSale } from '../../shared/catalog-status';
import { currencySymbol, productCurrency } from '../../shared/currency';
import ProductImage from './ProductImage';
import {
  productCategoryLabel,
  productHasNavigableShelf,
  productMerchandisingSummary,
  productPlacementStatus,
} from '../../shared/merchandising-display';

export default function ProductCard({
  product,
  categoryLabel,
  onAdd,
  onNavigate,
  onView,
  added,
  priority = false,
}: {
  product: Product;
  categoryLabel?: string;
  onAdd: (p: Product) => void;
  onNavigate: (p: Product) => void;
  onView: (p: Product) => void;
  added?: boolean;
  priority?: boolean;
}) {
  const canNavigate = productHasNavigableShelf(product);
  return (
    <article
      className={`product-card ${product.priceOrigin === 'samsclub' ? 'product-card--samsclub' : ''}`}
    >
      <div className="product-photo">
        <button
          className="product-photo-link"
          onClick={() => onView(product)}
          aria-label={`查看${product.name}详情`}
        />
        <ProductImage
          src={product.image}
          fallbackSrc={product.sourceImageUrl}
          alt={product.name}
          size="card"
          priority={priority}
        />
        <span className="product-label">{product.tags[0] || '门店商品'}</span>
        <button
          className={`add-product ${added ? 'added' : ''}`}
          onClick={() => onAdd(product)}
          disabled={!availableForSale(product)}
          aria-label={`将${product.name}加入购物清单`}
        >
          {added ? <Check size={18} /> : <Plus size={18} />}
        </button>
      </div>
      <div className="product-copy">
        <span className="product-location">
          <MapPin size={12} />
          {categoryLabel ||
            productCategoryLabel(
              product,
              [],
              categoryLabels[product.category] || product.category,
            )}{' '}
          · {canNavigate ? productLocationLabel(product) : '陈列位置待确认'}
        </span>
        <h3>
          <button className="product-title-link" onClick={() => onView(product)}>
            {product.name}
          </button>
        </h3>
        {productMerchandisingSummary(product) && (
          <p className="product-merchandising-status">{productMerchandisingSummary(product)}</p>
        )}
        {product.priceOrigin === 'open-prices' ? null : <p>{product.description}</p>}
        <div className="product-bottom">
          <span className="price">
            <small>{product.price > 0 ? currencySymbol(productCurrency(product)) : ''}</small>
            {product.price > 0 ? money(product.price) : '报价暂未获取'}
            <span>/{product.unit}</span>
          </span>
          <button
            className="text-button"
            onClick={() => onNavigate(product)}
            disabled={!canNavigate || product.status === 'archived'}
          >
            {canNavigate ? (
              <>
                带我去
                <ArrowUpRight size={15} />
              </>
            ) : (
              productPlacementStatus(product) || '待安排陈列'
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
