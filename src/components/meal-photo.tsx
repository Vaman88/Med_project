'use client';
import { useState } from 'react';

/** Each planner recipe has its own photographed serving; never substitute an unrelated dish. */
export function mealPhotoSources(id: string, _title?: string): string[] {
  return [`/images/adult/${id}.jpg`];
}

export function MealPhoto({ id, title }: { id: string; title: string }) {
  const src = mealPhotoSources(id)[0];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (failedSource === src)
    return <div className="recipe-photo recipe-photo-fallback" role="img" aria-label={title}><span aria-hidden="true">🍽️</span><small>{title}</small></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="recipe-photo" src={src} alt={`Serving suggestion for ${title.toLowerCase()}`} width={960} height={640} loading="lazy" onError={() => setFailedSource(src)} />;
}
