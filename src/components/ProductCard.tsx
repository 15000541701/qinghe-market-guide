import { ArrowUpRight, Check, MapPin, Plus } from 'lucide-react';
import { categoryLabels } from '../../shared/catalog';
import type { Product } from '../../shared/types';
import { money } from '../lib';

export default function ProductCard({
  product,
  onAdd,
  onNavigate,
  added,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  onNavigate: (p: Product) => void;
  added?: boolean;
}) {
  return (
    <article className="product-card">
      <div className="product-photo">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden';
          }}
        />
        <span className="product-label">{product.tags[0] || '门店商品'}</span>
        <button
          className={`add-product ${added ? 'added' : ''}`}
          onClick={() => onAdd(product)}
          aria-label={`将${product.name}加入购物清单`}
        >
          {added ? <Check size={18} /> : <Plus size={18} />}
        </button>
      </div>
      <div className="product-copy">
        <span className="product-location">
          <MapPin size={12} />
          {categoryLabels[product.category]} · {product.shelf}
        </span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-bottom">
          <span className="price">
            <small>¥</small>
            {money(product.price)}
            <span>/{product.unit}</span>
          </span>
          <button
            className="text-button"
            onClick={() => onNavigate(product)}
            disabled={!product.stock}
          >
            带我去
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}
