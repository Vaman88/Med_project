"use client";
import { useEffect, type RefObject } from "react";

/**
 * Phones only: when a suggestion list opens partly below the visible screen (usually because the
 * on-screen keyboard is up), scroll the page just enough to show it, without pushing its input off
 * the top. Desktop and lists that already fit are left alone.
 */
export function useKeepListInView(
  input: RefObject<HTMLElement | null>,
  list: RefObject<HTMLElement | null>,
  open: boolean,
  rows: number,
) {
  useEffect(() => {
    if (!open || !input.current || !list.current) return;
    if (!window.matchMedia("(max-width: 940px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      if (!input.current || !list.current) return;
      const view = window.visualViewport;
      const viewBottom = view ? view.offsetTop + view.height : window.innerHeight;
      const viewTop = view ? view.offsetTop : 0;
      const listBottom = list.current.getBoundingClientRect().bottom;
      if (listBottom <= viewBottom) return;
      const room = input.current.getBoundingClientRect().top - viewTop - 12;
      const by = Math.min(listBottom - viewBottom + 12, room);
      if (by > 0) window.scrollBy({ top: by, behavior: "instant" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [input, list, open, rows]);
}
