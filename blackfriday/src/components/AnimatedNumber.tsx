import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

/** Número que cuenta hacia su nuevo valor. Escribe directo al DOM para no re-renderizar. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduce) { el.textContent = format(value); prev.current = value; return; }
    const c = animate(prev.current, value, {
      duration: 0.7, ease: [0.23, 1, 0.32, 1],
      onUpdate: (n) => { el.textContent = format(n); },
    });
    prev.current = value;
    return () => c.stop();
  }, [value, format, reduce]);
  return <span ref={ref}>{format(0)}</span>;
}
