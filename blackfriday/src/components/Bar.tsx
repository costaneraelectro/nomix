import { motion } from 'framer-motion';

export function Bar({ value }: { value: number }) {
  return (
    <div className="bar"><motion.i
      className={value >= 1 ? 'full' : ''} initial={{ width: 0 }}
      animate={{ width: `${Math.min(value, 1) * 100}%` }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }} /></div>
  );
}
