import { motion } from 'framer-motion';

export function Ring({ value, size = 150 }: { value: number; size?: number }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const done = value >= 1;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={done ? 'ring done' : 'ring'}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} className="ring-fg"
        strokeDasharray={c} initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - Math.min(value, 1)) }}
        transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
