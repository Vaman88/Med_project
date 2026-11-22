"use client";

import type React from "react";
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent,
} from "react";
import {
  IconArrowBackUp, IconArrowLeft, IconBulb, IconPlayerPause, IconPlayerPlay, IconSparkles, IconVolume, IconVolumeOff,
} from "@tabler/icons-react";
import { garnishFor, garnishSpot, plateDish } from "@/lib/plating";
import { Garnish, Sparkles, Steam } from "./finale-garnish";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { recipeChallenges } from "@/lib/chef-challenges";
import {
  answerAsset, dishSchema, doCut, doFlip, doMash, doPaint, doPour, doScoop, doStir, dropItem, emptyDish,
  finalSurface, planFor, setHeat, simulatedSeconds, stepDone, trayItems, totalScoops,
  type AssetKey, type DishState, type Step,
} from "@/lib/cooking";
import {
  BOARD, BOWL, GLASS, PAN, PITA, PLATE, viewFor,
  glassSurfaceY, paintAt, paintNext,
  type Point, type Surface, type ViewBox,
} from "@/lib/cooking-geometry";
import { SOUND_KEY, playSound, type SoundName, type SoundOptions } from "@/lib/sound";
import { ChopBoard, chopLayout } from "./gestures/chop-board";
import { MashBowl, mashLumps } from "./gestures/mash-bowl";
import { WhiskBowl, stirTool } from "./gestures/whisk-bowl";
import type { GestureHandle, GestureHost } from "./gestures/host";
import { AssetIcon, ASSET_LABEL } from "./food-art";
import { CookingScene, noFx, ToolIcon, type Fx } from "./cooking-scene";
import { InteractiveSprig, Sprig, sprigGrowth, type SprigMood } from "./sprig";

type Rect = { x: number; y: number; w: number; h: number };
type Hotspot = {
  id: string; label: string; rect: Rect; round?: boolean; marker?: string;
  /** `viaPointer` is false when the button is pressed from the keyboard. */
  onActivate: (point: Point | null, viaPointer?: boolean) => void;
};
const SPEED = { settle: 700, scoop: 1000, pour: 1300, advance: 950 };
/** How far above a fingertip dragged food is held on touch screens, in CSS pixels. */
const FINGER_LIFT = 64;
const zoneRect = (s: Surface): Rect => {
  switch (s) {
    case "glass": return { x: 262, y: 56, w: 276, h: 396 };
    case "bowl": return { x: BOWL.cx - 196, y: BOWL.cy - 196, w: 392, h: 392 };
    case "pita": return { x: PITA.cx - 190, y: PITA.cy - 190, w: 380, h: 380 };
    case "pan": return { x: PAN.cx - 204, y: PAN.cy - 190, w: 408, h: 380 };
    case "plate": return { x: PLATE.cx - 224, y: PLATE.cy - 200, w: 448, h: 400 };
    default: return { x: BOARD.cx - BOARD.rx, y: BOARD.cy - BOARD.ry, w: BOARD.rx * 2, h: BOARD.ry * 2 };
  }
};
// Where the spoon picks food up. On a phone the glass is framed so closely that the
// yogurt comes straight up from the tray below, rather than from a bowl beside it.
const sourcePoint = (s: Step, tall = false): Point => s.kind === "scoop" && s.into === "glass" ? (tall ? { x: 330, y: 500 } : { x: 205, y: 372 })
  : s.kind === "scoop" && s.into === "bowl" ? { x: 205, y: 404 }
    : s.kind === "scoop" ? { x: 205, y: 396 } : { x: 205, y: 90 };

/** Kitchen Friends bowl colours, one per ingredient in the tray. */
const BOWL_COLORS = ["#ff9db5", "#8fd6c8", "#ffe08a", "#c7b4f0", "#9fd0ff", "#ffb38a"];
/**
 * A smiling bowl that holds one ingredient in the tray. The food sits in the bowl's mouth,
 * so every ingredient reads as one clear item, never a crowded pile.
 */
function TrayBowl({ index, children }: { index: number; children: React.ReactNode }) {
  const c = BOWL_COLORS[index % BOWL_COLORS.length];
  return (
    <span className="ck-bowl" style={{ ["--bowl" as string]: c }}>
      <span className="ck-bowl-back" aria-hidden="true" />
      <span className="ck-bowl-food">{children}</span>
      <svg className="ck-bowl-front" viewBox="0 0 120 56" aria-hidden="true" focusable="false">
        <path d="M4 4 C6 34 30 52 60 52 C90 52 114 34 116 4 Q60 22 4 4Z" fill={c} stroke="rgb(74 40 52 / 55%)" strokeWidth="3" strokeLinejoin="round" />
        <path d="M16 20 C20 32 28 40 38 44" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
        <ellipse cx="42" cy="34" rx="5.5" ry="3.4" fill="#ff7f9a" opacity=".55" />
        <ellipse cx="78" cy="34" rx="5.5" ry="3.4" fill="#ff7f9a" opacity=".55" />
        <circle cx="50" cy="28" r="3.6" fill="#4a2c22" /><circle cx="70" cy="28" r="3.6" fill="#4a2c22" />
        <circle cx="49" cy="26.8" r="1.2" fill="#fff" /><circle cx="69" cy="26.8" r="1.2" fill="#fff" />
        <path d="M56 33 Q60 37.5 64 33" fill="none" stroke="#4a2c22" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return reduced;
}
function useTallView() {
  const [tall, setTall] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-aspect-ratio: 5/4)");
    const update = () => setTall(q.matches);
    update();
    q.addEventListener("change", update);
    return () => q.removeEventListener("change", update);
  }, []);
  return tall;
}

