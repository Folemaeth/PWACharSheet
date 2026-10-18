import { useRef, useEffect, type HTMLAttributes } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll';
import styles from './HorizontalScrollRow.module.css';

interface HorizontalScrollRowProps extends HTMLAttributes<HTMLDivElement> {
  /** When this changes, the `aria-selected="true"` child is scrolled into view. */
  activeKey?: string;
}

/**
 * Drop-in replacement for a horizontally scrolling row (`overflow-x: auto`).
 * Adds mouse-wheel scrolling and edge arrow buttons on pointer devices; touch
 * devices keep native swipe. `className` and all other props go to the
 * scrolling element itself, so the row keeps its existing styles and roles.
 *
 * Usage: <HorizontalScrollRow className={styles.tabBar} role="tablist" activeKey={active}>
 */
export function HorizontalScrollRow({ activeKey, children, ...rest }: HorizontalScrollRowProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const { canScrollLeft, canScrollRight, scrollByPage } = useHorizontalScroll(viewportRef);

  // Bring the selected item into view horizontally only — scrollIntoView
  // would also scroll the page vertically to reach the row.
  useEffect(() => {
    const viewport = viewportRef.current;
    const selected = viewport?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!viewport || !selected) return;
    const viewportRect = viewport.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    if (selectedRect.left < viewportRect.left) {
      viewport.scrollLeft += selectedRect.left - viewportRect.left;
    } else if (selectedRect.right > viewportRect.right) {
      viewport.scrollLeft += selectedRect.right - viewportRect.right;
    }
  }, [activeKey]);

  // Arrows are a mouse-only affordance: keyboard users reach every item by
  // Tab, so the arrows stay out of focus order and the accessibility tree.
  const renderArrow = (direction: -1 | 1) => (
    <button
      type="button"
      className={`${styles.arrow} ${direction < 0 ? styles.arrowLeft : styles.arrowRight}`}
      tabIndex={-1}
      aria-hidden="true"
      data-direction={direction < 0 ? 'left' : 'right'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => scrollByPage(direction)}
    >
      {direction < 0 ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
    </button>
  );

  return (
    <div className={styles.wrapper}>
      {canScrollLeft && renderArrow(-1)}
      <div ref={viewportRef} {...rest}>
        {children}
      </div>
      {canScrollRight && renderArrow(1)}
    </div>
  );
}
