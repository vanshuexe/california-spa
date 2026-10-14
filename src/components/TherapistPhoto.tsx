import React, { useEffect, useState } from 'react';
import { THERAPIST_PLACEHOLDER } from '../lib/therapistPhoto';

interface Props {
  src?: string | null;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
}

// Shows a therapist photo, and the default placeholder when the photo is missing or fails to load
// (broken link, a web-page URL instead of an image, deleted file...).
export const TherapistPhoto: React.FC<Props> = ({ src, alt, className, width, height, eager }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const useFallback = !src || failed;
  return (
    <img
      src={useFallback ? THERAPIST_PLACEHOLDER : src!}
      alt={useFallback ? `${alt} (photo not available)` : alt}
      width={width}
      height={height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
};
