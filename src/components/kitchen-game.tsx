"use client";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  IconArrowLeft,
  IconChefHat,
  IconClock,
  IconHeart,
  IconPlayerPlay,
  IconStar,
} from "@tabler/icons-react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { recipeChallenges } from "@/lib/chef-challenges";
import {
  appliance,
  cookingVessel,
  gameReducer,
  gameTask,
  ingredientSequence,
  initialGameState,
  prepFood,
  prepTool,
  type GameAction,
  type GameTool,
  type GameZone,
} from "@/lib/kitchen-game";

const foodArt: Record<string, string> = {
  "Black beans": "beans",
  Oats: "oats",
  Cocoa: "cocoa",
  Egg: "egg",
  "Whole wheat pita": "pita",
  Tomato: "tomato",
  Mozzarella: "mozzarella",
  "Plain yogurt": "yogurt",
  Banana: "banana-0",
  "Bell pepper": "pepper-0",
};
function IngredientImage({
  food,
  className = "",
}: {
  food: string;
  className?: string;
}) {
  return (
    <Image
      className={className}
      src={`/images/game/${foodArt[food] ?? food}.webp`}
      alt=""
      width={320}
      height={280}
      unoptimized
      draggable={false}
    />
  );
}
function GrabItem({
  item,
  label,
  children,
  onPick,
  onDrop,
  className = "",
}: {
  item: string;
  label: string;
  children: ReactNode;
  onPick: (item: string) => void;
  onDrop: (
    item: string,
    zone: GameZone,
    point?: { x: number; y: number },
  ) => void;
  className?: string;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const element = useRef<HTMLButtonElement>(null);
  const ghost = useRef<HTMLElement | null>(null);
  function end(event: PointerEvent<HTMLButtonElement>) {
    if (!start.current) return;
    ghost.current?.remove();
    ghost.current = null;
    const node = element.current;
    if (node) {
      node.style.pointerEvents = "none";
      const destination = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-drop-zone]");
      const zone = destination?.dataset.dropZone as GameZone | undefined;
      node.style.pointerEvents = "";
      node.classList.remove("dragging");
      if (moved.current && zone && destination) {
        const rect = destination.getBoundingClientRect();
        onDrop(item, zone, {
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }
    }
    start.current = null;
  }
  return (
    <button
      ref={element}
      type="button"
      className={`counter-grab ${className}`}
      aria-label={label}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        start.current = { x: event.clientX, y: event.clientY };
        moved.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!start.current) return;
        const dx = event.clientX - start.current.x,
          dy = event.clientY - start.current.y;
        if (Math.hypot(dx, dy) > 8) {
          moved.current = true;
          if (!ghost.current) {
            const clone = event.currentTarget.cloneNode(true) as HTMLElement;
            clone.classList.add("counter-drag-ghost");
            clone.style.width = `${event.currentTarget.offsetWidth}px`;
            document.body.appendChild(clone);
            ghost.current = clone;
          }
          ghost.current.style.left = `${event.clientX - ghost.current.offsetWidth / 2}px`;
          ghost.current.style.top = `${event.clientY - ghost.current.offsetHeight / 2}px`;
          event.currentTarget.classList.add("dragging");
        }
      }}
      onPointerUp={end}
      onPointerCancel={(event) => {
        start.current = null;
        ghost.current?.remove();
        ghost.current = null;
        event.currentTarget.classList.remove("dragging");
      }}
      onClick={() => {
        if (moved.current) {
          moved.current = false;
          return;
        }
        onPick(item);
      }}
    >
      {children}
    </button>
  );
}

