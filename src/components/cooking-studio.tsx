"use client";

import type React from "react";
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent,
} from "react";
import {
  IconArrowBackUp, IconArrowLeft, IconBulb, IconPlayerPause, IconPlayerPlay, IconVolume, IconVolumeOff,
} from "@tabler/icons-react";
import type { LittleRecipe } from "@/lib/little-kitchen";
import { recipeChallenges } from "@/lib/chef-challenges";
import {
  answerAsset, dishSchema, doCut, doFlip, doMash, doPaint, doPour, doScoop, doStir, dropItem, emptyDish,
  finalSurface, planFor, setHeat, simulatedSeconds, stepDone, trayItems, totalScoops,
  type AssetKey, type DishState, type Step,
} from "@/lib/cooking";
import {
  BOARD, BOARD_FOOD, BOWL, GLASS, PAN, PITA, PLATE, viewFor,
  angleBetween, angleDelta, cutLength, cutPositions, glassSurfaceY, paintAt, paintNext,
  type Point, type Surface, type ViewBox,
} from "@/lib/cooking-geometry";
import { SOUND_KEY, playSound, type SoundName } from "@/lib/sound";
import { AssetIcon, ASSET_LABEL } from "./food-art";
import { CookingScene, noFx, ToolIcon, type Fx } from "./cooking-scene";

