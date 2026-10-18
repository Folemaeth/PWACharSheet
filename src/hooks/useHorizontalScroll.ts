import { useState, useEffect, useCallback, type RefObject } from 'react';

/** Pixels per line when a wheel event reports `deltaMode === DOM_DELTA_LINE`. */
const WHEEL_LINE_PX = 16;

/** Fraction of the visible width moved by one arrow-button press. */
const PAGE_FRACTION = 0.8;

/**
 * Makes a horizontally overflowing element (`overflow-x: auto`) usable with a
 * mouse: a vertical wheel scrolls it sideways, and the returned flags plus
 * `scrollByPage` drive left/right arrow buttons.
 *
 * At either end the wheel event is left alone so the page/modal can scroll.
 *
 * Usage: const { canScrollLeft, canScrollRight, scrollByPage } = useHorizontalScroll(ref);
 */
export function useHorizontalScroll(ref: RefObject<HTMLElement | null>) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setCanScrollLeft(el.scrollLeft > 1);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    };

    // Native listener: React's onWheel is passive and cannot preventDefault.
    const handleWheel = (e: WheelEvent) => {
      // Horizontal gestures (trackpads, shift+wheel) already scroll natively.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const unit = e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? el.clientWidth : 1;
      const delta = e.deltaY * unit;
      if ((delta < 0 && el.scrollLeft <= 0) || (delta > 0 && el.scrollLeft >= maxScroll)) return;
      e.preventDefault();
      el.scrollLeft += delta;
      update();
    };

    // Overflow state lives in the DOM and can only be read after layout.
    update();

    el.addEventListener('scroll', update, { passive: true });
    el.addEventListener('wheel', handleWheel, { passive: false });

    // Re-measure when the row or its items resize, or items are added/removed.
    let resizeObserver: ResizeObserver | undefined;
    const observeSizes = () => {
      if (!resizeObserver) return;
      resizeObserver.disconnect();
      resizeObserver.observe(el);
      for (const child of Array.from(el.children)) resizeObserver.observe(child);
    };
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(update);
      observeSizes();
    } else {
      window.addEventListener('resize', update);
    }
    const mutationObserver = new MutationObserver(() => {
      observeSizes();
      update();
    });
    mutationObserver.observe(el, { childList: true });

    return () => {
      el.removeEventListener('scroll', update);
      el.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', update);
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
    };
  }, [ref]);

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const distance = direction * el.clientWidth * PAGE_FRACTION;
    if (typeof el.scrollBy === 'function') {
      el.scrollBy({ left: distance, behavior: 'smooth' });
    } else {
      el.scrollLeft += distance;
    }
  }, [ref]);

  return { canScrollLeft, canScrollRight, scrollByPage };
}
