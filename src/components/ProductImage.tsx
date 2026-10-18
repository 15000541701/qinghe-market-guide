import { useEffect, useMemo, useState } from 'react';
import {
  productImageRequestUrl,
  validProductImage,
  type ProductImageSize,
} from '../../shared/product-image';
import './ProductImage.css';

type ImageState = 'loading' | 'loaded' | 'unavailable';

const imageDimensions: Record<ProductImageSize, { width: number; height: number }> = {
  card: { width: 400, height: 300 },
  list: { width: 72, height: 72 },
  map: { width: 96, height: 96 },
  admin: { width: 56, height: 56 },
};

function imageSources(
  src: string | null | undefined,
  fallbackSrc: string | null | undefined,
  size: ProductImageSize,
) {
  const candidates: string[] = [];
  const add = (value: string | null | undefined, targetSize: ProductImageSize) => {
    if (value && validProductImage(value)) candidates.push(productImageRequestUrl(value, targetSize));
  };
  add(src, size);
  if (size !== 'card') add(src, 'card');
  add(fallbackSrc, size);
  return [...new Set(candidates)];
}

export default function ProductImage({
  src,
  alt,
  size = 'list',
  className = '',
  priority = false,
  fallbackSrc,
}: {
  src?: string | null;
  alt: string;
  size?: ProductImageSize;
  className?: string;
  priority?: boolean;
  fallbackSrc?: string | null;
}) {
  const sources = useMemo(() => imageSources(src, fallbackSrc, size), [src, fallbackSrc, size]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [state, setState] = useState<ImageState>(sources.length ? 'loading' : 'unavailable');
  const [reloadToken, setReloadToken] = useState(0);
  const [retryReadyAt, setRetryReadyAt] = useState<number | null>(null);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const currentSource = sources[sourceIndex];

  useEffect(() => {
    setSourceIndex(0);
    setState(sources.length ? 'loading' : 'unavailable');
    setRetryReadyAt(null);
  }, [reloadToken, sources]);

  useEffect(() => {
    if (retryReadyAt === null) {
      setRetrySeconds(0);
      return;
    }
    const updateCountdown = () =>
      setRetrySeconds(Math.max(0, Math.ceil((retryReadyAt - Date.now()) / 1000)));
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, [retryReadyAt]);

  useEffect(() => {
    if (!currentSource || state !== 'loading') return;
    const timeout = window.setTimeout(
      () => {
        if (sourceIndex + 1 < sources.length) {
          setSourceIndex(sourceIndex + 1);
          setState('loading');
        } else {
          setState('unavailable');
          if (sources.length) setRetryReadyAt(Date.now() + 30_000);
        }
      },
      sourceIndex === 0 ? 15_000 : 8_000,
    );
    return () => window.clearTimeout(timeout);
  }, [currentSource, sourceIndex, sources.length, state]);

  const advanceSource = () => {
    if (sourceIndex + 1 < sources.length) {
      setSourceIndex(sourceIndex + 1);
      setState('loading');
    } else {
      setState('unavailable');
      if (sources.length) setRetryReadyAt(Date.now() + 30_000);
    }
  };

  return (
    <span
      className={`product-image product-image--${size} product-image--${state} ${className}`.trim()}
      aria-busy={state === 'loading' || undefined}
    >
      {currentSource && (
        <img
          className={`product-image__content ${state === 'loaded' ? 'is-loaded' : ''}`.trim()}
          src={currentSource}
          alt={state === 'unavailable' ? '' : alt}
          aria-hidden={state === 'unavailable' || undefined}
          width={imageDimensions[size].width}
          height={imageDimensions[size].height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          onLoad={() => setState('loaded')}
          onError={advanceSource}
        />
      )}
      {state === 'loading' ? (
        <span className="product-image__skeleton" aria-hidden="true" />
      ) : state === 'unavailable' ? (
        <span className="product-image__fallback">
          <span role="status">图片暂不可用</span>
          {sources.length > 0 && (
            <button
              className="product-image__retry"
              type="button"
              disabled={retrySeconds > 0}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setReloadToken((current) => current + 1);
              }}
            >
              {retrySeconds > 0 ? `${retrySeconds} 秒后可重试` : '重新加载'}
            </button>
          )}
        </span>
      ) : null}
    </span>
  );
}
