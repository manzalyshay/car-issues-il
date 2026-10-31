/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from 'react';
import { isUsableNewsImage } from '@/lib/newsImageUrl';

interface Props {
  src: string | null | undefined;
  alt?: string;
  isHe: boolean;
  /** Box style: size, aspect ratio, radius. Applied to both the photo and the placeholder. */
  style: CSSProperties;
  loading?: 'lazy' | 'eager';
}

/** Article photo, or the site logo (as in the nav bar) when there is no usable photo. */
export default function NewsImage({ src, alt = '', isHe, style, loading }: Props) {
  if (isUsableNewsImage(src)) {
    return <img src={src} alt={alt} loading={loading} style={{ objectFit: 'cover', display: 'block', ...style }} />;
  }
  return (
    <div
      role="img"
      aria-label={alt}
      style={{ display: 'grid', placeItems: 'center', background: '#f1f4f9', boxSizing: 'border-box', padding: '0 12%', ...style }}
    >
      <img
        src={isHe ? '/logo-light.png' : '/logo-net.png'}
        alt=""
        style={{ width: '100%', maxWidth: 320, maxHeight: '60%', objectFit: 'contain', display: 'block' }}
      />
    </div>
  );
}
