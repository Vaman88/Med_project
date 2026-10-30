"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { completeDish, finalSurface, planFor, type DishState } from "@/lib/cooking";
import { CookingScene } from "./cooking-scene";

// A 4:3 crop that frames every finished dish the same way.
const CARD_VIEW = { x: 120, y: 38, w: 560, h: 420 };

/**
 * The finished dish as a 4:3 picture.
 *
 * By default it shows the real food photograph (`recipe.image`) with the
 * child's own illustrated dish as a small badge in the corner. Pass
 * `photo={false}` for the illustration alone, or a path to use another photo.
 * If the photo cannot load, the illustration fills the frame instead.
 */
export function DishPreview({ recipe, dish, label, photo }: {
  recipe: LittleRecipe; dish?: DishState; label?: string; photo?: string | false;
}) {
  const plan = useMemo(() => planFor(recipe), [recipe]);
  const shown = useMemo(() => dish ?? completeDish(recipe), [dish, recipe]);
  const src = photo === false ? "" : photo || recipe.image || "";
  const [failed, setFailed] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(src);
  }, [src]);
  const showPhoto = Boolean(src) && failed !== src;
  const scene = (
    <CookingScene recipe={recipe} plan={plan} dish={shown} step={null} surface={finalSurface(recipe)} presenting view={CARD_VIEW} />
  );
  const name = recipe.title.toLowerCase();
  if (!showPhoto) {
    return <div className="ck-preview" role="img" aria-label={label ?? `A finished ${name}`}>{scene}</div>;
  }
  return (
    <div className="ck-preview ck-preview-photo" role="group" aria-label={label ?? `A finished ${name}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={src} width={1254} height={1254} loading="lazy" decoding="async"
        alt={`A photo of ${name}`} onError={() => setFailed(src)} />
      {dish && <div className="ck-preview-badge" role="img" aria-label={`Your own ${name}`}>{scene}</div>}
    </div>
  );
}