type Rect = { x: number; y: number; w: number; h: number };
type Hotspot = {
  id: string; label: string; rect: Rect; round?: boolean; marker?: string;
  onActivate: (point: Point | null) => void;
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
  recipe, onBack, onSettings, onComplete, onSave, onCollection, chefAge, saved, avoid = [],
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
  const gesture = useRef<{ last: Point; moved: boolean; client: Point; stirAngle?: number; pushed: boolean } | null>(null);
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
  const say = useCallback((name: SoundName) => { if (sound) playSound(name); }, [sound]);
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
  function chopAt(i: number, x: number) {
    if (!step || step.kind !== "cut") return;
    const before = dishRef.current;
    if (before.cuts[step.id]?.includes(i)) return;
    patchFx({ knife: { x, y: 150, down: true } });
    commit((d) => doCut(d, step, i));
    say("chop");
    later(() => patchFx({ knife: null }), 360);
  }
  function tapMarker(i: number) {
    if (!step || locked()) return;
    if (step.kind === "cut") {
      const x = cutPositions(step.cuts, cutLength(step.food))[i];
      patchFx({ knife: { x, y: 150, down: false } });
      later(() => chopAt(i, x), 130);
    } else if (step.kind === "mash") {
      const x = spotX(step, i);
      if (dishRef.current.mash[step.id]?.includes(i)) return;
      patchFx({ masher: { x, y: 196, down: false } });
      later(() => patchFx({ masher: { x, y: 196, down: true } }), 60);
      later(() => { commit((d) => doMash(d, step, i)); say("mash"); }, 240);
      later(() => patchFx({ masher: null }), 520);
    }
  }
  const spotX = (s: Extract<Step, { kind: "mash" }>, i: number) => {
    const len = cutLength(s.food);
    return BOARD_FOOD.cx - len / 2 + (len * (i + 0.5)) / s.spots;
  };

  // ---- gestures on the work surface ---------------------------------------
  function stageDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!step || locked() || e.button > 0) return;
    if (!["cut", "mash", "spread", "stir"].includes(step.kind)) return;
    const start = toSvg(e);
    gesture.current = {
      last: start, moved: false, client: { x: e.clientX, y: e.clientY }, pushed: false,
      stirAngle: step.kind === "stir" ? angleBetween({ x: BOWL.cx, y: BOWL.cy }, start) : undefined,
    };
    const move = (ev: PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      if (Math.hypot(ev.clientX - g.client.x, ev.clientY - g.client.y) > 8) g.moved = true;
      if (!g.moved) return;
      stageMove(toSvg(ev), g);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      const g = gesture.current;
      gesture.current = null;
      if (g?.moved) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 60);
      }
      setFx((f) => ({ ...f, pointer: null, stirAngle: null, knife: f.knife && !f.knife.down ? null : f.knife }));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }
  function stageMove(p: Point, g: NonNullable<typeof gesture.current>) {
    if (!step) return;
    const prev = g.last;
    g.last = p;
    if (step.kind === "cut") {
      const band = p.y > 190 && p.y < 340;
      patchFx({ knife: { x: Math.max(150, Math.min(650, p.x)), y: 150, down: band } });
      if (!band) return;
      cutPositions(step.cuts, cutLength(step.food)).forEach((x, i) => {
        if (Math.min(prev.x, p.x) - 6 <= x && Math.max(prev.x, p.x) + 6 >= x) chopAt(i, x);
      });
    } else if (step.kind === "mash") {
      for (let i = 0; i < step.spots; i++)
        if (Math.hypot(p.x - spotX(step, i), p.y - BOARD_FOOD.cy) < 46) { tapMarker(i); break; }
    } else if (step.kind === "spread") {
      patchFx({ pointer: p });
      const s = step;
      const first = !g.pushed;
      g.pushed = true;
      commit((d) => doPaint(d, s, paintAt(d.paint[s.id] ?? [], p, s.medium === "sauce" ? 40 : 34)), !first);
      if (Math.random() < 0.12) say("stir");
    } else if (step.kind === "stir") {
      const a = angleBetween({ x: BOWL.cx, y: BOWL.cy }, p);
      if (Math.hypot(p.x - BOWL.cx, p.y - BOWL.cy) < 28) return;
      const delta = Math.abs(angleDelta(g.stirAngle ?? a, a));
      g.stirAngle = a;
      const s = step;
      const first = !g.pushed;
      g.pushed = true;
      commit((d) => doStir(d, s, Math.min(delta, 40)), !first);
      patchFx({ stirAngle: (dishRef.current.stir[s.id] ?? 0) + delta });
      if (Math.random() < 0.15) say("stir");
    }
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
      say("stir");
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
    setFx((f) => ({ ...f, knife: null, masher: null, spoon: null }));
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
    const u = new SpeechSynthesisUtterance(`${step.title}. ${step.hint}`);
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
      cutPositions(step.cuts, cutLength(step.food)).forEach((x, i) => {
        if (dish.cuts[step.id]?.includes(i)) return;
        hotspots.push({ id: `cut-${i}`, label: `Cut mark ${i + 1} of ${step.cuts}`, rect: { x: x - 38, y: 120, w: 76, h: 76 }, round: true, marker: String(i + 1), onActivate: () => tapMarker(i) });
      });
    } else if (step.kind === "mash") {
      for (let i = 0; i < step.spots; i++) {
        if (dish.mash[step.id]?.includes(i)) continue;
        const x = spotX(step, i);
        hotspots.push({ id: `mash-${i}`, label: `Mash spot ${i + 1} of ${step.spots}`, rect: { x: x - 38, y: BOARD_FOOD.cy - 38, w: 76, h: 76 }, round: true, marker: "●", onActivate: () => tapMarker(i) });
      }
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
  const toolFor: Record<string, "knife" | "masher" | "spoon" | "spatula" | undefined> = {
    cut: "knife", mash: "masher", spread: "spoon", stir: "spoon", flip: "spatula",
  };
  const toolName = { knife: "Knife", masher: "Masher", spoon: "Spoon", spatula: "Spatula" } as const;
  const hasPast = hist.past.length > 0 && !cooking && !advancing;
  const heatNow = step?.kind === "cook" ? dish.heat[step.id] ?? 0 : 0;
  const stageClass = `ck-stage${step && ["cut", "mash", "spread", "stir"].includes(step.kind) ? " ck-gesture" : ""}`;
  const ar = view.w / view.h;
  const question = step?.kind === "quiz" ? questions[step.index] : null;
  const pretendSeconds = simulatedSeconds(plan);

  if (finished) {
    return (
      <Finale
        recipe={recipe} plan={plan} dish={dish} view={view} ar={ar} saved={saved}
        pretendSeconds={pretendSeconds}
        onAgain={onBack}
        onSave={() => onSave(dish)}
        onCollection={onCollection}
        onRecipe={() => setShowRecipe(true)}
        showRecipe={showRecipe} closeRecipe={() => setShowRecipe(false)}
        stars={mistakes ? 1 : 2}
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
              {nudge || step?.hint}
              {hintOpen && !nudge && <button type="button" className="ck-link" onClick={readStep}>Read it to me</button>}
            </p>
          )}
        </div>
        <div className="ck-stage-wrap">
          <div ref={stageRef} className={stageClass} style={{ aspectRatio: ar, "--ar": ar } as React.CSSProperties} onPointerDown={stageDown} data-armed={selected ? "true" : undefined}>
            <div className="ck-scene-fade" key={surface}>
              <CookingScene recipe={recipe} plan={plan} dish={dish} step={step} surface={surface} fx={fx} view={view} />
            </div>
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
                  else h.onActivate(null);
                }}
              >
                {h.marker && <span aria-hidden="true">{h.marker}</span>}
              </button>
            ))}
            {advancing && <div className="ck-done-flash" aria-hidden="true" />}
          </div>
        </div>
        <div className={`ck-tray${question ? " ck-quiz-tray" : ""}`}>
          {question && step?.kind === "quiz" ? (
            <div className="ck-quiz" key={step.id}>
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
              {tray.map((item) => (
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
                  <AssetIcon asset={item.asset} size={64} chocolate={recipe.id === "brownies"} />
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
  recipe, plan, dish, view, ar, saved, pretendSeconds, onAgain, onSave, onCollection, onRecipe, showRecipe, closeRecipe, stars,
}: {
  recipe: LittleRecipe; plan: Step[]; dish: DishState; view: ViewBox; ar: number; saved: boolean; pretendSeconds: number;
  onAgain: () => void; onSave: () => void; onCollection: () => void; onRecipe: () => void;
  showRecipe: boolean; closeRecipe: () => void; stars: number;
}) {
  // The child's own arrangement is the hero, exactly as they made it. A real photo
  // appears only in the grown-up recipe card, clearly labelled as the real-kitchen version.
  const [photoFailed, setPhotoFailed] = useState(false);
  return (
    <div className="ck-app ck-finale">
      <main className="ck-finale-main">
        <figure className="ck-hero ck-hero-creation">
          <div className="ck-frame">
            <div className="ck-frame-art" style={{ aspectRatio: ar, "--ar": ar } as React.CSSProperties}>
              <CookingScene recipe={recipe} plan={plan} dish={dish} step={null} surface={finalSurface(recipe)} presenting view={view} />
            </div>
          </div>
          <figcaption>Made by you, just the way you arranged it</figcaption>
        </figure>
        <section className="ck-finale-text" aria-live="polite">
          <p className="ck-kicker">Your {recipe.title.toLowerCase()}</p>
          <h1>Look what you made!</h1>
          <p className="ck-finale-benefit">{recipe.benefit} You earned {stars} chef {stars === 1 ? "star" : "stars"}.</p>
          <div className="ck-actions">
            <button type="button" className="ck-primary" onClick={onAgain}>Make another</button>
            {saved
              ? <button type="button" className="ck-secondary" onClick={onCollection}>Saved! Open my cookbook</button>
              : <button type="button" className="ck-secondary" onClick={onSave}>Save to my cookbook</button>}
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
