"use client";
import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  IconArrowRight,
  IconBook2,
  IconChefHat,
  IconClock,
  IconLock,
  IconStar,
  IconToolsKitchen2,
} from "@tabler/icons-react";
import { CookingStudio } from "./cooking-studio";
import { DishPreview } from "./dish-preview";
import { ChefAvatar } from "./chef-avatar";
import {
  awardRecipe,
  CHILD_PROGRESS_KEY,
  childProgressSchema,
  emptyProgress,
  saveCreation,
} from "@/lib/child-progress";
import { chefTitle } from "@/lib/chef-name";
import type { DishState } from "@/lib/cooking";
import {
  recipeChoices,
  type Family,
  type LittleRecipe,
} from "@/lib/little-kitchen";

// Food photos are compressed at authoring time, so browsing never waits for a
// runtime image transformation. Width and height still reserve their space.
function FoodImage(props: ImageProps) {
  return <Image loading="eager" {...props} unoptimized />;
}

export function LittleKitchen({
  family,
  onSettings,
}: {
  family: Family;
  onSettings: () => void;
}) {
  const [recipe, setRecipe] = useState<LittleRecipe | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);
  const [category, setCategory] = useState<
    "all" | "breakfast" | "lunch" | "sweet"
  >("all");
  const [destination, setDestination] = useState<"cook" | "recipes" | "chef">(
    "cook",
  );
  const [progress, setProgress] = useState(emptyProgress);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHILD_PROGRESS_KEY);
      if (saved) {
        const parsed = childProgressSchema.safeParse(JSON.parse(saved));
        if (parsed.success) setProgress(parsed.data);
      }
    } catch {
      /* Device storage is optional. */
    }
  }, []);
  function updateProgress(change: (current: typeof progress) => typeof progress) {
    setProgress((current) => {
      let next = current;
      try {
        next = change(current);
        localStorage.setItem(CHILD_PROGRESS_KEY, JSON.stringify(next));
      } catch {
        /* Session progress remains visible. */
      }
      return next;
    });
  }
  const recordRecipe = (id: string, quizStars: number) =>
    updateProgress((current) => awardRecipe(current, id, quizStars));
  const keepCreation = (id: string, dish: DishState) => {
    updateProgress((current) => saveCreation(current, id, dish));
    setJustSaved(id);
  };
  const choices = recipeChoices(family);
  const title = chefTitle(family.nickname);
  const visibleChoices = choices.filter(
    ({ recipe: item }) => category === "all" || item.category === category,
  );
  const cookbook = choices.filter(
    ({ recipe: item }) => progress.creations?.[item.id],
  );
  const cook = (item: LittleRecipe) => {
    setJustSaved(null);
    setRecipe(item);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  if (recipe)
    return (
      <CookingStudio
        key={recipe.id}
        recipe={recipe}
        onBack={() => {
          setRecipe(null);
          window.scrollTo({ top: 0, behavior: "instant" });
        }}
        onSettings={onSettings}
        onComplete={(stars) => recordRecipe(recipe.id, stars)}
        onSave={(dish) => keepCreation(recipe.id, dish)}
        saved={justSaved === recipe.id}
        onCollection={() => {
          setRecipe(null);
          setDestination("recipes");
        }}
        chefAge={family.age}
      />
    );
  return (
    <div className="little-app">
      <header className="little-header">
        <span className="little-brand">
          <IconChefHat /> Healthy Steps <b>little kitchen</b>
        </span>
        <nav className="child-nav" aria-label="Child navigation">
          {(["cook", "recipes", "chef"] as const).map((item) => (
            <button
              key={item}
              aria-current={destination === item ? "page" : undefined}
              onClick={() => setDestination(item)}
            >
              {item === "cook" ? (
                <><IconToolsKitchen2 size={19} aria-hidden="true" /><span>Cook</span></>
              ) : item === "recipes" ? (
                <><IconBook2 size={19} aria-hidden="true" /><span>My Cookbook</span></>
              ) : (
                <><IconStar size={19} aria-hidden="true" /><span>My Chef</span></>
              )}
            </button>
          ))}
        </nav>
        <button onClick={onSettings}>
          <IconLock size={17} />
          Parent settings
        </button>
      </header>
      <main className="little-menu km">
        {destination === "recipes" ? (
          <section className="km-section">
            <h1>My cookbook</h1>
            <p className="km-sub">Dishes you made and saved. Cook one again whenever you like.</p>
            <div className="km-grid">
              {cookbook.map(({ recipe: item }) => (
                <article className="km-card" key={item.id}>
                  <DishPreview recipe={item} dish={progress.creations?.[item.id]} label={`Your ${item.title.toLowerCase()}`} />
                  <div className="km-card-body">
                    <h2>{item.title}</h2>
                    <p className="km-meta">Made {progress.completed[item.id] ?? 1} time{(progress.completed[item.id] ?? 1) === 1 ? "" : "s"}</p>
                    <button className="little-primary" onClick={() => cook(item)}>Cook again</button>
                  </div>
                </article>
              ))}
            </div>
            {!cookbook.length && (
              <div className="little-empty">
                <IconBook2 size={40} aria-hidden="true" />
                <h2>Your cookbook is waiting!</h2>
                <p>Finish a dish and choose “Save to my cookbook” to add a page.</p>
                <button onClick={() => setDestination("cook")}>Choose a recipe</button>
              </div>
            )}
          </section>
        ) : destination === "chef" ? (
          <section className="child-profile">
            <ChefAvatar avatar={family.avatar} />
            <div>
              <span className="little-kicker">My chef</span>
              <h1>{title}</h1>
              <p className="chef-stars">⭐ {progress.stars} chef stars</p>
              <h2>Your badges</h2>
              <div className="chef-badges">
                <span>
                  {Object.keys(progress.completed).length
                    ? "🏅 First Recipe"
                    : "🔒 First Recipe"}
                </span>
                <span>
                  {progress.completed.pizza
                    ? "🌈 Veggie Explorer"
                    : "🔒 Veggie Explorer"}
                </span>
                <span>
                  {progress.completed.pancakes
                    ? "🥞 Breakfast Chef"
                    : "🔒 Breakfast Chef"}
                </span>
              </div>
              <button
                className="little-primary"
                onClick={() => setDestination("cook")}
              >
                Let’s cook
              </button>
            </div>
          </section>
        ) : (
          <section className="km-section">
            <div className="km-hello">
              <ChefAvatar avatar={family.avatar} size="small" />
              <div>
                <h1>Hey, {title}! What’s cooking?</h1>
                <p className="km-sub">Pick a dish and make it in your play kitchen.</p>
              </div>
            </div>
            <div className="km-filters" role="group" aria-label="Kinds of dishes">
              {(["all", "breakfast", "lunch", "sweet"] as const).map((item) => (
                <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>
                  {item === "all" ? "All dishes" : item === "breakfast" ? "Breakfast" : item === "lunch" ? "Lunch & dinner" : "Sweet treats"}
                </button>
              ))}
            </div>
            {family.otherAllergies && (
              <p className="little-empty">
                A grown-up needs to review the other food exclusions in Parent
                settings before we can show recipes.
              </p>
            )}
            <div className="km-grid">
              {visibleChoices.map(({ recipe: r, missing }) => (
                <article className="km-card" key={r.id}>
                  <div className="km-photo">
                    <FoodImage
                      src={r.image}
                      alt={r.title}
                      width={1254}
                      height={1254}
                      sizes="(max-width: 700px) 90vw, (max-width: 1100px) 45vw, 360px"
                    />
                  </div>
                  <div className="km-card-body">
                    <h2>{r.title}</h2>
                    <p className="km-meta"><IconClock size={16} aria-hidden="true" /> About {r.minutes} min in a real kitchen</p>
                    <button className="little-primary" onClick={() => cook(r)}>
                      Cook this <IconArrowRight size={20} aria-hidden="true" />
                    </button>
                    {!!missing.length && (
                      <p className="km-pantry">Real pantry: a grown-up may need to add {missing.join(", ")}.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!family.otherAllergies && !visibleChoices.length && (
              <div className="little-empty">
                <IconToolsKitchen2 size={36} />
                <h3>
                  {choices.length
                    ? "No dishes in this group yet."
                    : "No recipes match these food settings yet."}
                </h3>
                <p>
                  {choices.length
                    ? "Try another group of dishes."
                    : "Ask a grown-up to review your kitchen."}
                </p>
                {choices.length ? (
                  <button onClick={() => setCategory("all")}>Show all dishes</button>
                ) : (
                  <button onClick={onSettings}>Open Parent settings</button>
                )}
              </div>
            )}
          </section>
        )}
        <p className="little-footnote">
          This is a pretend cooking game. Ask a grown-up for help with real
          knives, heat and food labels.
        </p>
      </main>
    </div>
  );
}
