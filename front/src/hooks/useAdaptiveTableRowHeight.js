import { useLayoutEffect, useRef, useState } from 'react';

export const useAdaptiveTableRowHeight = ({
  rowCount,
  enabled = true,
  minRowHeight = 1,
} = {}) => {
  const tableWrapperRef = useRef(null);
  const theadRef = useRef(null);
  const [rowHeight, setRowHeight] = useState(null);

  useLayoutEffect(() => {
    if (!enabled) return undefined;

    const wrapper = tableWrapperRef.current;
    if (!wrapper) return undefined;

    let frameId = 0;

    const measure = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const wrapperHeight = wrapper.getBoundingClientRect().height;
        const theadHeight = theadRef.current?.getBoundingClientRect().height ?? 0;
        const availableHeight = Math.max(0, wrapperHeight - theadHeight);
        const visibleRows = Math.max(1, rowCount || 0);
        const nextHeight = visibleRows > 0 ? availableHeight / visibleRows : minRowHeight;
        setRowHeight(Number.isFinite(nextHeight) && nextHeight > 0 ? nextHeight : minRowHeight);
      });
    };

    measure();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;

    resizeObserver?.observe(wrapper);
    if (theadRef.current) {
      resizeObserver?.observe(theadRef.current);
    }

    window.addEventListener('resize', measure);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled, rowCount, minRowHeight]);

  return { tableWrapperRef, theadRef, rowHeight };
};
