import { useState } from 'react';
import { cn } from '../../lib/format';
import type { BottleShape } from '../../lib/types';
import { BottleArt } from './BottleArt';

interface Props {
  name: string;
  brand: string;
  shape: BottleShape;
  color: string;
  imageUrl?: string | null;
  className?: string;
  imgClassName?: string;
}

/** Muestra la foto del producto si existe; si no (o si falla), la botella vectorial. */
export function ProductVisual({ name, brand, shape, color, imageUrl, className, imgClassName }: Props) {
  const [broken, setBroken] = useState(false);
  if (imageUrl && !broken) {
    return (
      <img
        src={imageUrl}
        alt={`${brand} ${name}`}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className={cn('object-contain', imgClassName ?? className)}
      />
    );
  }
  return <BottleArt shape={shape} color={color} brand={brand} name={name} className={className} />;
}
