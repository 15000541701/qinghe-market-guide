import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MapPin,
  Plus,
} from 'lucide-react';
import type { Product, ProductDetailResponse } from '../../shared/types';
import { api, money } from '../lib';
import { currencySymbol, productCurrency } from '../../shared/currency';
import { availableForSale } from '../../shared/catalog-status';
import { productHasNavigableShelf } from '../../shared/merchandising-display';
import { productLocationLabel } from '../../shared/layout';
import './ProductDetail.css';

const channelName = (channel: string) =>
  ({ PICKUP: '门店自提', DELIVERY: '门店配送', SHIPPING: '快递配送' })[channel] || '页面报价';
const dateLabel = (value: string) =>
  new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });

export default function ProductDetail({
  id,
  onBack,
  onAdd,
  onNavigate,
  added,
}: {
  id: string;
  onBack: () => void;
  onAdd: (product: Product) => void;
  onNavigate: (product: Product) => void;
  added: boolean;
}) {
  const [detail, setDetail] = useState<ProductDetailResponse | null>(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const touch = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null);
    setError('');
    setIndex(0);
    api<ProductDetailResponse>(`/products/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(setDetail)
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message || '商品暂时无法加载。');
      });
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    if (detail) heading.current?.focus({ preventScroll: true });
  }, [detail]);
  useEffect(() => setImageError(false), [index, id]);
  const product = detail?.product;
  const gallery = detail?.gallery || [];
  const current = gallery[index];
  const flip = (direction: number) =>
    setIndex((previous) => (previous + direction + gallery.length) % gallery.length);
  return (
    <main className="main-container product-detail-page">
      <button className="detail-back text-button" onClick={onBack}>
        <ArrowLeft size={17} />
        返回商品目录
      </button>
      {error ? (
        <div className="detail-state" role="alert">
          <h1>商品暂时无法查看</h1>
          <p>{error}</p>
        </div>
      ) : !product || !detail ? (
        <div className="detail-state" role="status">
          正在打开商品详情…
        </div>
      ) : (
        <>
          <div className="detail-layout">
            <section
              className="detail-gallery"
              aria-label="商品图片"
              onKeyDown={(event) => {
                if (gallery.length < 2) return;
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  flip(event.key === 'ArrowLeft' ? -1 : 1);
                }
              }}
            >
              <div
                className="detail-image-stage"
                onTouchStart={(event) => {
                  touch.current = event.touches[0].clientX;
                }}
                onTouchEnd={(event) => {
                  if (touch.current !== null && gallery.length > 1) {
                    const distance = event.changedTouches[0].clientX - touch.current;
                    if (Math.abs(distance) > 50) flip(distance > 0 ? -1 : 1);
                  }
                  touch.current = null;
                }}
              >
                {current && !imageError ? (
                  <img
                    key={current.url}
                    className="detail-main-image"
                    src={current.url}
                    alt={`${product.name} · 图片 ${index + 1}`}
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <p className="detail-image-empty">这张图片暂时无法显示，请查看其他图片。</p>
                )}
                {gallery.length > 1 && (
                  <>
                    <button
                      className="detail-image-arrow previous"
                      aria-label="上一张商品图片"
                      onClick={() => flip(-1)}
                    >
                      <ChevronLeft size={23} />
                    </button>
                    <button
                      className="detail-image-arrow next"
                      aria-label="下一张商品图片"
                      onClick={() => flip(1)}
                    >
                      <ChevronRight size={23} />
                    </button>
                  </>
                )}
                <span className="detail-image-count" aria-live="polite">
                  {gallery.length ? index + 1 : 0} / {gallery.length}
                </span>
              </div>
              {gallery.length > 1 && (
                <div className="detail-thumbnails" aria-label="选择商品图片">
                  {gallery.map((image, imageIndex) => (
                    <button
                      key={image.url}
                      className={index === imageIndex ? 'active' : ''}
                      aria-label={`查看第 ${imageIndex + 1} 张商品图片`}
                      aria-pressed={index === imageIndex}
                      onClick={() => setIndex(imageIndex)}
                    >
                      <img src={image.thumbnailUrl || image.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              {current && (
                <a
                  className="detail-original-image"
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  查看大图
                  <ExternalLink size={12} />
                </a>
              )}
            </section>
            <section className="detail-purchase">
              <div className="detail-eyebrow">
                {product.sourceRetailer || '青禾生活超市'}
                <span>{product.brand || '门店商品'}</span>
              </div>
              <h1 ref={heading} tabIndex={-1}>
                {product.name}
              </h1>
              {detail.originalName && (
                <p className="detail-original-name" lang="en">
                  {detail.originalName}
                </p>
              )}
              <p className="detail-description">{product.description}</p>
              <div className="detail-price-block">
                <span className="detail-price-label">
                  {product.priceOrigin === 'samsclub'
                    ? `来源参考价 · ${channelName(detail.selectedChannel || '')}`
                    : '商品价格'}
                </span>
                <div className="detail-price">
                  <small>{currencySymbol(productCurrency(product))}</small>
                  {money(product.price)}
                  <span> / {product.unit}</span>
                </div>
                {detail.finalCostByWeight && <p>称重商品 · 当前为页面估价，最终按实际重量结算</p>}
              </div>
              <dl className="detail-quick-facts">
                {product.sourceSku && (
                  <div>
                    <dt>Item #</dt>
                    <dd>{product.sourceSku}</dd>
                  </div>
                )}
                {product.barcode && (
                  <div>
                    <dt>商品条码</dt>
                    <dd>{product.barcode}</dd>
                  </div>
                )}
                <div>
                  <dt>门店位置</dt>
                  <dd>
                    {productHasNavigableShelf(product)
                      ? productLocationLabel(product)
                      : '待安排陈列'}
                  </dd>
                </div>
                <div>
                  <dt>库存</dt>
                  <dd>
                    {product.inventoryMode === 'untracked'
                      ? '未管理库存'
                      : `${product.stock} ${product.unit}`}
                    {product.priceOrigin === 'samsclub' && <small>演示门店库存</small>}
                  </dd>
                </div>
              </dl>
              <div className="detail-actions">
                <button
                  className="button primary"
                  onClick={() => onAdd(product)}
                  disabled={!availableForSale(product)}
                >
                  {added ? <Check size={18} /> : <Plus size={18} />}
                  {added ? '再加一件' : '加入购物清单'}
                </button>
                <button
                  className="button secondary"
                  onClick={() => onNavigate(product)}
                  disabled={!productHasNavigableShelf(product)}
                >
                  <MapPin size={17} />
                  带我去
                </button>
              </div>
              {product.sourceUrl && (
                <a
                  className="detail-source-link"
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  查看 {product.sourceRetailer || '原站'} 商品页面
                  <ExternalLink size={14} />
                </a>
              )}
            </section>
          </div>
          <div className="detail-information">
            <div className="detail-information-main">
              {(detail.introduction || detail.highlights.length > 0) && (
                <section className="detail-information-card">
                  <div className="detail-section-heading">
                    <span>01</span>
                    <h2>商品介绍</h2>
                  </div>
                  {detail.introduction && (
                    <p className="detail-source-intro" lang="en">
                      {detail.introduction}
                    </p>
                  )}
                  {detail.introductionIsSummary && (
                    <small className="muted">以上为原站介绍摘要；下方保留原站亮点与规格。</small>
                  )}
                  {detail.highlights.length > 0 && (
                    <>
                      <h3>商品亮点</h3>
                      <ul className="detail-highlights" lang="en">
                        {detail.highlights.map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              )}
              <section className="detail-information-card">
                <div className="detail-section-heading">
                  <span>02</span>
                  <h2>规格、配料与保存</h2>
                </div>
                {detail.specifications.length ? (
                  <div className="detail-specifications" lang="en">
                    {detail.specifications.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="muted">原商品资料暂未提供更多规格。</p>
                )}
              </section>
            </div>
            <aside className="detail-information-card detail-price-source">
              <div className="detail-section-heading">
                <span>03</span>
                <h2>来源与价格</h2>
              </div>
              {detail.prices.length ? (
                <>
                  <p className="detail-source-note">
                    {product.sourceRetailer} 公开页面参考价格，门店与线上渠道可能不同。
                  </p>
                  {detail.prices.map((observation, i) => (
                    <div className="detail-price-observation" key={i}>
                      <div>
                        <strong>{channelName(observation.channel)}</strong>
                        <b>
                          {currencySymbol(observation.currency)}
                          {money(observation.price)}
                        </b>
                      </div>
                      <p>{observation.unitPriceText || '原站未提供单位价'}</p>
                      <small>
                        {observation.clubId
                          ? `${observation.city || ''} · Club ${observation.clubId}`
                          : '线上渠道'}
                        {observation.finalCostByWeight ? ' · 按重量结算' : ''}
                      </small>
                    </div>
                  ))}
                  <p className="detail-captured">
                    采集时间
                    <br />
                    {dateLabel(detail.prices[0].capturedAt)}
                  </p>
                </>
              ) : (
                <p className="muted">以本店当前标价为准。</p>
              )}
            </aside>
          </div>
        </>
      )}
    </main>
  );
}