export function KitchenGame({
  recipe,
  onBack,
  onSettings,
  onComplete,
  onCollection,
  chefAge = 7,
}: {
  recipe: LittleRecipe;
  onBack: () => void;
  onSettings: () => void;
  onComplete: (quizStars: number) => void;
  onCollection: () => void;
  chefAge?: number;
}) {
  const [state, setState] = useState(initialGameState);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [sound, setSound] = useState(false);
  const [paused, setPaused] = useState(false);
  const [challenge, setChallenge] = useState<number | null>(null);
  const [quizStars, setQuizStars] = useState(0);
  const [wrongAnswer, setWrongAnswer] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState(false);
  const [showHomeRecipe, setShowHomeRecipe] = useState(false);
  const seenChallenges = useRef(new Set<number>());
  const savedCompletion = useRef(false);
  const task = gameTask(state, recipe);
  const isPizza = recipe.id === "pizza",
    isPancakes = recipe.id === "pancakes";
  const prep = prepFood(recipe),
    tool = prepTool(recipe),
    vessel = cookingVessel(recipe),
    heat = appliance(recipe);
  const sequence = ingredientSequence(recipe);
  const placedPepper = state.toppingSpots.filter(
    (spot) => spot.food === "prepared",
  ).length;
  const activeZone: GameZone = ["place-prep", "prepare", "move-prep"].includes(
    state.phase,
  )
    ? "board"
    : ["add-ingredients", "mix", "fill-pan"].includes(state.phase)
      ? "bowl"
      : ["assemble", "spread-sauce", "load"].includes(state.phase)
        ? "tray"
        : state.phase === "finished"
          ? "plate"
          : heat;
  const stageIndex = ["place-prep", "prepare", "move-prep"].includes(state.phase)
    ? 0
    : ["add-ingredients", "mix", "fill-pan", "assemble", "spread-sauce"].includes(
          state.phase,
        )
      ? 1
      : ["load", "close-door", "set-heat", "heating", "flip", "open-door"].includes(
            state.phase,
          )
        ? 2
        : 3;
  useEffect(() => {
    const scroller = document.querySelector(".counter-workarea");
    const target = scroller?.querySelector<HTMLElement>(
      `[data-drop-zone="${activeZone}"]`,
    );
    if (scroller && target && window.matchMedia("(max-width: 650px)").matches)
      scroller.scrollTo({ left: target.offsetLeft - 12, behavior: "smooth" });
  }, [activeZone]);
  function playTick(frequency = 530) {
    if (!sound) return;
    try {
      const Audio = window.AudioContext;
      const context = new Audio();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.045, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.12);
      oscillator.onended = () => void context.close();
    } catch {
      /* Audio is optional. */
    }
  }
  function act(action: GameAction) {
    const next = gameReducer(state, action, recipe);
    if (next !== state) {
      setState(next);
      playTick(action.type === "WORK" ? 420 : 580);
      setFeedback("");
    } else if (action.type !== "TICK") {
      setFeedback("Try the food or tool named in your recipe card.");
    }
  }
  function place(
    item: string,
    zone: GameZone,
    point?: { x: number; y: number },
  ) {
    if (item.startsWith("tool:"))
      act({ type: "TOOL", tool: item.slice(5) as GameTool, zone });
    else act({ type: "MOVE", item, zone, point });
    setSelected(null);
  }
  function pick(item: string) {
    if (item.startsWith("tool:")) {
      const expected: GameZone =
        state.phase === "prepare"
          ? "board"
          : state.phase === "mix"
            ? "bowl"
            : "stove";
      place(item, expected);
      document.getElementById(`counter-${expected}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    } else {
      setSelected(item);
      setFeedback(
        `Picked up ${item === "prepared" ? `prepared ${prep.toLowerCase()}` : item === "batter" ? "batter" : item === "dish" ? "the dish" : item}. Move it to the highlighted place.`,
      );
    }
  }
  function zoneClick(zone: GameZone, event: MouseEvent<HTMLElement>) {
    if (selected) {
      const rect = event.currentTarget.getBoundingClientRect();
      place(selected, zone, {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      });
    }
  }
  useEffect(() => {
    if (state.phase !== "heating" || paused || challenge !== null) return;
    const timer = window.setInterval(
      () =>
        setState((current) => gameReducer(current, { type: "TICK" }, recipe)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [state.phase, recipe, paused, challenge]);
  useEffect(() => {
    const index = ["assemble", "add-ingredients"].includes(state.phase)
      ? 0
      : state.phase === "serve"
        ? 1
        : null;
    if (index !== null && !seenChallenges.current.has(index)) {
      seenChallenges.current.add(index);
      setChallenge(index);
    }
  }, [state.phase]);
  useEffect(() => {
    if (state.phase === "finished" && !savedCompletion.current) {
      savedCompletion.current = true;
      onComplete(quizStars);
    }
  }, [state.phase, onComplete, quizStars]);
  function readStep() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(`${task.title}. ${task.hint}`);
    speech.rate = 0.88;
    window.speechSynthesis.speak(speech);
  }
  const questions = recipeChallenges(recipe.id, chefAge);
  const ingredientAvailable = (food: string) =>
    (state.phase === "place-prep" && food === prep) ||
    (state.phase === "add-ingredients" &&
      sequence.includes(food) &&
      !state.added.includes(food)) ||
    (state.phase === "assemble" &&
      sequence.includes(food) &&
      !state.added.includes(food));
  const preparedOnBoard = state.phase === "move-prep";
  const showBatter = state.phase === "fill-pan";
  const dishOnCounter = state.phase === "load";
  const dishInAppliance = [
    "close-door",
    "set-heat",
    "heating",
    "flip",
    "open-door",
    "serve",
  ].includes(state.phase);
  const cooked =
    ["open-door", "serve", "finished"].includes(state.phase) ||
    (isPancakes && state.cookRound === 2);
  const validZone = (zone: GameZone) => {
    if (!selected) return false;
    if (selected === prep)
      return zone === "board" && state.phase === "place-prep";
    if (selected === "prepared")
      return (
        (zone === (isPizza ? "prep-cup" : "bowl") &&
          state.phase === "move-prep") ||
        (zone === "tray" && state.phase === "assemble")
      );
    if (selected === "batter")
      return zone === vessel && state.phase === "fill-pan";
    if (selected === "dish")
      return (
        (zone === heat && state.phase === "load") ||
        (zone === "plate" && state.phase === "serve")
      );
    return zone === (isPizza ? "tray" : "bowl");
  };
  const selectedDestination: GameZone | null = !selected
    ? null
    : selected === prep
      ? "board"
      : selected === "prepared"
        ? state.phase === "move-prep"
          ? isPizza
            ? "prep-cup"
            : "bowl"
          : "tray"
        : selected === "batter"
          ? vessel
          : selected === "dish"
            ? state.phase === "serve"
              ? "plate"
              : heat
            : isPizza
              ? "tray"
              : "bowl";
  const zoneProps = (zone: GameZone) => ({
    "data-drop-zone": zone,
    onClick: (event: MouseEvent<HTMLElement>) => zoneClick(zone, event),
    className: `counter-zone ${validZone(zone) ? "can-drop" : ""} ${activeZone === zone ? "active-zone" : ""}`,
  });
  return (
    <div className="little-app counter-app">
      <header className="little-header">
        <button onClick={onBack}>
          <IconArrowLeft size={19} />
          Menu
        </button>
        <span className="little-brand">
          <IconChefHat />
          Little Kitchen
        </span>
        <button onClick={() => setPaused((value) => !value)}>
          {paused ? "▶ Resume" : "Ⅱ Pause"}
        </button>
        <button onClick={onSettings}>Parent settings</button>
      </header>
      <main className="counter-game">
        <div className="counter-heading">
          <div>
            <span className="little-kicker">Make it yourself</span>
            <h1>{recipe.title}</h1>
            <p>
              Explore the kitchen. Move ingredients, choose tools, and watch
              your food change.
            </p>
          </div>
          <div className="counter-heading-actions">
            <span>
              <IconClock size={18} />
              {recipe.minutes} min with a grown-up
            </span>
            <button onClick={() => setSound((s) => !s)} aria-pressed={sound}>
              {sound ? "Sound on" : "Sound off"}
            </button>
          </div>
        </div>
        <ol className="counter-stages" aria-label="Cooking progress">
          {["Prep", "Make", "Cook", "Serve"].map((label, index) => (
            <li
              key={label}
              className={index < stageIndex ? "done" : index === stageIndex ? "current" : ""}
              aria-current={index === stageIndex ? "step" : undefined}
            >
              <span>{index + 1}</span> {label}
            </li>
          ))}
        </ol>
        <section className="counter-task" aria-live="polite">
          <div className="counter-task-icon">
            <IconChefHat size={30} />
          </div>
          <div className="counter-task-copy">
            <span className="counter-label">Chef’s recipe card</span>
            <h2>{task.title}</h2>
            <p>{task.hint}</p>
            <button className="counter-read-step" onClick={readStep}>
              🔊 Hear this step
            </button>
            <div
              className="counter-progress"
              role="progressbar"
              aria-label={`${task.title} progress`}
              aria-valuemin={0}
              aria-valuemax={task.total}
              aria-valuenow={task.done}
            >
              <span style={{ width: `${(task.done / task.total) * 100}%` }} />
            </div>
            <small>
              {task.done} of {task.total}{" "}
              {state.phase === "prepare"
                ? "cuts or presses"
                : state.phase === "mix"
                  ? "stirs"
                  : state.phase === "flip"
                    ? "turns"
                    : "done"}
            </small>
            {state.phase === "heating" && (
              <button
                className="counter-skip"
                onClick={() => act({ type: "SKIP_HEAT" })}
              >
                Skip pretend wait
              </button>
            )}
            {feedback && (
              <p className="counter-feedback" role="status">
                {feedback}
              </p>
            )}
          </div>
        </section>
        <div className="counter-scene">
          <div className="counter-backsplash">
            <div className="counter-window">
              <span className="sun" />
              <span className="hill" />
            </div>
            <div className="counter-hanging">
              <span className="pan-hook" />
              <span className="pan-hook" />
            </div>
          </div>
          <div className="counter-shelf">
            <div className="counter-shelf-title">
              <strong>Ingredients</strong>
              <span>
                Drag one into the kitchen, or tap it then tap its destination.
              </span>
            </div>
            <div className="counter-food-list">
              {recipe.ingredients.map((part) => (
                <div className="counter-food-slot" key={part.food}>
                  {ingredientAvailable(part.food) ? (
                    <GrabItem
                      item={part.food}
                      label={`Move ${part.food}`}
                      onPick={pick}
                      onDrop={place}
                      className={selected === part.food ? "chosen" : ""}
                    >
                      <IngredientImage food={part.food} />
                      <span>{part.food}</span>
                    </GrabItem>
                  ) : (
                    <div className="counter-food-used">
                      <IngredientImage food={part.food} />
                      <span>{part.food}</span>
                      <small>
                        {part.food === prep
                          ? state.phase === "prepare" ||
                            state.phase === "move-prep"
                            ? "On board"
                            : isPizza && !state.added.includes("prepared")
                              ? "In prep cup"
                              : isPizza
                                ? "On pizza"
                                : "In bowl"
                          : state.added.includes(part.food)
                            ? "Added"
                            : "Use later"}
                      </small>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="counter-surface">
            <nav className="counter-scene-nav" aria-label="Kitchen areas">
              {(
                [
                  "board",
                  "bowl",
                  "prep-cup",
                  "tray",
                  heat,
                  "plate",
                ] as GameZone[]
              ).map((zone) => (
                <button
                  key={zone}
                  className={activeZone === zone ? "active" : ""}
                  onClick={() =>
                    document
                      .querySelector(`[data-drop-zone="${zone}"]`)
                      ?.scrollIntoView({
                        inline: "center",
                        block: "nearest",
                        behavior: "smooth",
                      })
                  }
                >
                  {zone === "board"
                    ? "Board"
                    : zone === "bowl"
                      ? "Bowl"
                      : zone === "prep-cup"
                        ? "Cup"
                        : zone === "tray"
                          ? isPancakes
                            ? "Pan"
                            : "Tray"
                          : zone === "plate"
                            ? "Plate"
                            : isPancakes
                              ? "Stove"
                              : "Oven"}
                </button>
              ))}
            </nav>
            <div className="counter-workarea">
              <section {...zoneProps("board")} id="counter-board">
                <div className="zone-top">
                  <h3>Cutting board</h3>
                </div>
                <div className="counter-board">
                  <div className="board-grain" />
                  {state.phase === "place-prep" ? (
                    <p>Put the {prep.toLowerCase()} here</p>
                  ) : ["prepare", "move-prep"].includes(state.phase) ? (
                    <>
                      <div className="counter-pieces">
                        {state.pieces.map((hits, index) => (
                          <button
                            type="button"
                            key={index}
                            className={`counter-piece stage-${hits}`}
                            disabled={state.phase !== "prepare" || hits === 3}
                            onClick={(event) => {
                              event.stopPropagation();
                              act({ type: "WORK", index });
                            }}
                            aria-label={`${prep} piece ${index + 1}, ${hits} of 3 ${isPizza ? "cuts" : "presses"}`}
                          >
                            <Image
                              src={`/images/game/${isPizza ? "pepper" : "banana"}-${hits}.webp`}
                              alt=""
                              width={380}
                              height={300}
                              unoptimized
                              draggable={false}
                            />
                            <span>{hits}/3</span>
                          </button>
                        ))}
                      </div>
                      {preparedOnBoard && (
                        <GrabItem
                          item="prepared"
                          label={`Move prepared ${prep}`}
                          onPick={pick}
                          onDrop={place}
                          className="prepared-token"
                        >
                          <IngredientImage
                            food={`${isPizza ? "pepper" : "banana"}-3`}
                          />
                          <span>
                            Move {isPizza ? "chopped pepper" : "mashed banana"}
                          </span>
                        </GrabItem>
                      )}
                    </>
                  ) : (
                    <p className="board-mark">
                      {isPizza ? "Pepper chopped" : "Banana mashed"}
                      <span>✓</span>
                    </p>
                  )}
                </div>
              </section>
              <section {...zoneProps("bowl")} id="counter-bowl">
                <div className="zone-top">
                  <h3>Mixing bowl</h3>
                </div>
                <div
                  className={`counter-bowl ${state.phase === "mix" ? "stirring" : ""}`}
                >
                  <div
                    className={`bowl-contents bowl-${recipe.id} mixed-${Math.min(3, Math.floor(state.strokes / 2))}`}
                  >
                    <div className="bowl-foods">
                      {state.phase === "add-ingredients" ||
                      state.phase === "mix" ||
                      state.phase === "fill-pan" ||
                      state.phase === "load" ? (
                        <>
                          {!isPizza && (
                            <Image
                              src="/images/game/banana-3.webp"
                              alt=""
                              width={90}
                              height={70}
                              unoptimized
                            />
                          )}
                          {state.added.map((food) => (
                            <IngredientImage key={food} food={food} />
                          ))}
                        </>
                      ) : null}
                    </div>
                  </div>
                  <button
                    className="bowl-stir"
                    disabled={state.phase !== "mix" || state.tool !== "whisk"}
                    aria-label="Stir the mixture"
                    onClick={(event) => {
                      event.stopPropagation();
                      act({ type: "WORK" });
                    }}
                  >
                    Stir here
                  </button>
                </div>
                {showBatter && (
                  <GrabItem
                    item="batter"
                    label="Move bowl of batter"
                    onPick={pick}
                    onDrop={place}
                    className="pour-token"
                  >
                    <span className="pour-flow" />
                    Pour batter into the {isPancakes ? "pan" : "tray"}
                  </GrabItem>
                )}
              </section>
              <section
                {...zoneProps("prep-cup")}
                id="counter-prep-cup"
                className={`counter-zone counter-cup-zone ${validZone("prep-cup") ? "can-drop" : ""} ${activeZone === "prep-cup" ? "active-zone" : ""}`}
              >
                <div className="zone-top">
                  <h3>Prep cup</h3>
                </div>
                <div className="counter-prep-cup">
                  {isPizza &&
                  state.phase === "assemble" &&
                  !state.added.includes("prepared") ? (
                    <GrabItem
                      item="prepared"
                      label="Move chopped pepper from prep cup"
                      onPick={pick}
                      onDrop={place}
                    >
                      <Image
                        src="/images/game/pepper-3.webp"
                        alt=""
                        width={150}
                        height={110}
                        unoptimized
                      />
                      <span>Chopped pepper</span>
                      {state.added.includes("Mozzarella") && (
                        <small>{placedPepper} of 3 pieces placed</small>
                      )}
                    </GrabItem>
                  ) : (
                    <span>
                      {isPizza
                        ? "Keep chopped pepper here"
                        : "Set ingredients here as you cook"}
                    </span>
                  )}
                </div>
              </section>
              <section {...zoneProps(vessel)} id="counter-tray">
                <div className="zone-top">
                  <h3>{isPancakes ? "Skillet" : "Baking tray"}</h3>
                </div>
                <div
                  className={`counter-vessel ${isPancakes ? "skillet" : "baking-tray"} ${dishOnCounter ? "filled" : ""}`}
                >
                  {isPizza ? (
                    <div className="pizza-build">
                      {state.added.includes("Whole wheat pita") && (
                        <Image
                          src="/images/game/pita.webp"
                          alt="Pita base"
                          width={260}
                          height={230}
                          unoptimized
                        />
                      )}
                      {state.added.includes("Tomato") && (
                        <span
                          className="pizza-sauce"
                          style={{
                            width: `${state.phase === "spread-sauce" ? 30 + state.strokes * 7 : 65}%`,
                            height: `${state.phase === "spread-sauce" ? 35 + state.strokes * 7 : 70}%`,
                          }}
                        />
                      )}
                      {state.toppingSpots.map((spot, index) => (
                        <span
                          key={`${spot.food}-${index}`}
                          className={`pizza-topping ${spot.food === "Mozzarella" ? "cheese" : "pepper"}`}
                          style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                          aria-label={`${spot.food === "Mozzarella" ? "Cheese" : "Pepper"} topping placed`}
                        />
                      ))}
                      {state.phase === "spread-sauce" && (
                        <button
                          className="pizza-spread"
                          aria-label="Spread tomato sauce"
                          onPointerDown={(event) => {
                            event.currentTarget.setPointerCapture(
                              event.pointerId,
                            );
                          }}
                          onPointerMove={(event) => {
                            if (event.buttons) act({ type: "WORK" });
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            act({ type: "WORK" });
                          }}
                        >
                          Spread sauce
                        </button>
                      )}
                    </div>
                  ) : dishOnCounter || state.phase === "load" ? (
                    <div className={`counter-batter ${recipe.id}`} />
                  ) : (
                    <p>{isPancakes ? "Pour batter here" : "Build food here"}</p>
                  )}
                  {dishOnCounter && (
                    <GrabItem
                      item="dish"
                      label={`Move ${isPancakes ? "pan" : "tray"} to ${heat}`}
                      onPick={pick}
                      onDrop={place}
                      className="dish-grip"
                    >
                      {isPancakes ? "Move pan to stove" : "Move tray to oven"} →
                    </GrabItem>
                  )}
                </div>
              </section>
              <section {...zoneProps(heat)} id="counter-appliance">
                <div className="zone-top">
                  <h3>{isPancakes ? "Stove" : "Oven"}</h3>
                </div>
                <div
                  className={`counter-appliance ${isPancakes ? "stove" : "oven"} ${state.phase === "heating" ? "is-heating" : ""} ${dishInAppliance ? "has-dish" : ""} ${cooked ? "is-cooked" : ""}`}
                >
                  {isPancakes ? (
                    <>
                      <div className="stove-burner">
                        {dishInAppliance && (
                          <div
                            className={`stove-pancake ${state.cookRound === 2 ? "turned" : ""}`}
                          >
                            {cooked && (
                              <Image
                                src={recipe.image}
                                alt="Cooked pancakes"
                                width={160}
                                height={125}
                                unoptimized
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        className="heat-dial"
                        disabled={state.phase !== "set-heat"}
                        onClick={(event) => {
                          event.stopPropagation();
                          act({ type: "START_HEAT" });
                        }}
                        aria-label="Turn stove dial to cook"
                      >
                        <IconPlayerPlay size={22} />
                      </button>
                      {state.phase === "flip" && (
                        <button
                          className="flip-target"
                          disabled={state.tool !== "spatula"}
                          onClick={(event) => {
                            event.stopPropagation();
                            act({ type: "WORK" });
                          }}
                        >
                          Flip pancake
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="oven-face">
                        <div className="oven-interior">
                          {dishInAppliance && (
                            <div className="oven-dish">
                              {cooked ? (
                                <Image
                                  src={recipe.image}
                                  alt={`Cooked ${recipe.title}`}
                                  width={170}
                                  height={130}
                                  unoptimized
                                />
                              ) : (
                                <span className={`uncooked ${recipe.id}`} />
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          className={`oven-door ${["close-door", "set-heat", "heating"].includes(state.phase) ? "shut" : "open"}`}
                          onClick={(event) => {
                            if (state.phase === "close-door") {
                              event.stopPropagation();
                              act({ type: "CLOSE_DOOR" });
                            } else if (state.phase === "open-door") {
                              event.stopPropagation();
                              act({ type: "OPEN_DOOR" });
                            }
                          }}
                          aria-label={
                            state.phase === "close-door"
                              ? "Close oven door"
                              : state.phase === "open-door"
                                ? "Open oven door"
                                : "Oven door"
                          }
                        >
                          <span className="oven-handle" />
                          <span className="oven-glass" />
                        </button>
                      </div>
                      <button
                        className="heat-dial"
                        disabled={state.phase !== "set-heat"}
                        onClick={(event) => {
                          event.stopPropagation();
                          act({ type: "START_HEAT" });
                        }}
                        aria-label="Turn oven dial to cook"
                      >
                        <IconPlayerPlay size={22} />
                      </button>
                    </>
                  )}
                  {state.phase === "heating" && (
                    <div className="heat-count" aria-live="off">
                      {state.seconds}s
                    </div>
                  )}
                  {state.phase === "serve" && (
                    <GrabItem
                      item="dish"
                      label="Move cooked food to plate"
                      onPick={pick}
                      onDrop={place}
                      className="cooked-dish"
                    >
                      <Image
                        src={recipe.image}
                        alt=""
                        width={150}
                        height={120}
                        unoptimized
                      />
                      <span>Move to plate</span>
                    </GrabItem>
                  )}
                </div>
              </section>
              <section {...zoneProps("plate")} id="counter-plate">
                <div className="zone-top">
                  <h3>Serving plate</h3>
                </div>
                <div className="counter-plate">
                  {state.phase === "finished" ? (
                    <Image
                      src={recipe.image}
                      alt={recipe.title}
                      width={210}
                      height={180}
                      unoptimized
                    />
                  ) : (
                    <span>
                      {state.phase === "serve"
                        ? "Put your cooked food here"
                        : "Your meal will land here"}
                    </span>
                  )}
                </div>
              </section>
            </div>
            <div className="counter-toolrack">
              <strong>Pick a tool</strong>
              <div className="counter-tools">
                {(["knife", "masher", "whisk", "spatula"] as GameTool[]).map(
                  (t) => (
                    <GrabItem
                      key={t}
                      item={`tool:${t}`}
                      label={`Pick ${t}`}
                      onPick={pick}
                      onDrop={place}
                      className={`tool-${t} ${state.tool === t ? "active-tool" : ""}`}
                    >
                      <span className="tool-shape" />
                      <span>
                        {t === "knife"
                          ? "Child-safe knife"
                          : t === "masher"
                            ? "Masher"
                            : t === "whisk"
                              ? "Whisk"
                              : "Spatula"}
                      </span>
                    </GrabItem>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
        {state.phase === "finished" && (
          <div className="counter-win" role="status">
            <div className="celebration-confetti" aria-hidden="true">
              ✦ ✳ ✦ ★ ✳ ✦
            </div>
            <IconStar size={36} />
            <Image
              className="counter-win-food"
              src={recipe.image}
              alt={recipe.title}
              width={420}
              height={300}
              unoptimized
            />
            <div>
              <h2>You made {recipe.title.toLowerCase()}!</h2>
              <p>
                You did it, Chef! Your dish looks amazing. ⭐ {quizStars + 1}{" "}
                stars earned.
              </p>
              <p className="counter-win-fact">Food fact: {recipe.benefit}</p>
            </div>
            <div className="counter-win-actions">
              <button className="little-primary" onClick={onCollection}>
                Save to My Cookbook
              </button>
              <button onClick={onBack}>Cook something else</button>
              <button onClick={() => setShowHomeRecipe((value) => !value)}>
                Make this at home
              </button>
            </div>
          </div>
        )}
        {showHomeRecipe && (
          <section
            className="home-recipe-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Recipe for grown-ups"
          >
            <button
              className="home-recipe-close"
              onClick={() => setShowHomeRecipe(false)}
            >
              Close recipe
            </button>
            <h2>For grown-ups: {recipe.title}</h2>
            <p>
              {recipe.minutes} minutes in a real kitchen. Adult supervision is
              needed for sharp tools and hot surfaces. Check package labels and
              cross-contact for allergies.
            </p>
            <h3>Ingredients</h3>
            <ul>
              {recipe.ingredients.map((item) => (
                <li key={item.food}>
                  {item.amount} {item.food}
                </li>
              ))}
            </ul>
            <h3>Steps</h3>
            <ol>
              {recipe.adultSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <h3>Tools</h3>
            <p>
              {isPizza
                ? "Cutting board, child-safe knife, baking tray, and oven."
                : isPancakes
                  ? "Mixing bowl, masher, whisk, skillet, spatula, and stove."
                  : "Mixing bowl, masher, whisk, baking tray, and oven."}
            </p>
            <h3>Budget-friendly options</h3>
            <p>
              {isPizza
                ? "Frozen sliced peppers can work after thawing and drying. Compare pita and cheese prices at your store."
                : isPancakes
                  ? "Store-brand oats and ripe bananas often work well. Use the dairy option your family has confirmed is suitable."
                  : "Canned beans and store-brand oats can reduce preparation and shopping effort. Rinse canned beans before blending."}{" "}
              Check every replacement against the family’s allergy needs.
            </p>
            <p>
              Costs and substitutions depend on local prices and verified
              labels; none are estimated here.
            </p>
          </section>
        )}
        {paused && (
          <div
            className="game-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Game paused"
          >
            <div className="game-overlay-card">
              <h2>Take a kitchen break</h2>
              <p>Your food will be right here when you return.</p>
              <button
                className="little-primary"
                onClick={() => setPaused(false)}
              >
                Resume cooking
              </button>
              <button onClick={onBack}>Back to recipes</button>
            </div>
          </div>
        )}
        {challenge !== null && (
          <div
            className="game-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Chef Challenge"
          >
            <div className="game-overlay-card challenge-card">
              <span className="little-kicker">⭐ Chef Challenge!</span>
              <h2>{questions[challenge].question}</h2>
              {questions[challenge].answers.map((answer, index) => (
                <button
                  key={answer}
                  disabled={correctAnswer}
                  className="challenge-answer"
                  onClick={() => {
                    if (index === questions[challenge].correct) {
                      setCorrectAnswer(true);
                      setWrongAnswer(false);
                      setQuizStars((stars) => stars + 1);
                    } else setWrongAnswer(true);
                  }}
                >
                  {answer}
                </button>
              ))}
              {wrongAnswer && (
                <p role="status">
                  Nice try! Think about the food you just used, then choose
                  again.
                </p>
              )}
              {correctAnswer && (
                <>
                  <p role="status">
                    ✨ That’s right! {questions[challenge].explanation}
                  </p>
                  <button
                    className="little-primary"
                    onClick={() => {
                      setChallenge(null);
                      setCorrectAnswer(false);
                    }}
                  >
                    Keep cooking
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <details className="real-recipe">
          <summary>For grown-ups: ingredients & real cooking steps</summary>
          <p>
            {recipe.benefit} This is a pretend game timer. Check food labels and
            supervise real cooking.
          </p>
          <ul>
            {recipe.ingredients.map((i) => (
              <li key={i.food}>
                {i.amount} {i.food.toLowerCase()}
              </li>
            ))}
          </ul>
          <ol>
            {recipe.adultSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </details>
        <p className="little-footnote">
          <IconHeart size={16} /> Play here. Cook in real life with a grown-up.
        </p>
      </main>
      {selected && selectedDestination && (
        <div className="counter-selected-action" role="status">
          <span>{selected === "dish" ? "Dish" : selected === "prepared" ? `Prepared ${prep.toLowerCase()}` : selected} selected</span>
          <button
            type="button"
            onClick={() =>
              place(selected, selectedDestination, {
                x: 35 + (state.toppingSpots.length % 3) * 15,
                y: 40 + (state.toppingSpots.length % 2) * 20,
              })
            }
          >
            Place in {selectedDestination === "prep-cup" ? "prep cup" : selectedDestination}
          </button>
          <button type="button" aria-label="Cancel selection" onClick={() => setSelected(null)}>×</button>
        </div>
      )}
    </div>
  );
}
