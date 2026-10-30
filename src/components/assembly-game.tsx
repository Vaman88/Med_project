"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { IconArrowLeft, IconChefHat, IconClock, IconStar } from "@tabler/icons-react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { recipeChallenges } from "@/lib/chef-challenges";

const foodIcons: Record<string, string> = {
  "Plain yogurt": "🥣",
  Banana: "🍌",
  Strawberries: "🍓",
  Carrots: "🥕",
  Cucumber: "🥒",
  "Bell pepper": "🫑",
  Hummus: "🫘",
  "Black beans": "🫘",
  "Canned black beans": "🫘",
  Corn: "🌽",
  "Canned corn": "🌽",
  Tomato: "🍅",
};

export function AssemblyGame({
  recipe,
  onBack,
  onSettings,
  onComplete,
  onCollection,
  chefAge,
}: {
  recipe: LittleRecipe;
  onBack: () => void;
  onSettings: () => void;
  onComplete: (stars: number) => void;
  onCollection: () => void;
  chefAge: number;
}) {
  const [phase, setPhase] = useState<"prep" | "build" | "challenge" | "serve" | "done">("prep");
  const [prepCount, setPrepCount] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const saved = useRef(false);
  const question = recipeChallenges(recipe.id, chefAge)[0];
  const prep = recipe.prepIngredient ?? recipe.ingredients[0].food;
  const stage = phase === "prep" ? 0 : phase === "build" || phase === "challenge" ? 1 : 2;
  const title =
    phase === "prep"
      ? `Prepare the ${prep.toLowerCase()}`
      : phase === "build"
        ? "Add your ingredients"
        : phase === "challenge"
          ? "Chef Challenge"
          : phase === "serve"
            ? "Serve your creation"
            : "You made it!";
  const hint =
    phase === "prep"
      ? `Tap the ${prep.toLowerCase()} three times to get it ready. Ask a grown-up to help with real cutting.`
      : phase === "build"
        ? "Tap an ingredient on the shelf, then tap the bowl. Add every ingredient."
        : phase === "serve"
          ? "Tap the plate to share your finished dish."
          : "Look what you made!";
  const done = phase === "prep" ? prepCount : phase === "build" ? added.length : 1;
  const total = phase === "prep" ? 3 : phase === "build" ? recipe.ingredients.length : 1;

  useEffect(() => {
    if (phase === "done" && !saved.current) {
      saved.current = true;
      onComplete(correct ? 1 : 0);
    }
  }, [phase, correct, onComplete]);

  function addFood() {
    if (!selected || added.includes(selected) || phase !== "build") return;
    const next = [...added, selected];
    setAdded(next);
    setSelected(null);
    if (next.length === recipe.ingredients.length) setPhase("challenge");
  }
  function readStep() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(`${title}. ${hint}`);
    speech.rate = 0.88;
    window.speechSynthesis.speak(speech);
  }

  return (
    <div className="little-app counter-app assembly-app">
      <header className="little-header">
        <button onClick={onBack}><IconArrowLeft size={19} /> Menu</button>
        <span className="little-brand"><IconChefHat /> Little Kitchen</span>
        <button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button>
        <button onClick={onSettings}>Parent settings</button>
      </header>
      <main className="counter-game">
        <div className="counter-heading">
          <div>
            <span className="little-kicker">Make it yourself</span>
            <h1>{recipe.title}</h1>
            <p>Choose the foods, build your dish, and serve it.</p>
          </div>
          <div className="counter-heading-actions"><span><IconClock size={18} /> {recipe.minutes} min with a grown-up</span></div>
        </div>
        <ol className="counter-stages" aria-label="Cooking progress">
          {["Prep", "Make", "Serve"].map((label, index) => (
            <li key={label} className={index < stage ? "done" : index === stage ? "current" : ""} aria-current={index === stage ? "step" : undefined}>
              <span>{index + 1}</span> {label}
            </li>
          ))}
        </ol>
        {phase !== "done" && (
          <section className="counter-task" aria-live="polite">
            <div className="counter-task-icon"><IconChefHat size={30} /></div>
            <div className="counter-task-copy">
              <span className="counter-label">Chef&apos;s recipe card</span>
              <h2>{title}</h2>
              <p>{hint}</p>
              <button className="counter-read-step" onClick={readStep}>🔊 Hear this step</button>
              <div className="counter-progress" role="progressbar" aria-label={`${title} progress`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
                <span style={{ width: `${(done / total) * 100}%` }} />
              </div>
              <small>{done} of {total} done</small>
            </div>
          </section>
        )}
        <div className="assembly-scene">
          <div className="assembly-shelf">
            <h2>Ingredients</h2>
            <p>Pick a food to add to your dish.</p>
            <div className="assembly-foods">
              {recipe.ingredients.map(({ food }) => (
                <button
                  key={food}
                  type="button"
                  disabled={phase !== "build" || added.includes(food)}
                  aria-pressed={selected === food}
                  className={selected === food ? "chosen" : ""}
                  onClick={() => setSelected(food)}
                >
                  <span aria-hidden="true">{foodIcons[food] ?? "🍽️"}</span>
                  <strong>{food}</strong>
                  {added.includes(food) && <small>Added ✓</small>}
                </button>
              ))}
            </div>
          </div>
          <div className="assembly-counter">
            <div className="assembly-prep">
              <h2>Prep board</h2>
              <button
                type="button"
                disabled={phase !== "prep"}
                onClick={() => {
                  const next = prepCount + 1;
                  setPrepCount(next);
                  if (next === 3) setPhase("build");
                }}
                aria-label={`Prepare ${prep}, ${prepCount} of 3`}
              >
                <span aria-hidden="true">{foodIcons[prep] ?? "🥄"}</span>
                {phase === "prep" ? `Tap to prepare ${prep}` : `${prep} ready ✓`}
              </button>
            </div>
            <div className="assembly-dish">
              <h2>{recipe.id === "veggie-dippers" ? "Serving plate" : "Mixing bowl"}</h2>
              <button type="button" disabled={phase !== "build" || !selected} onClick={addFood} aria-label={selected ? `Add ${selected} to dish` : "Select an ingredient first"}>
                <span className="assembly-dish-inside" aria-hidden="true">
                  {added.length ? added.map((food) => <span key={food}>{foodIcons[food] ?? "🍽️"}</span>) : "＋"}
                </span>
                <strong>{selected ? `Add ${selected}` : added.length ? `${added.length} ingredients added` : "Choose a food above"}</strong>
              </button>
            </div>
            <div className="assembly-serve">
              <h2>Ready to share</h2>
              <button type="button" disabled={phase !== "serve"} onClick={() => setPhase("done")}>🍽️ Serve it!</button>
            </div>
          </div>
        </div>
        {phase === "done" && (
          <div className="counter-win" role="status">
            <IconStar size={36} />
            <Image className="counter-win-food" src={recipe.image} alt={recipe.title} width={420} height={300} unoptimized />
            <div>
              <h2>You made {recipe.title.toLowerCase()}!</h2>
              <p>Great cooking, Chef! ⭐ {correct ? 2 : 1} stars earned.</p>
              <p className="counter-win-fact">Food fact: {recipe.benefit}</p>
            </div>
            <div className="counter-win-actions">
              <button className="little-primary" onClick={onCollection}>Save to My Cookbook</button>
              <button onClick={onBack}>Cook something else</button>
              <button onClick={() => setShowRecipe(true)}>Make this at home</button>
            </div>
          </div>
        )}
      </main>
      {phase === "challenge" && (
        <div className="game-overlay" role="dialog" aria-modal="true" aria-label="Chef Challenge">
          <div className="game-overlay-card challenge-card">
            <span className="little-kicker">⭐ Chef Challenge!</span>
            <h2>{question.question}</h2>
            {question.answers.map((answer, index) => (
              <button
                key={answer}
                className="challenge-answer"
                disabled={correct}
                onClick={() => {
                  if (index === question.correct) {
                    setCorrect(true);
                    setWrong(false);
                  } else setWrong(true);
                }}
              >
                {answer}
              </button>
            ))}
            {wrong && <p role="status">Nice try! Look at the ingredients and choose again.</p>}
            {correct && <><p role="status">✨ That&apos;s right! {question.explanation}</p><button className="little-primary" onClick={() => setPhase("serve")}>Keep cooking</button></>}
          </div>
        </div>
      )}
      {paused && phase !== "challenge" && (
        <div className="game-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
          <div className="game-overlay-card"><h2>Take a kitchen break</h2><p>Your food will be right here.</p><button className="little-primary" onClick={() => setPaused(false)}>Resume cooking</button><button onClick={onBack}>Back to recipes</button></div>
        </div>
      )}
      {showRecipe && (
        <div className="game-overlay" role="dialog" aria-modal="true" aria-label="Recipe for grown-ups">
          <div className="game-overlay-card assembly-recipe">
            <h2>For grown-ups: {recipe.title}</h2>
            <p>Check ingredient labels and cross-contact for allergies. Help children with cutting and food handling.</p>
            <h3>Ingredients</h3>
            <ul>{recipe.ingredients.map(({ food, amount }) => <li key={food}>{amount} {food}</li>)}</ul>
            <h3>Steps</h3>
            <ol>{recipe.adultSteps.map((step) => <li key={step}>{step}</li>)}</ol>
            <button className="little-primary" onClick={() => setShowRecipe(false)}>Close recipe</button>
          </div>
        </div>
      )}
    </div>
  );
}
