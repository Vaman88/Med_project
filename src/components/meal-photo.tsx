'use client';
import { useState } from 'react';

/** Keyword rules that pick the closest shared photo in /images/meals for a meal with no photo of its own. */
const MEAL_PHOTO_RULES: [RegExp, string][] = [
  [/wrap|burrito|roll|taco|quesadilla/, 'wrap'],
  [/avocado/, 'avocado'],
  [/sandwich|toast|sub\b|melt/, 'sandwich'],
  [/pasta|noodle|macaroni|spaghetti|penne|mac and/, 'pasta'],
  [/oat|porridge|chia|muesli/, 'oats'],
  [/yogurt|parfait|cottage/, 'fruit-yogurt'],
  [/fruit|berry|berries|mango|apple|melon|smoothie/, 'fruit'],
  [/chickpea|lentil|quinoa|bean|rice|curry|stew|chili|bowl|salad|stir|soup/, 'chickpea'],
  [/veggie|vegetable|hummus|carrot|cucumber|dipper|crudit/, 'veggies'],
  [/banana|peanut|nut butter|pancake|waffle/, 'fruit-bread'],
];
export function mealPhotoSources(id: string, title: string): string[] {
  const text = `${id} ${title}`.toLowerCase().replace(/-/g, ' ');
  const shared = MEAL_PHOTO_RULES.find(([rule]) => rule.test(text))?.[1];
  return [
    `/images/adult/${id}.jpg`,
    ...(shared ? [`/images/meals/${shared}.jpg`] : []),
    `/images/${id}.webp`,
    `/images/${id}.png`,
  ];
}

/** Meal photo that walks its source list and falls back to a tidy tile, so a missing file never shows a broken image. */
export function MealPhoto({ id, title }: { id: string; title: string }) {
  const sources = mealPhotoSources(id, title);
  const [index, setIndex] = useState(0);
  if (index >= sources.length)
    return <div className="recipe-photo recipe-photo-fallback" role="img" aria-label={title}><span aria-hidden="true">🍽️</span><small>{title}</small></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="recipe-photo" src={sources[index]} alt={`Illustrative serving of ${title.toLowerCase()}`} width={1254} height={1254} loading="lazy" onError={() => setIndex(index + 1)} />;
}
