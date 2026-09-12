import { useState } from 'react';
import { photoFor } from '../data/photo.js';

/**
 * Pandal photo filling its tile. The tile must be positioned (relative) and
 * keeps its own size, background and Om placeholder: the image covers them once
 * it loads, and renders nothing when there is no photo or it fails to load, so
 * the placeholder shows exactly as before. Place it before any badges so they
 * stay on top. `priority` is for the above-the-fold detail hero.
 */
export default function PandalPhoto({ g, sizes, priority = false, showCredit = false }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const photo = photoFor(g);
  if (!photo || failedSrc === photo.src) return null;

  return (
    <>
      <img
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={photo.srcSet ? sizes : undefined}
        alt={g.name}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFailedSrc(photo.src)}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {showCredit && photo.credit && (
        <div className="absolute bottom-2 right-2 max-w-[80%] truncate rounded-badge bg-maroon/70 px-1.5 py-0.5 font-sans text-[9px] text-light/90">
          {photo.credit}
        </div>
      )}
    </>
  );
}
