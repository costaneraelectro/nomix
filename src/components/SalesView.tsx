import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { longDate, money, todayISO } from '../lib/format';
import type { Venta } from '../lib/store';
import { SaleRow } from './SaleRow';

export function SalesView({ ventas, onToggle, onEdit, onDelete }: {
  ventas: Venta[]; onToggle: (id: string, b: boolean) => void; onEdit: (v: Venta) => void; onDelete: (id: string) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [filtro, setFiltro] = useState<'todas' | 'pend'>('todas');
  const [buscar, setBuscar] = useState('');
  const list = useMemo(() => {
    const n = buscar.trim().toLowerCase();
    return ventas.filter((v) => v.fecha === fecha && (filtro === 'todas' || !v.boleteado) &&
      (!n || v.orden.includes(n) || v.vendedorNombre.toLowerCase().includes(n) || v.vendedorCodigo.includes(n)));
  }, [ventas, fecha, filtro, buscar]);
  const total = list.reduce((a, v) => a + v.monto, 0);

  return (
    <section className="panel">
      <div className="toolbar">
        <label className="field"><span>Fecha</span><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label className="field grow"><span>Buscar</span><input placeholder="Orden, vendedor o código" value={buscar} onChange={(e) => setBuscar(e.target.value)} /></label>
        <div className="field"><span>Mostrar</span>
          <div className="seg small">
            <button className={filtro === 'todas' ? 'on' : ''} onClick={() => setFiltro('todas')}>Todas</button>
            <button className={filtro === 'pend' ? 'on' : ''} onClick={() => setFiltro('pend')}>Sin boletear</button>
          </div></div>
      </div>
      <p className="muted">{longDate(fecha)} · {list.length} orden(es) · {money(total)}</p>
      <ul className="sales wide">
        <AnimatePresence initial={false}>
          {list.map((v) => <SaleRow key={v.id} v={v} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />)}
        </AnimatePresence>
        {!list.length && <li className="empty-state">Sin ventas para este filtro.</li>}
      </ul>
    </section>
  );
}
