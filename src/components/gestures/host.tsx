"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { Point, ViewBox } from "@/lib/cooking-geometry";
import type { SoundName, SoundOptions } from "@/lib/sound";

/** What the cooking studio hands to each gesture (chop, mash, whisk). */
export interface GestureHost {
  stageRef: RefObject<HTMLDivElement | null>;
  view: ViewBox;
  toSvg: (e: { clientX: number; clientY: number }) => Point;
  /** True while paused, between steps or during a short animation lock. */
  locked: () => boolean;
  reduced: boolean;
  /** Youngest chefs: every action works with a plain tap, no dragging needed. */
  tapOnly: boolean;
  sound: (name: SoundName, opts?: SoundOptions) => void;
  /** Seedy's gentle hint line (never a failure). */
  nudge: (text: string) => void;
  /** Tell the studio a drag happened, so the click that follows is ignored. */
  dragged: () => void;
}

/** Labelled hotspot buttons call into the active gesture through this handle. */
export interface GestureHandle {
  /** `viaPointer` is false for the keyboard (Enter/Space), which always does a whole action. */
  tap: (index: number, viaPointer: boolean) => void;
}

/** Keeps the latest props in a ref, so long-lived pointer listeners never see stale values. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Stage pixels per SVG unit, to keep hit zones about 72 to 80 CSS px wide on every screen. */
export function pxPerUnit(host: GestureHost): number {
  const r = host.stageRef.current?.getBoundingClientRect();
  return r && r.width ? r.width / host.view.w : 1;
}

export interface DragHandlers {
  /** Return false to ignore this pointer. */
  down: (e: PointerEvent, p: Point, onHotspot: boolean) => boolean | void;
  move: (e: PointerEvent, p: Point, moved: boolean) => void;
  up: (e: PointerEvent, p: Point, moved: boolean, onHotspot: boolean) => void;
  /** Mouse moving over the stage with no button pressed. */
  hover?: (p: Point | null) => void;
}

/**
 * Pointer plumbing shared by the gestures: listens on the stage element (hotspot
 * buttons inside it bubble up too), follows the drag on the window so it keeps
 * working when the finger leaves the stage, and reports whether it moved more
 * than 8 CSS px (below that it is a tap).
 */
export function useStageDrag(host: GestureHost, handlers: DragHandlers) {
  const h = useLatest(handlers);
  const hostRef = useLatest(host);
  const stageRef = host.stageRef;
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let active: { id: number; x: number; y: number; moved: boolean; hot: boolean } | null = null;
    const onMove = (e: PointerEvent) => {
      if (!active || e.pointerId !== active.id) return;
      if (!active.moved && Math.hypot(e.clientX - active.x, e.clientY - active.y) > 8) {
        active.moved = true;
        hostRef.current.dragged();
      }
      h.current.move(e, hostRef.current.toSvg(e), active.moved);
    };
    const onUp = (e: PointerEvent) => {
      if (!active || e.pointerId !== active.id) return;
      const a = active;
      active = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (a.moved) hostRef.current.dragged();
      h.current.up(e, hostRef.current.toSvg(e), a.moved, a.hot);
    };
    const onDown = (e: PointerEvent) => {
      if (active || e.button > 0) return;
      const hot = !!(e.target as Element | null)?.closest?.(".ck-hot");
      if (h.current.down(e, hostRef.current.toSvg(e), hot) === false) return;
      active = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, hot };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    };
    const onHover = (e: PointerEvent) => {
      if (active || e.pointerType !== "mouse" || e.buttons) return;
      h.current.hover?.(hostRef.current.toSvg(e));
    };
    const onLeave = (e: PointerEvent) => { if (!active && e.pointerType === "mouse") h.current.hover?.(null); };
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onHover);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onHover);
      stage.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [stageRef, h, hostRef]);
}

/** The overlay drawn on top of the scene, in the same SVG coordinates. */
export function GestureLayer({ view, children, className = "" }: { view: ViewBox; children: ReactNode; className?: string }) {
  return (
    <svg className={`ck-gesture-layer ${className}`} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** Progress shown under the dish: "Lumpy → Smooth", "Separate → Mixed", or one pip per cut. */
export function GestureMeter({ label, value, left, right, pips }: {
  label: string; value: number; left?: string; right?: string; pips?: { done: number; total: number };
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="ck-gmeter" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      {pips ? (
        <span className="ck-gmeter-pips">
          {Array.from({ length: pips.total }, (_, i) => <i key={i} className={i < pips.done ? "on" : ""} />)}
        </span>
      ) : (
        <>
          {left && <span>{left}</span>}
          <span className="ck-gmeter-bar"><b style={{ width: `${pct}%` }} /></span>
          {right && <span>{right}</span>}
        </>
      )}
    </div>
  );
}
