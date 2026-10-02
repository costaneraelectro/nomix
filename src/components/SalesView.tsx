import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { longDate, money, todayISO } from '../lib/format';
import type { Venta } from '../lib/store';

export function SalesView({ ventas, onToggle, onDelete }: {
  ventas: Venta[]; onToggle: (id: string, b: boolean) => void; onDelete: (id: string) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [filtro, setFiltro] = useState<'todas' | 'pend'>('todas');
  const [confirm, setConfirm] = useState<string | null>(null);
  const list = useMemo(
    () => ventas.filter((v) => v.fecha === fecha && (filtro === 'todas' || !v.boleteado)),
    [ventas, fecha, filtro]);

  return (
    <div className="view">
      <div className="row">
        <label className="field"><span>Fecha</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <div className="field"><span>Mostrar</span>
          <div className="seg small">
            <button className={filtro === 'todas' ? 'on' : ''} onClick={() => setFiltro('todas')}>Todas</button>
            <button className={filtro === 'pend' ? 'on' : ''} onClick={() => setFiltro('pend')}>Sin boletear</button>
          </div></div>
      </div>
      <p className="muted">{longDate(fecha)} · {list.length} orden(es)</p>
      <ul className="sales">
        <AnimatePresence initial={false}>
          {list.map((v) => (
            <motion.li key={v.id} layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
              <label className={v.boleteado ? 'toggle mini on' : 'toggle mini'}>
                <input type="checkbox" checked={v.boleteado} onChange={(e) => onToggle(v.id, e.target.checked)} aria-label="Boleteado" />
                <span className="box"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></span>
              </label>
              <div className="sale-main">
                <b>{money(v.monto)}</b>
                <span>{v.vendedorNombre} · {v.vendedorCodigo}</span>
                <small>Orden {v.orden} · {v.sublinea}</small>
              </div>
              <button className={confirm === v.id ? 'del sure' : 'del'}
                onClick={() => (confirm === v.id ? onDelete(v.id) : (setConfirm(v.id), setTimeout(() => setConfirm(null), 2500)))}>
                {confirm === v.id ? '¿Borrar?' : '✕'}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
        {!list.length && <li className="empty-state">Sin ventas registradas para este filtro.</li>}
      </ul>
    </div>
  );
}
