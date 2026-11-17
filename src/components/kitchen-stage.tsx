"use client";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { IconArrowRight, IconChevronLeft, IconChevronRight, IconLayoutGrid } from "@tabler/icons-react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { InteractiveSprig } from "./sprig";

/** How long each dish stays in the middle before the counter shuffles to the next one. */
const SHUFFLE_MS = 3600;

/** Excited things Sprig says about the dish in the middle of the counter. */
function cheerFor(recipe: LittleRecipe, isNew: boolean): string {
  if (isNew) return `Ooh, ${recipe.title.toLowerCase()} is brand new! Let’s try it!`;
  const lines = [`Yum, ${recipe.title.toLowerCase()}! Want to make it with me?`, `${recipe.title}? Great pick, chef!`, `I love ${recipe.title.toLowerCase()}! Shall we cook?`];
  return lines[recipe.title.length % lines.length];
}

/**
 * The kids' kitchen home: Sprig stands on the right of a cozy kitchen and greets the
 * chef, while the dishes sit on plates along the counter and shuffle by. Arrows, a swipe
 * or tapping a side plate moves the counter; "Let's cook it!" starts the middle dish.
 */
export function KitchenStage({ title, dishes, recipes, completed, onCook, onAll }: {
  title: string;
  dishes: number;
  recipes: LittleRecipe[];
  completed: Record<string, number>;
  onCook: (recipe: LittleRecipe) => void;
  /** Opens the full grid of dishes. */
  onAll?: () => void;
}) {
  const n = recipes.length;
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [reduced, setReduced] = useState(false);
  const swipe = useRef<{ x: number; id: number } | null>(null);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  // The counter shuffles gently on its own until the chef starts choosing.
  useEffect(() => {
    if (touched || reduced || n < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % n), SHUFFLE_MS);
    return () => window.clearInterval(id);
  }, [touched, reduced, n]);
  if (!n) return null;
  const current = recipes[((index % n) + n) % n];
  const move = (step: number) => { setTouched(true); setIndex((i) => (i + step + n) % n); };
  // Each plate's place on the counter relative to the middle one (-2 … 2 are shown).
  const offsetOf = (i: number) => {
    let d = (i - index) % n;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
  }
  function down(e: ReactPointerEvent) { swipe.current = { x: e.clientX, id: e.pointerId }; }
  function up(e: ReactPointerEvent) {
    const s = swipe.current; swipe.current = null;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
  }
  const isNew = !!current.isNew;
  return (
    <section className="ks" aria-label="Let’s cook">
      <div className="ks-scene">
        <p className="ks-banner" aria-hidden="true"><span>Let’s cook!</span></p>
        {onAll && (
          <button type="button" className="ks-all" onClick={onAll}>
            <IconLayoutGrid size={20} aria-hidden="true" /> See all dishes
          </button>
        )}
        <div className="ks-shelf" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="ks-talk">
          <div className="ks-bubble" aria-live="polite">
            <h1>Hey, {title}! What’s cooking?</h1>
            <p key={current.id}>{touched ? cheerFor(current, isNew) : "Pick a yummy dish and let’s make it together!"}</p>
          </div>
          <InteractiveSprig className="ks-sprig" mood={touched ? "cheer" : "hello"} dishes={dishes} size={190} />
        </div>
        <div className="ks-counter">
          <button type="button" className="ks-arrow ks-prev" onClick={() => move(-1)} aria-label="Previous dish"><IconChevronLeft size={34} stroke={3} aria-hidden="true" /></button>
          <div className="ks-track" role="group" aria-roledescription="carousel" aria-label="Dishes to cook" tabIndex={0} onKeyDown={onKey}
            onPointerDown={down} onPointerUp={up} onPointerCancel={() => { swipe.current = null; }}>
            {recipes.map((recipe, i) => {
              const d = offsetOf(i);
              const shown = Math.abs(d) <= 2;
              return (
                <button key={recipe.id} type="button" className={`ks-plate${d === 0 ? " is-center" : ""}`}
                  style={{ ["--d" as string]: d, visibility: shown ? "visible" : "hidden" }}
                  tabIndex={d === 0 ? 0 : -1} aria-hidden={!shown || undefined}
                  aria-label={d === 0 ? `${recipe.title}, chosen` : `Show ${recipe.title}`}
                  onClick={() => (d === 0 ? onCook(recipe) : move(d))}>
                  <span className="ks-dish">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local dish photos */}
                    <img src={recipe.image} alt="" width={240} height={240} loading="lazy" decoding="async" draggable={false} />
                  </span>
                  {recipe.isNew ? <span className="ks-tag ks-new">NEW!</span>
                    : completed[recipe.id] ? <span className="ks-tag ks-made">Made it!</span> : null}
                </button>
              );
            })}
          </div>
          <button type="button" className="ks-arrow ks-next" onClick={() => move(1)} aria-label="Next dish"><IconChevronRight size={34} stroke={3} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="ks-pick">
        <p className="ks-name"><strong>{current.title}</strong><span>{current.subtitle}</span></p>
        <button type="button" className="ks-go" onClick={() => onCook(current)}>Let’s cook it! <IconArrowRight size={22} aria-hidden="true" /></button>
      </div>
    </section>
  );
}