export function CookingStudio({
  recipe, onBack, onSettings, onComplete, onSave, onCollection, chefAge, saved, avoid = [], sprigDishes = 0,
}: {
  recipe: LittleRecipe;
  /** The child's allergy choices; optional extras containing them are never offered. */
  avoid?: readonly string[];
  onBack: () => void;
  onSettings: () => void;
  onComplete: (stars: number) => void;
  onSave: (dish: DishState) => void;
  onCollection: () => void;
  chefAge: number;
  /** Dishes finished before this one; Sprig, the companion, grows with them. */
  sprigDishes?: number;
  saved: boolean;
}) {
  const plan = useMemo(() => planFor(recipe), [recipe]);
  const questions = useMemo(() => recipeChallenges(recipe.id, chefAge), [recipe.id, chefAge]);
  const reduced = useReducedMotion();
  const tall = useTallView();

  const [index, setIndex] = useState(0);
  const [hist, setHist] = useState<{ dish: DishState; past: DishState[] }>({ dish: emptyDish(), past: [] });
  const { dish } = hist;
  const [selected, setSelected] = useState<AssetKey | null>(null);
  const [fx, setFx] = useState<Fx>(noFx);
  const [paused, setPaused] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [nudge, setNudge] = useState("");
  const [sound, setSound] = useState(true);
  const [ghost, setGhost] = useState<{ asset: AssetKey; x: number; y: number } | null>(null);
  const [quiz, setQuiz] = useState<{ wrong: number[]; right: boolean }>({ wrong: [], right: false });
  const [mistakes, setMistakes] = useState(0);
  const [showRecipe, setShowRecipe] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [cooking, setCooking] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const timers = useRef<number[]>([]);
  const gesture = useRef<{ moved: boolean; client: Point; pushed: boolean } | null>(null);
  /** The active chop, mash or whisk gesture; labelled hotspots call into it. */
  const gestureRef = useRef<GestureHandle | null>(null);
  const suppressClick = useRef(false);
  const fxKey = useRef(1);
  const completed = useRef(false);
  const drag = useRef<{ asset: AssetKey; startX: number; startY: number; moved: boolean; id: number; lift: number } | null>(null);
  const dishRef = useRef(dish);
  dishRef.current = dish;

  const finished = index >= plan.length;
  const step: Step | null = finished ? null : plan[index];
  const surface: Surface = step?.surface ?? finalSurface(recipe);
  // Close framing for the current action (overhead board, angled glass, round dish).
  const view: ViewBox = viewFor(surface, tall);
  const locked = () => paused || advancing || Date.now() < lockUntil.current;

  useEffect(() => {
    try { setSound(localStorage.getItem(SOUND_KEY) !== "off"); } catch { /* optional */ }
    return () => timers.current.forEach(window.clearTimeout);
  }, []);

  // ---- keep progress through app switches, reloads and rotation --------------
  // The dish in progress lives in sessionStorage for this tab, so returning from
  // another app (or a browser that reloaded the tab) picks up at the same step.
  const progressKey = `healthy-steps-cooking-${recipe.id}`;
  const restored = useRef(false);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(progressKey);
      const saved = raw ? JSON.parse(raw) as { v?: number; index?: number; dish?: unknown; mistakes?: number } : null;
      const parsed = saved?.v === 1 ? dishSchema.safeParse(saved.dish) : null;
      if (parsed?.success && Number.isInteger(saved!.index) && saved!.index! > 0 && saved!.index! < plan.length) {
        dishRef.current = parsed.data;
        setHist({ dish: parsed.data, past: [] });
        setIndex(saved!.index!);
        setMistakes(Number.isInteger(saved!.mistakes) ? saved!.mistakes! : 0);
      }
    } catch { /* starting fresh is fine */ }
    restored.current = true;
  }, [progressKey, plan.length]);
  useEffect(() => {
    if (!restored.current) return;
    try {
      if (index >= plan.length || (index === 0 && !hist.dish.drops.length)) sessionStorage.removeItem(progressKey);
      else sessionStorage.setItem(progressKey, JSON.stringify({ v: 1, index, dish: hist.dish, mistakes }));
    } catch { /* optional */ }
  }, [index, hist.dish, mistakes, plan.length, progressKey]);
  // Leaving the app pauses the game, so no pretend timer runs while the child is away.
  useEffect(() => {
    const away = () => { if (document.visibilityState === "hidden") setPaused(true); };
    document.addEventListener("visibilitychange", away);
    return () => document.removeEventListener("visibilitychange", away);
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, reduced ? Math.min(ms, 60) : ms);
    timers.current.push(id);
  }, [reduced]);
  const say = useCallback((name: SoundName, opts?: SoundOptions) => { if (sound) playSound(name, opts); }, [sound]);
  const patchFx = useCallback((patch: Partial<Fx>) => setFx((f) => ({ ...f, ...patch })), []);

  /** Apply a change to the dish, remembering the previous one so it can be undone. */
  const commit = useCallback((change: (d: DishState) => DishState, merge = false) => {
    // The ref moves first, so two taps in the same frame build on each other
    // instead of both starting from the old dish.
    const prev = dishRef.current;
    const next = change(prev);
    if (next === prev) return;
    dishRef.current = next;
    setHist((h) => ({ dish: next, past: merge ? h.past : [...h.past, prev] }));
  }, []);
  const toast = useCallback((text: string) => {
    setNudge(text);
    later(() => setNudge((n) => (n === text ? "" : n)), 3200);
  }, [later]);

  // ---- finishing a step moves on after a short, visible settle -------------
  // A step with a Finish button (free decorating) waits for the child to say it is done.
  const [finishedSteps, setFinishedSteps] = useState<string[]>([]);
  const needsFinish = !!step && step.kind === "drop" && !!step.finish && !finishedSteps.includes(step.id);
  const done = step ? stepDone(step, dish) && !needsFinish : false;
  useEffect(() => {
    if (!done || paused) return;
    setAdvancing(true);
    const id = window.setTimeout(() => {
      setIndex((i) => i + 1);
      setHist((h) => ({ dish: h.dish, past: [] }));
      setSelected(null);
      setHintOpen(false);
      setFx(noFx);
      setQuiz({ wrong: [], right: false });
      setAdvancing(false);
      setNudge("");
    }, reduced ? 150 : SPEED.advance);
    return () => { window.clearTimeout(id); setAdvancing(false); };
  }, [done, paused, reduced]);

  useEffect(() => {
    if (finished && !completed.current) {
      completed.current = true;
      say("done");
      onComplete(mistakes ? 0 : 1);
    }
  }, [finished, mistakes, onComplete, say]);

  // ---- pretend cooking timer ------------------------------------------------
  useEffect(() => {
    if (!cooking || paused || !step || step.kind !== "cook") return;
    const s = step;
    patchFx({ cooking: true });
    let ticks = 0;
    const id = window.setInterval(() => {
      ticks++;
      if (ticks % 6 === 1) say("sizzle");
      commit((d) => {
        const next = Math.min(1, (d.heat[s.id] ?? 0) + 100 / (s.seconds * 1000));
        return setHeat(d, s, next);
      }, true);
      if ((dishRef.current.heat[s.id] ?? 0) >= 0.995) {
        window.clearInterval(id);
        setCooking(false);
        patchFx({ cooking: false });
        commit((d) => setHeat(d, s, 1), true);
        say("chime");
      }
    }, 100);
    return () => { window.clearInterval(id); patchFx({ cooking: false }); };
  }, [cooking, paused, step, commit, patchFx, say]);

  // ---- helpers --------------------------------------------------------------
  const toSvg = useCallback((e: { clientX: number; clientY: number }): Point => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || !r.width) return { x: view.x + view.w / 2, y: view.y + view.h / 2 };
    return { x: view.x + ((e.clientX - r.left) / r.width) * view.w, y: view.y + ((e.clientY - r.top) / r.height) * view.h };
  }, [view]);

  const landed = (id: number) => {
    patchFx({ landed: id });
    later(() => setFx((f) => (f.landed === id ? { ...f, landed: null } : f)), SPEED.settle);
  };

  function place(asset: AssetKey, point?: Point) {
    if (!step || locked()) return;
    if (step.kind === "drop") {
      const before = dishRef.current;
      const next = dropItem(before, step, plan, asset, point);
      if (next === before) { toast("That one is all done. Try another ingredient."); return; }
      commit(() => next);
      say(step.fixed ? "plop" : "plop");
      landed(next.nextId - 1);
      setSelected(null);
    } else if (step.kind === "scoop" && asset === step.asset) {
      startScoop(step);
    } else if (step.kind === "pour" && asset === step.asset) {
      startPour(step);
    }
  }
  function startScoop(s: Extract<Step, { kind: "scoop" }>) {
    if (locked() || (dishRef.current.scoops[s.id] ?? 0) >= s.count) return;
    const from = sourcePoint(s, tall);
    const to: Point = s.into === "glass"
      ? { x: GLASS.cx, y: glassSurfaceY(totalScoops(dishRef.current, plan, "glass")) - 64 }
      : s.into === "bowl" ? { x: BOWL.cx, y: BOWL.cy - 60 } : { x: PLATE.cx, y: PLATE.cy - 50 };
    lockUntil.current = Date.now() + (reduced ? 120 : SPEED.scoop);
    setSelected(null);
    say("scoop");
    if (!reduced) patchFx({ spoon: { key: fxKey.current++, kind: "scoop", from, to, asset: s.asset } });
    later(() => {
      commit((d) => doScoop(d, s));
      patchFx({ landed: -1 });
      say("plop");
    }, 640);
    later(() => patchFx({ spoon: null, landed: null }), SPEED.scoop);
  }
  function startPour(s: Extract<Step, { kind: "pour" }>) {
    if (locked() || dishRef.current.poured[s.id]) return;
    lockUntil.current = Date.now() + (reduced ? 120 : SPEED.pour);
    setSelected(null);
    say("scoop");
    if (!reduced) patchFx({ spoon: { key: fxKey.current++, kind: "pour", from: { x: 205, y: 396 }, to: { x: 330, y: 110 }, asset: s.asset } });
    later(() => { commit((d) => doPour(d, s)); say("plop"); }, 760);
    later(() => patchFx({ spoon: null }), SPEED.pour);
  }
  // ---- gestures on the work surface ---------------------------------------
  // Chopping, mashing and whisking live in ./gestures; spreading stays here.
  function stageDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!step || locked() || e.button > 0 || step.kind !== "spread") return;
    gesture.current = { moved: false, client: { x: e.clientX, y: e.clientY }, pushed: false };
    const move = (ev: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      if (Math.hypot(ev.clientX - g.client.x, ev.clientY - g.client.y) > 8) g.moved = true;
      if (!g.moved) return;
      spreadMove(toSvg(ev), g);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const g = gesture.current;
      gesture.current = null;
      if (g?.moved) markDragged();
      setFx((f) => ({ ...f, pointer: null }));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  function spreadMove(p: Point, g: NonNullable<typeof gesture.current>) {
    if (!step || step.kind !== "spread") return;
    patchFx({ pointer: p });
    const s = step;
    const first = !g.pushed;
    g.pushed = true;
    commit((d) => doPaint(d, s, paintAt(d.paint[s.id] ?? [], p, s.medium === "sauce" ? 40 : 34)), !first);
    if (Math.random() < 0.12) say("stir");
  }
  /** A drag just ended: the click that follows it must not count as a tap. */
  function markDragged() {
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 60);
  }

  // ---- chop, mash and whisk gestures ----------------------------------------
  // The youngest chefs (5 and 6) get tap-only actions: no dragging needed anywhere.
  const tapOnly = chefAge <= 6;
  const gestureHost: GestureHost = {
    stageRef, view, toSvg, locked, reduced, tapOnly,
    sound: say,
    nudge: (text) => { toast(text); say("nudge"); },
    dragged: markDragged,
  };
  // How to do the current gesture, in Seedy's words (the recipe's step data is unchanged).
  const stirWhere = surface === "pan" ? "pan" : "bowl";
  const hintText = !step ? "" : step.kind === "cut"
    ? (tapOnly ? "Tap the food, or tap a number, and the knife chops for you. Each cut makes a new piece."
      : "Swipe the knife down through each dashed line, or tap a number. Each cut makes a new piece.") + " Ask a grown-up to help with real knives."
    : step.kind === "mash"
      ? (tapOnly ? "Tap the lumps to squash them. Keep going until the bar says Smooth!"
        : "Press the masher on the lumps, or hold it down and scrub. Keep going until the bar says Smooth!")
      : step.kind === "stir"
        ? (tapOnly ? `Press and hold the ${stirWhere} and it stirs by itself. Tapping stirs a little, too.`
          : `Draw circles in the ${stirWhere} to mix it. You can also press and hold, or tap to stir a quarter turn at a time.`)
        : step.hint;
  function onCut(i: number) {
    if (!step || step.kind !== "cut" || dishRef.current.cuts[step.id]?.includes(i)) return;
    const s = step;
    commit((d) => doCut(d, s, i));
    say("chop", { food: s.food });
  }
  function onMash(i: number) {
    if (!step || step.kind !== "mash") return;
    const s = step;
    commit((d) => doMash(d, s, i));
  }
  function onStir(degrees: number, merge: boolean) {
    if (!step || step.kind !== "stir") return;
    const s = step;
    commit((d) => doStir(d, s, Math.min(degrees, 40)), merge);
  }

  function activateStage(point: Point | null) {
    if (!step || locked() || suppressClick.current) return;
    if (step.kind === "spread") {
      const s = step;
      commit((d) => doPaint(d, s, point ? paintAt(d.paint[s.id] ?? [], point, 62) : paintNext(d.paint[s.id] ?? [])));
      say("stir");
    } else if (step.kind === "stir") {
      const s = step;
      commit((d) => doStir(d, s, 90));
      say("stir", { speed: 0.6 });
    }
  }
  function zoneClick(e: ReactMouseEvent) {
    if (suppressClick.current || !step || locked()) return;
    const point = e.detail > 0 ? toSvg(e) : null;
    if (step.kind === "spread" || step.kind === "stir") { activateStage(point); return; }
    if (step.kind !== "drop" && step.kind !== "scoop" && step.kind !== "pour") return;
    const items = trayItems(step, dish).filter((i) => i.left > 0);
    const asset = selected ?? (items.length === 1 ? items[0].asset : null);
    if (!asset) { toast("Pick an ingredient from the tray first."); return; }
    place(asset, point ?? undefined);
  }

  // ---- dragging an ingredient from the tray -------------------------------
  function chipDown(e: ReactPointerEvent<HTMLButtonElement>, asset: AssetKey) {
    if (e.button > 0) return;
    // On touch the food rides above the fingertip so the child can see where it will land.
    drag.current = { asset, startX: e.clientX, startY: e.clientY, moved: false, id: e.pointerId, lift: e.pointerType === "mouse" ? 0 : FINGER_LIFT };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function chipMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 8) d.moved = true;
    if (d.moved) setGhost({ asset: d.asset, x: e.clientX, y: e.clientY - d.lift });
  }
  function chipUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    drag.current = null;
    setGhost(null);
    if (!d?.moved) return;
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 60);
    // The food lands where it was drawn: above the finger on touch, under the cursor with a mouse.
    const at = { clientX: e.clientX, clientY: e.clientY - d.lift };
    const r = stageRef.current?.getBoundingClientRect();
    if (!r || at.clientX < r.left || at.clientX > r.right || at.clientY < r.top || at.clientY > r.bottom) {
      toast("Drop it onto the dish.");
      return;
    }
    const p = toSvg(at);
    const zr = step ? zoneRect(step.surface) : null;
    const slack = zr ? Math.max(zr.w, zr.h) * 0.18 : 0; // forgiving: a near miss still counts
    if (zr && (p.x < zr.x - slack || p.x > zr.x + zr.w + slack || p.y < zr.y - slack || p.y > zr.y + zr.h + slack)) {
      toast("Drop it onto the dish.");
      return;
    }
    place(d.asset, p);
  }

  function undo() {
    if (locked() || cooking) return;
    setHist((h) => (h.past.length ? { dish: h.past[h.past.length - 1], past: h.past.slice(0, -1) } : h));
    setSelected(null);
    setFx((f) => ({ ...f, spoon: null }));
    say("pick");
  }
  function startOver() {
    try { sessionStorage.removeItem(progressKey); } catch { /* optional */ }
    setFinishedSteps([]);
    setIndex(0);
    setHist({ dish: emptyDish(), past: [] });
    setSelected(null);
    setFx(noFx);
    setCooking(false);
    setQuiz({ wrong: [], right: false });
    setMistakes(0);
    setPaused(false);
    completed.current = false;
  }
  function readStep() {
    if (!step || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(`${step.title}. ${hintText}`);
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
  function toggleSound() {
    setSound((on) => {
      try { localStorage.setItem(SOUND_KEY, on ? "off" : "on"); } catch { /* optional */ }
      return !on;
    });
  }

  // ---- hotspots (also the keyboard route) -----------------------------------
  const hotspots: Hotspot[] = [];
  if (step && !finished) {
    if (step.kind === "drop" || step.kind === "scoop" || step.kind === "pour") {
      const target = step.kind === "drop" ? step.zone : step.kind === "pour" ? "pan" : step.into;
      const name = target === "glass" ? "the glass" : target === "board" ? "the cutting board" : target === "bowl" ? "the bowl"
        : target === "pita" ? "the pizza" : target === "plate" ? "the plate" : recipe.id === "brownies" ? "the tray" : "the pan";
      hotspots.push({
        id: "zone", label: `Put ${selected ? ASSET_LABEL[selected]?.toLowerCase() : "the selected ingredient"} on ${name}`,
        rect: zoneRect(target), round: target === "bowl" || target === "pita", onActivate: () => undefined,
      });
    } else if (step.kind === "cut") {
      // One labelled button per uncut line, just above the food (tap and keyboard route).
      const lay = chopLayout(step, dish);
      lay.guides.forEach(({ index: i, x }) => {
        hotspots.push({ id: `cut-${i}`, label: `Cut mark ${i + 1} of ${step.cuts}`, rect: { x: x - 38, y: Math.max(view.y + 6, Math.min(120, lay.top - 88)), w: 76, h: 76 }, round: true, marker: String(i + 1), onActivate: (_p, via) => gestureRef.current?.tap(i, !!via) });
      });
    } else if (step.kind === "mash") {
      mashLumps(step).forEach((at, i) => {
        if (dish.mash[step.id]?.includes(i)) return;
        hotspots.push({ id: `mash-${i}`, label: `Mash spot ${i + 1} of ${step.spots}`, rect: { x: at.x - 38, y: at.y - 38, w: 76, h: 76 }, round: true, marker: "", onActivate: (_p, via) => gestureRef.current?.tap(i, !!via) });
      });
    } else if (step.kind === "spread") {
      hotspots.push({ id: "spread", label: step.medium === "sauce" ? "Spread sauce on the pizza" : step.medium === "cheese" ? "Sprinkle cheese on the pizza" : step.title, rect: zoneRect("pita"), round: true, onActivate: () => undefined });
    } else if (step.kind === "stir") {
      hotspots.push({ id: "stir", label: "Stir the bowl", rect: zoneRect("bowl"), round: true, onActivate: () => undefined });
    } else if (step.kind === "flip") {
      const single = step.count === 1;
      (single ? [{ x: 400, y: 262 }] : [{ x: 338, y: 226 }, { x: 466, y: 232 }, { x: 402, y: 336 }]).forEach((at, i) => {
        if (dish.flipped.includes(i) || !step) return;
        const s = step;
        const half = single ? 140 : 62;
        hotspots.push({
          id: `flip-${i}`, label: single ? step.title : `Flip pancake ${i + 1} of 3`, rect: { x: at.x - half, y: at.y - half, w: half * 2, h: half * 2 }, round: true,
          onActivate: () => {
            if (locked()) return;
            lockUntil.current = Date.now() + (reduced ? 100 : 700);
            patchFx({ flip: { index: i, key: fxKey.current++ } });
            say("plop");
            later(() => commit((d) => doFlip(d, s, i)), 260);
            later(() => patchFx({ flip: null }), 700);
          },
        });
      });
    }
  }

  const offLimits = new Set(step && step.kind === "drop" ? step.items.filter((i) => i.allergen && avoid.includes(i.allergen)).map((i) => i.asset) : []);
  const tray = step ? trayItems(step, dish).filter((i) => i.left > 0 && !offLimits.has(i.asset)) : [];
  const requiredLeft = step && step.kind === "drop" ? !stepDone(step, dish) : true;
  const toolFor: Record<string, "knife" | "masher" | "spoon" | "spatula" | "whisk" | undefined> = {
    cut: "knife", mash: "masher", spread: "spoon", stir: stirTool(recipe.id, surface), flip: "spatula",
  };
  const toolName = { knife: "Knife", masher: "Masher", spoon: "Spoon", spatula: "Spatula", whisk: "Whisk" } as const;
  const hasPast = hist.past.length > 0 && !cooking && !advancing;
  const heatNow = step?.kind === "cook" ? dish.heat[step.id] ?? 0 : 0;
  const stageClass = `ck-stage${step && ["cut", "mash", "spread", "stir"].includes(step.kind) ? " ck-gesture" : ""}`;
  const ar = view.w / view.h;
  const question = step?.kind === "quiz" ? questions[step.index] : null;
  const pretendSeconds = simulatedSeconds(plan);
  // Sprig reacts to what is happening: a finished step, an open hint or a gentle nudge.
  const sprigMood: SprigMood = advancing ? "cheer" : nudge ? "encourage" : hintOpen || step?.kind === "quiz" ? "think" : "hello";

  if (finished) {
    return (
      <Finale
        recipe={recipe} plan={plan} dish={dish} view={view} ar={ar} saved={saved}
        pretendSeconds={pretendSeconds}
        onAgain={onBack}
        onSave={(finished) => onSave(finished)}
        onCollection={onCollection}
        onRecipe={() => setShowRecipe(true)}
        showRecipe={showRecipe} closeRecipe={() => setShowRecipe(false)}
        stars={mistakes ? 1 : 2}
        sprigDishes={sprigDishes}
      />
    );
  }

  return (
    <div className="ck-app" data-surface={surface} data-step-kind={step?.kind}>
      <header className="ck-top">
        <button type="button" className="ck-icon-btn" onClick={onBack} aria-label="Back to menu"><IconArrowLeft size={22} aria-hidden="true" /></button>
        <h1 className="ck-title">{recipe.title}</h1>
        <ol className="ck-progress" aria-label={`Step ${index + 1} of ${plan.length}`}>
          {plan.map((s, i) => <li key={s.id} className={i < index ? "done" : i === index ? "current" : ""} aria-current={i === index ? "step" : undefined} />)}
        </ol>
        <div className="ck-top-actions">
          <button type="button" className="ck-icon-btn" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Sound on" : "Sound off"}>
            {sound ? <IconVolume size={22} aria-hidden="true" /> : <IconVolumeOff size={22} aria-hidden="true" />}
          </button>
          <button type="button" className="ck-icon-btn" onClick={() => setPaused(true)} aria-label="Pause"><IconPlayerPause size={22} aria-hidden="true" /></button>
        </div>
      </header>
      <main className="ck-main">
        <div className="ck-instruction" role="status" aria-live="polite">
          <p className="ck-step-title" key={step?.id}>{step?.title}</p>
          <div className="ck-instruction-actions">
            {step?.kind !== "quiz" && <>
              <button type="button" className="ck-pill" aria-expanded={hintOpen} onClick={() => setHintOpen((v) => !v)}><IconBulb size={18} aria-hidden="true" /> Hint</button>
              <button type="button" className="ck-pill" onClick={undo} disabled={!hasPast} aria-label="Undo last move"><IconArrowBackUp size={18} aria-hidden="true" /> Undo</button>
            </>}
          </div>
          {(hintOpen || nudge) && (
            <p className="ck-hint">
              {nudge || hintText}
              {hintOpen && !nudge && <button type="button" className="ck-link" onClick={readStep}>Read it to me</button>}
            </p>
          )}
        </div>
        <div className="ck-stage-wrap">
          {/* Sprig stands right beside the dish on larger screens (big, never over the food). */}
          {!question && <InteractiveSprig className="ck-dish-sprig ck-dish-sprig-side" mood={sprigMood} dishes={sprigDishes} size={190} />}
          <div ref={stageRef} className={stageClass} style={{ aspectRatio: ar, "--ar": ar } as React.CSSProperties} onPointerDown={stageDown} data-armed={selected ? "true" : undefined} data-tap-only={tapOnly ? "true" : undefined}>
            <div className="ck-scene-fade" key={surface}>
              <CookingScene recipe={recipe} plan={plan} dish={dish} step={step} surface={surface} fx={fx} view={view} />
            </div>
            {step?.kind === "cut" && <ChopBoard key={step.id} step={step} dish={dish} host={gestureHost} handleRef={gestureRef} onCut={onCut} />}
            {step?.kind === "mash" && <MashBowl key={step.id} step={step} dish={dish} host={gestureHost} handleRef={gestureRef} onMash={onMash} />}
            {step?.kind === "stir" && <WhiskBowl key={step.id} step={step} dish={dish} host={gestureHost} handleRef={gestureRef} recipeId={recipe.id} surface={surface} onStir={onStir} />}
            {!paused && !advancing && hotspots.map((h) => (
              <button
                key={h.id}
                type="button"
                className={`ck-hot${h.round ? " round" : ""}${h.marker ? " marker" : ""}${h.id === "zone" && (selected || ghost) ? " armed" : ""}`}
                aria-label={h.label}
                style={{
                  left: `${((h.rect.x - view.x) / view.w) * 100}%`, top: `${((h.rect.y - view.y) / view.h) * 100}%`,
                  width: `${(h.rect.w / view.w) * 100}%`, height: `${(h.rect.h / view.h) * 100}%`,
                }}
                onClick={(e) => {
                  if (suppressClick.current) return;
                  if (h.id === "zone" || h.id === "spread" || h.id === "stir") zoneClick(e);
                  else h.onActivate(null, e.detail > 0);
                }}
              >
                {h.marker && <span aria-hidden="true">{h.marker}</span>}
              </button>
            ))}
            {advancing && <div className="ck-done-flash" aria-hidden="true" />}
          </div>
        </div>
        <div className={`ck-tray${question ? " ck-quiz-tray" : ""}`}>
          {/* On phones the dish uses the full width, so Sprig stands just below it, beside the tray. */}
          {!question && <InteractiveSprig className="ck-dish-sprig ck-dish-sprig-tray" mood={sprigMood} dishes={sprigDishes} size={104} />}
          {question && step?.kind === "quiz" ? (
            // Sprig pops in from the side and asks the question in a speech-bubble card.
            <div className="ck-quiz ck-quiz-pop" key={step.id} role="group" aria-label="Sprig asks a question">
              <InteractiveSprig className="ck-quiz-sprig" mood={quiz.right ? "cheer" : quiz.wrong.length ? "encourage" : "think"} dishes={sprigDishes} size={104} />
              <div className="ck-quiz-card">
              <p className="ck-quiz-who">Sprig asks</p>
              <p className="ck-question">{question.question}</p>
              <div className="ck-answers">
                {question.answers.map((answer, i) => {
                  const asset = answerAsset(answer);
                  const wrong = quiz.wrong.includes(i);
                  return (
                    <button key={answer} type="button" className={`ck-answer${wrong ? " wrong" : ""}${quiz.right && i === question.correct ? " right" : ""}`}
                      disabled={quiz.right || wrong}
                      onClick={() => {
                        if (i === question.correct) { setQuiz((q) => ({ ...q, right: true })); say("chime"); }
                        else { setQuiz((q) => ({ ...q, wrong: [...q.wrong, i] })); setMistakes((m) => m + 1); say("pick"); }
                      }}>
                      {asset && <AssetIcon asset={asset} size={44} />}
                      <span>{answer}</span>
                    </button>
                  );
                })}
              </div>
              <p className="ck-feedback" role="status">
                {quiz.right ? question.explanation
                  : quiz.wrong.length ? "Almost! Look at your dish and try another answer." : " "}
              </p>
              <div className="ck-quiz-actions">
                <button type="button" className="ck-primary" disabled={!quiz.right}
                  onClick={() => { setIndex((i) => i + 1); setQuiz({ wrong: [], right: false }); setFx(noFx); }}>
                  Keep cooking
                </button>
                {!quiz.right && <button type="button" className="ck-link" onClick={() => { setMistakes((m) => m + 1); setIndex((i) => i + 1); setQuiz({ wrong: [], right: false }); }}>Skip question</button>}
              </div>
              </div>
            </div>
          ) : step?.kind === "cook" ? (
            <div className="ck-cook">
              <button type="button" className="ck-primary ck-big" disabled={cooking || heatNow >= 1 || advancing}
                onClick={() => { if (!locked()) { setCooking(true); say("pick"); } }}>
                {heatNow >= 1 ? "Done!" : cooking ? "Cooking…" : step.appliance === "oven" ? "Start the pretend oven" : "Start the pretend stove"}
              </button>
              <div className="ck-meter" role="progressbar" aria-label="Pretend cooking progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(heatNow * 100)}>
                <i style={{ width: `${heatNow * 100}%` }} />
              </div>
              <p className="ck-note">Pretend cooking: about {step.seconds} seconds. {step.real} A grown-up handles real heat.</p>
            </div>
          ) : (
            <div className="ck-chips">
              {tray.map((item, i) => (
                <button
                  key={item.asset}
                  type="button"
                  className={`ck-chip${selected === item.asset ? " selected" : ""}`}
                  aria-pressed={selected === item.asset}
                  disabled={paused || advancing}
                  onPointerDown={(e) => chipDown(e, item.asset)}
                  onPointerMove={chipMove}
                  onPointerUp={chipUp}
                  onPointerCancel={() => { drag.current = null; setGhost(null); }}
                  onClick={() => { if (suppressClick.current) return; setSelected((s) => (s === item.asset ? null : item.asset)); say("pick"); }}
                >
                  <TrayBowl index={i}><AssetIcon asset={item.asset} size={64} chocolate={recipe.id === "brownies"} /></TrayBowl>
                  <span>{ASSET_LABEL[item.asset] ?? item.asset}{item.left > 1 ? ` ×${item.left}` : ""}</span>
                </button>
              ))}
              {step && toolFor[step.kind] && (
                <div className="ck-tool">
                  <ToolIcon tool={toolFor[step.kind]!} size={52} />
                  <span>{toolName[toolFor[step.kind]!]}</span>
                </div>
              )}
              {step && step.kind === "drop" && tray.length === 0 && !step.finish && <p className="ck-note">Nice! That’s everything for this step.</p>}
              {step && step.kind === "drop" && step.finish && (
                <button type="button" className="ck-primary ck-finish" disabled={requiredLeft || paused || advancing}
                  onClick={() => { setFinishedSteps((s) => [...s, step.id]); say("chime"); }}>
                  {requiredLeft ? "Add the fruit first" : step.finish}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
      {ghost && (
        <span className="ck-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <AssetIcon asset={ghost.asset} size={104} chocolate={recipe.id === "brownies"} />
        </span>
      )}
      {paused && (
        <div className="ck-overlay" role="dialog" aria-modal="true" aria-label="Game paused">
          <div className="ck-card">
            <h2>Kitchen break</h2>
            <p>Your {recipe.title.toLowerCase()} will be right here.</p>
            <button type="button" className="ck-primary" onClick={() => setPaused(false)} autoFocus><IconPlayerPlay size={18} aria-hidden="true" /> Resume cooking</button>
            <button type="button" className="ck-secondary" onClick={startOver}>Start this recipe over</button>
            <button type="button" className="ck-secondary" onClick={onBack}>Back to recipes</button>
            <button type="button" className="ck-link" onClick={onSettings}>Parent settings</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ finale --

function Finale({
  recipe, plan, dish, view, ar, saved, pretendSeconds, onAgain, onSave, onCollection, onRecipe, showRecipe, closeRecipe, stars, sprigDishes = 0,
}: {
  recipe: LittleRecipe; plan: Step[]; dish: DishState; view: ViewBox; ar: number; saved: boolean; pretendSeconds: number;
  onAgain: () => void; onSave: (finished: DishState) => void; onCollection: () => void; onRecipe: () => void;
  showRecipe: boolean; closeRecipe: () => void; stars: number; sprigDishes?: number;
}) {
  // The reveal: the dish appears as the child left it, the pieces slide into a tidy arrangement
  // ("make it pretty"), then the camera tilts into a warm food-photo shot. The child can add
  // one finishing touch. Everything the child chose (toppings and how many) is kept.
  const reduced = useReducedMotion();
  const plated = useMemo(() => plateDish(recipe, plan, dish), [recipe, plan, dish]);
  const [phase, setPhase] = useState(0);
  const [garnished, setGarnished] = useState(false);
  // Phase 3: the drawing turns into the real dish photo (the same one on the dish card).
  // The child can flip back and forth between "mine" and "the real one".
  const [photoReady, setPhotoReady] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [showReal, setShowReal] = useState(false);
  const hasPhoto = Boolean(recipe.image) && !photoFailed;
  useEffect(() => {
    if (reduced) { setPhase(2); return; }
    const a = window.setTimeout(() => setPhase(1), 700);
    const b = window.setTimeout(() => setPhase(2), 1800);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [reduced]);
  useEffect(() => {
    if (phase < 2 || !hasPhoto || !photoReady) return;
    const t = window.setTimeout(() => { setPhase(3); setShowReal(true); }, reduced ? 0 : 1600);
    return () => window.clearTimeout(t);
  }, [phase, hasPhoto, photoReady, reduced]);
  const real = showReal && hasPhoto && photoReady;
  const shown = phase >= 1 ? plated : dish;
  const garnish = garnishFor(recipe.id);
  const spot = garnishSpot(recipe, plan, plated);
  const hot = recipe.game !== "assembly";
  return (
    <div className="ck-app ck-finale">
      <main className="ck-finale-main">
        <figure className="ck-hero ck-hero-creation">
          <div className="ck-frame">
            <div className={`ck-frame-art ck-plating${phase >= 2 ? " is-revealed" : ""}${real ? " is-real" : ""}`} style={{ aspectRatio: ar, "--ar": ar } as React.CSSProperties}>
              <CookingScene recipe={recipe} plan={plan} dish={shown} step={null} surface={finalSurface(recipe)} presenting view={view} />
              <svg className="ck-finale-layer" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
                {phase >= 2 && hot && <Steam spot={spot} />}
                {garnished && <Garnish kind={garnish.kind} spot={spot} />}
                {phase >= 2 && <Sparkles spot={spot} />}
              </svg>
              {hasPhoto && (
                <div className="ck-morph-photo" aria-hidden={!real}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- local dish photo, same as the dish card */}
                  <img src={recipe.image} alt={real ? `Your ${recipe.title.toLowerCase()}, ready to eat` : ""} decoding="async"
                    ref={(el) => { if (el?.complete && el.naturalWidth) setPhotoReady(true); }}
                    onLoad={() => setPhotoReady(true)} onError={() => setPhotoFailed(true)} />
                </div>
              )}
              {phase >= 3 && <span key={real ? "real" : "mine"} className="ck-morph-burst" aria-hidden="true" />}
            </div>
          </div>
          <figcaption>{real ? "Ta-da! Your dish, ready to eat" : "Made by you, just the way you arranged it"}</figcaption>
          {phase >= 3 && (
            <button type="button" className="ck-morph-toggle" onClick={() => setShowReal((v) => !v)} aria-pressed={real}>
              {real ? "See how I arranged it" : "See the real dish"}
            </button>
          )}
        </figure>
        <section className="ck-finale-text" aria-live="polite">
          <p className="ck-kicker">Your {recipe.title.toLowerCase()}</p>
          <h1>Look what you made!</h1>
          {(() => {
            // Sprig talks the child through the reveal, then says what this dish grew.
            const before = sprigGrowth(sprigDishes), after = sprigGrowth(sprigDishes + 1);
            const news = after.pod && !before.pod ? "Look, I grew a bean pod!" : after.flower && !before.flower ? "Wow, I grew a flower!"
              : after.leaves > before.leaves ? "Yum! You helped me grow a new leaf!" : "That looks so yummy!";
            const line = phase < 2 ? "Let’s make it look yummy!" : phase < 3 && hasPhoto ? "Ooh, watch this… magic!"
              : real ? (garnished ? news : "Poof! It turned into the real thing!") : garnished ? news : "Want to add a finishing touch?";
            return <Sprig mood={phase < 2 ? "think" : "cheer"} dishes={sprigDishes + 1} size={72}>{line}</Sprig>;
          })()}
          <p className="ck-finale-benefit">{recipe.benefit} You earned {stars} chef {stars === 1 ? "star" : "stars"}.</p>
          <div className="ck-actions">
            {phase >= 2 && !garnished && !real && (phase >= 3 || !hasPhoto) && (
              <button type="button" className="ck-secondary ck-garnish-btn" onClick={() => setGarnished(true)}>
                <IconSparkles size={20} aria-hidden="true" /> {garnish.label}
              </button>
            )}
            <button type="button" className="ck-primary" onClick={onAgain}>Make another</button>
            {saved
              ? <button type="button" className="ck-secondary" onClick={onCollection}>Saved! Open my cookbook</button>
              : <button type="button" className="ck-secondary" onClick={() => onSave(plated)}>Save to my cookbook</button>}
            <button type="button" className="ck-secondary" onClick={onRecipe}>Make it with a grown-up</button>
          </div>
        </section>
      </main>
      {showRecipe && (
        <div className="ck-overlay" role="dialog" aria-modal="true" aria-label="Recipe for grown-ups">
          <div className="ck-card ck-recipe">
            <h2>Make it with a grown-up</h2>
            {recipe.image && !photoFailed && (
              <figure className="ck-recipe-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={recipe.image} alt={`A real ${recipe.title.toLowerCase()}`} loading="lazy" decoding="async" onError={() => setPhotoFailed(true)} />
                <figcaption>What the real one can look like</figcaption>
              </figure>
            )}
            <p className="ck-note">
              In the game, cooking took about {pretendSeconds || "a few"} seconds of pretend time.
              {recipe.game === "assembly"
                ? ` In a real kitchen this takes about ${recipe.minutes} minutes and needs no heat.`
                : ` In a real kitchen this takes about ${recipe.minutes} minutes, including the baking or cooking time below.`}
            </p>
            <h3>Ingredients</h3>
            <ul>{recipe.ingredients.map(({ food, amount }) => <li key={food}>{amount} {food.toLowerCase() === "plain yogurt" ? "plain yogurt" : food}</li>)}</ul>
            <h3>Steps</h3>
            <ol>{recipe.adultSteps.map((s) => <li key={s}>{s}</li>)}</ol>
            <p className="ck-note">Check ingredient labels for allergens. A grown-up handles knives, ovens and stoves.</p>
            <button type="button" className="ck-primary" onClick={closeRecipe} autoFocus>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { Rect };
