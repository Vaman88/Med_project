"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";
import { IconArrowLeft, IconArrowRight, IconChefHat, IconStar } from "@tabler/icons-react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { recipeChallenges } from "@/lib/chef-challenges";
import { buildRecipeStages, foodIcon, recipeDish, type PlayItem } from "@/lib/recipe-builder";

type Placement = PlayItem & { stage: number; x: number; y: number };
type Dragging = { food: string; startX: number; startY: number; moved: boolean; pointerId: number };
const tapSpots = [
  { x: 35, y: 36 }, { x: 64, y: 43 }, { x: 48, y: 64 },
  { x: 72, y: 67 }, { x: 27, y: 69 }, { x: 54, y: 28 },
];

export function RecipeBuilderGame({
  recipe, onBack, onSettings, onComplete, onCollection, chefAge,
}: {
  recipe: LittleRecipe;
  onBack: () => void;
  onSettings: () => void;
  onComplete: (stars: number) => void;
  onCollection: () => void;
  chefAge: number;
}) {
  const stages = buildRecipeStages(recipe);
  const [stageIndex, setStageIndex] = useState(0);
  const [prepCount, setPrepCount] = useState(0);
  const [placed, setPlaced] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [cooked, setCooked] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState(false);
  const [quizMistake, setQuizMistake] = useState(false);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showRecipe, setShowRecipe] = useState(false);
  const [ghost, setGhost] = useState<{ icon: string; x: number; y: number } | null>(null);
  const dishRef = useRef<HTMLButtonElement>(null);
  const dragging = useRef<Dragging | null>(null);
  const suppressClick = useRef(false);
  const saved = useRef(false);
  const stage = stages[stageIndex];
  const question = recipeChallenges(recipe.id, chefAge)[0];
  const currentPlaced = placed.filter((item) => item.stage === stageIndex);
  const count = (food: string) => currentPlaced.filter((item) => item.food === food).length;
  const ready = stage.kind === "prep" ? prepCount === stage.need
    : stage.kind === "add" ? stage.items.every((item) => count(item.food) >= item.need)
    : stage.kind === "cook" ? cooked
    : stage.kind === "quiz" ? quizCorrect
    : false;

  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true;
      onComplete(quizMistake ? 0 : 1);
    }
  }, [finished, onComplete, quizMistake]);

  function place(food: string, point?: { x: number; y: number }) {
    if (paused || finished) return;
    if (stage.kind === "prep") {
      if (food === stage.food) setPrepCount((value) => Math.min(stage.need, value + 1));
      return;
    }
    if (stage.kind !== "add") return;
    const item = stage.items.find((candidate) => candidate.food === food);
    if (!item || count(food) >= item.need) return;
    const spot = point ?? tapSpots[placed.length % tapSpots.length];
    setPlaced((current) => [...current, {
      ...item,
      stage: stageIndex,
      x: Math.max(14, Math.min(86, spot.x)),
      y: Math.max(14, Math.min(86, spot.y)),
    }]);
    setSelected(null);
  }

  function undo() {
    if (stage.kind === "prep") setPrepCount((value) => Math.max(0, value - 1));
    if (stage.kind === "add") setPlaced((current) => {
      let index = -1;
      for (let itemIndex = current.length - 1; itemIndex >= 0; itemIndex--) {
        if (current[itemIndex].stage === stageIndex) {
          index = itemIndex;
          break;
        }
      }
      return index < 0 ? current : current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function advance() {
    if (!ready) return;
    setSelected(null);
    setStageIndex((value) => Math.min(stages.length - 1, value + 1));
  }

  function replay() {
    saved.current = false;
    setStageIndex(0);
    setPrepCount(0);
    setPlaced([]);
    setSelected(null);
    setCooked(false);
    setQuizCorrect(false);
    setQuizMistake(false);
    setFinished(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function readStep() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(`${stage.title}. ${stage.hint}`);
    speech.rate = 0.88;
    window.speechSynthesis.speak(speech);
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, food: string) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging.current = {
      food, startX: event.clientX, startY: event.clientY,
      moved: false, pointerId: event.pointerId,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>, food: string) {
    const active = dragging.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - active.startX, event.clientY - active.startY) > 8)
      active.moved = true;
    if (active.moved) setGhost({ icon: foodIcon(food), x: event.clientX, y: event.clientY });
  }

  function pointerUp(event: PointerEvent<HTMLButtonElement>) {
    const active = dragging.current;
    dragging.current = null;
    setGhost(null);
    if (!active || !active.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
    const rect = dishRef.current?.getBoundingClientRect();
    if (!rect || event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) return;
    place(active.food, {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  function trayButton(food: string, icon: string, disabled: boolean) {
    return (
      <button
        key={food}
        type="button"
        className={`builder-ingredient${selected === food ? " selected" : ""}`}
        disabled={disabled || paused}
        aria-pressed={selected === food}
        onPointerDown={(event) => pointerDown(event, food)}
        onPointerMove={(event) => pointerMove(event, food)}
        onPointerUp={pointerUp}
        onPointerCancel={() => { dragging.current = null; setGhost(null); }}
        onClick={() => {
          if (suppressClick.current) return;
          setSelected(food);
        }}
      >
        <span aria-hidden="true">{icon}</span>
        <strong>{food}</strong>
      </button>
    );
  }

  return (
    <div className="little-app builder-app">
      <header className="builder-header">
        <button type="button" onClick={onBack}><IconArrowLeft size={19} aria-hidden="true" /> Menu</button>
        <span className="little-brand"><IconChefHat aria-hidden="true" /> Little Kitchen</span>
        <div>
          <button type="button" onClick={() => setPaused(true)}>Pause</button>
          <button type="button" onClick={onSettings}>Parent settings</button>
        </div>
      </header>
      <main className="builder-main">
        <div className="builder-heading">
          <div><span className="little-kicker">Your customer's dish</span><h1>{recipe.title}</h1></div>
          <button type="button" onClick={readStep}>🔊 Hear this step</button>
        </div>
        <ol className="builder-progress" aria-label="Cooking steps">
          {stages.map((item, index) => (
            <li key={`${item.kind}-${index}`} className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""}
              aria-current={index === stageIndex ? "step" : undefined}>
              <span>{index + 1}</span><small>{item.title}</small>
            </li>
          ))}
        </ol>
        {finished ? (
          <section className="builder-win" role="status">
            <IconStar size={42} aria-hidden="true" />
            <Image src={recipe.image} alt="" width={360} height={360} unoptimized />
            <div><h2>You made {recipe.title.toLowerCase()}!</h2>
              <p>Order ready! Chef stars earned: {quizMistake ? 1 : 2}.</p>
              <p>{recipe.benefit}</p></div>
            <div className="builder-win-actions">
              <button className="little-primary" type="button" onClick={onCollection}>Save to My Cookbook</button>
              <button type="button" onClick={replay}>Cook again</button>
              <button type="button" onClick={() => setShowRecipe(true)}>Make this at home</button>
            </div>
          </section>
        ) : (
          <div className="builder-workspace" data-stage-kind={stage.kind}>
            <aside className="builder-tray" aria-label="Ingredient tray">
              <h2>{stage.kind === "prep" ? "Get ready" : stage.kind === "add" ? "Ingredients" : "Next up"}</h2>
              <div className="builder-tray-items">
                {stage.kind === "prep" && trayButton(stage.food, stage.icon, prepCount === stage.need)}
                {stage.kind === "add" && stage.items.map((item) =>
                  trayButton(item.food, item.icon, count(item.food) >= item.need))}
                {stage.kind === "cook" && <span className="builder-tray-note">{stage.appliance === "oven" ? "🔥 Pretend oven" : "🍳 Pretend stove"}</span>}
                {stage.kind === "quiz" && <span className="builder-tray-note">⭐ Think about what you made.</span>}
                {stage.kind === "serve" && <span className="builder-tray-note">🍽️ Time to share!</span>}
              </div>
            </aside>
            <section className="builder-stage" aria-label="Cooking work area">
              {stage.kind === "quiz" ? (
                <div className="builder-quiz">
                  <h2>{question.question}</h2>
                  {question.answers.map((answer, index) => (
                    <button key={answer} type="button" disabled={quizCorrect}
                      onClick={() => {
                        if (index === question.correct) setQuizCorrect(true);
                        else setQuizMistake(true);
                      }}>
                      {answer}
                    </button>
                  ))}
                  {quizMistake && !quizCorrect && <p role="status">Try again. Think about the food you used.</p>}
                  {quizCorrect && <p role="status">That’s right! {question.explanation}</p>}
                </div>
              ) : stage.kind === "cook" ? (
                <div className="builder-cook">
                  <div className={`builder-dish builder-${recipeDish(recipe)} builder-${recipe.id}${cooked ? " cooked" : ""}`}>
                    <span className="builder-base" />
                    {placed.map((item, index) => <span key={index} className="builder-piece" style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.icon}</span>)}
                  </div>
                  <button type="button" disabled={cooked} onClick={() => setCooked(true)}>
                    {stage.appliance === "oven" ? "🔥 Bake in the pretend oven" : "🍳 Cook on the pretend stove"}
                  </button>
                  {cooked && <p role="status">Your dish is cooked! Tap Next step.</p>}
                </div>
              ) : stage.kind === "serve" ? (
                <div className="builder-serve">
                  <Image src={recipe.image} alt="" width={260} height={260} unoptimized />
                  <button className="little-primary" type="button" onClick={() => setFinished(true)}>🍽️ Serve it!</button>
                </div>
              ) : (
                <button
                  ref={dishRef}
                  type="button"
                  className={`builder-dish builder-${stage.kind === "prep" ? "prep" : recipeDish(recipe)} builder-${recipe.id}`}
                  onClick={() => {
                    if (stage.kind === "prep") place(stage.food);
                    else if (selected) place(selected);
                  }}
                  aria-label={stage.kind === "prep"
                    ? `${stage.verb} ${stage.food}, ${prepCount} of ${stage.need}`
                    : selected ? `Add ${selected} to dish` : "Select an ingredient, then tap the dish"}
                >
                  <span className="builder-base" />
                  {stage.kind === "prep" ? (
                    <span className="builder-prep-food" aria-hidden="true">
                      {stage.icon}<small>{stage.verb} {stage.food}</small>
                      <span>{Array.from({ length: prepCount }, (_, index) => <i key={index}>{stage.icon}</i>)}</span>
                    </span>
                  ) : (
                    <>
                      {placed.map((item, index) => item.mode === "spread" ? (
                        <span key={index} className="builder-layer" style={{ background: item.color, inset: `${10 + (index % 3) * 5}%` }} />
                      ) : (
                        <span key={index} className="builder-piece" style={{ left: `${item.x}%`, top: `${item.y}%` }}>{item.icon}</span>
                      ))}
                      {!placed.length && <span className="builder-dish-hint">Tap a food, then tap here</span>}
                    </>
                  )}
                </button>
              )}
              {stage.kind === "prep" && <p className="builder-stage-hint">Tap the board three times to prepare the food.</p>}
              {stage.kind === "add" && <p className="builder-stage-hint">{selected ? `Tap the dish to add ${selected}.` : "Drag food here, or tap a food and then tap the dish."}</p>}
            </section>
            <aside className="builder-ticket" aria-label="Recipe step card">
              <span className="little-kicker">Step {stageIndex + 1} of {stages.length}</span>
              <h2>{stage.title}</h2>
              <p>{stage.hint}</p>
              <div className="builder-needs" aria-label="Step progress">
                {stage.kind === "prep" && <ProgressRow icon={stage.icon} label={stage.food} count={prepCount} need={stage.need} />}
                {stage.kind === "add" && stage.items.map((item) =>
                  <ProgressRow key={item.food} icon={item.icon} label={item.food} count={count(item.food)} need={item.need} />)}
                {stage.kind === "cook" && <ProgressRow icon="🔥" label="Cook" count={Number(cooked)} need={1} />}
                {stage.kind === "quiz" && <ProgressRow icon="⭐" label="Answer" count={Number(quizCorrect)} need={1} />}
                {stage.kind === "serve" && <span>Ready to serve your customer!</span>}
              </div>
              {stage.kind !== "serve" && <div className="builder-controls">
                <button type="button" onClick={undo} disabled={stage.kind === "prep" ? prepCount === 0 : stage.kind === "add" ? currentPlaced.length === 0 : true}>↩ Undo</button>
                <button className="little-primary" type="button" onClick={advance} disabled={!ready}>Next step <IconArrowRight size={18} aria-hidden="true" /></button>
              </div>}
            </aside>
          </div>
        )}
      </main>
      {ghost && <span className="builder-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">{ghost.icon}</span>}
      {paused && !finished && <div className="game-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
        <div className="game-overlay-card"><h2>Take a kitchen break</h2><p>Your dish will be right here.</p>
          <button className="little-primary" type="button" onClick={() => setPaused(false)}>Resume cooking</button>
          <button type="button" onClick={onBack}>Back to recipes</button></div>
      </div>}
      {showRecipe && <div className="game-overlay" role="dialog" aria-modal="true" aria-label="Recipe for grown-ups">
        <div className="game-overlay-card assembly-recipe">
          <h2>For grown-ups: {recipe.title}</h2>
          <p>Check ingredient labels and cross-contact for allergies. Help children with cutting and real heat.</p>
          <h3>Ingredients</h3><ul>{recipe.ingredients.map(({ food, amount }) => <li key={food}>{amount} {food}</li>)}</ul>
          <h3>Steps</h3><ol>{recipe.adultSteps.map((step) => <li key={step}>{step}</li>)}</ol>
          <button className="little-primary" type="button" onClick={() => setShowRecipe(false)}>Close recipe</button>
        </div>
      </div>}
    </div>
  );
}

function ProgressRow({ icon, label, count, need }: { icon: string; label: string; count: number; need: number }) {
  return <div className="builder-progress-row"><span aria-hidden="true">{icon}</span><strong>{label}</strong>
    <span className="builder-pips" aria-label={`${count} of ${need} added`}>
      {Array.from({ length: need }, (_, index) => <i key={index} className={index < count ? "filled" : ""} />)}
    </span>
  </div>;
}
