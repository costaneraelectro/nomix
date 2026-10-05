import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="modal" role="dialog" aria-label={title} initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}>
            <header><h3>{title}</h3><button type="button" className="x" onClick={onClose} aria-label="Cerrar">✕</button></header>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
