import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { descargarCsv, ventasCsv } from '../lib/export';
import { pedidoSinOC } from '../lib/orden';
import { longDate, money, todayISO } from '../lib/format';
import type { NuevaVenta, Venta } from '../lib/store';
import { CorregirDia } from './CorregirDia';
import { SaleRow } from './SaleRow';

export function SalesView({ ventas, onToggle, onEdit, onDelete, onSetOC, onDeleteMany, onImport, onToast }: {
  ventas: Venta[]; onToggle: (id: string, b: boolean) => void; onEdit: (v: Venta) => void; onDelete: (id: string) => void;
  onSetOC: (id: string, oc: string) => void; onDeleteMany: (ids: string[]) => Promise<void>; onImport: (l: NuevaVenta[]) => Promise<void>; onToast: (m: string) => void;
}) {
  const [fecha, setFecha] = useState(todayISO());
  const [filtro, setFiltro] = useState<'todas' | 'pend' | 'sinoc'>('todas');
  const [buscar, setBuscar] = useState('');
  const list = useMemo(() => {
    const n = buscar.trim().toLowerCase();
    return ventas.filter((v) => v.fecha === fecha && (filtro === 'todas' || (filtro === 'pend' ? !v.boleteado : pedidoSinOC(v))) &&
      (!n || v.orden.includes(n) || v.vendedorNombre.toLowerCase().includes(n) || v.vendedorCodigo.includes(n)));
  }, [ventas, fecha, filtro, buscar]);
  const sinOC = ventas.filter(pedidoSinOC).length;
  const total = list.reduce((a, v) => a + v.monto, 0);
  const descargar = (todas: boolean) => {
    const sel = todas ? ventas : ventas.filter((v) => v.fecha === fecha);
    if (!sel.length) return onToast('No hay ventas para descargar');
    descargarCsv(todas ? 'ordenes-no-mix-todas.csv' : `ordenes-no-mix-${fecha}.csv`, ventasCsv(sel));
  };

  return (
    <div className="stack">
    <section className="panel">
      <div className="toolbar">
        <label className="field"><span>Fecha</span><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
        <label className="field grow"><span>Buscar</span><input placeholder="Orden, vendedor o código" value={buscar} onChange={(e) => setBuscar(e.target.value)} /></label>
        <div className="field"><span>Mostrar</span>
          <div className="seg small">
            <button className={filtro === 'todas' ? 'on' : ''} onClick={() => setFiltro('todas')}>Todas</button>
            <button className={filtro === 'pend' ? 'on' : ''} onClick={() => setFiltro('pend')}>Sin boletear</button>
            <button className={filtro === 'sinoc' ? 'on' : ''} onClick={() => setFiltro('sinoc')}>Pedidos sin OC {sinOC}</button>
          </div></div>
        <div className="field"><span>Descargar detalle</span>
          <div className="btn-pair">
            <button className="ghost slim" onClick={() => descargar(false)}>Esta fecha</button>
            <button className="cta slim" onClick={() => descargar(true)}>Todas</button>
          </div></div>
      </div>
      <p className="muted">{longDate(fecha)} · {list.length} orden(es) · {money(total)}</p>
      <ul className="sales wide">
        <AnimatePresence initial={false}>
          {list.map((v) => <SaleRow key={v.id} v={v} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onSetOC={onSetOC} />)}
        </AnimatePresence>
        {!list.length && <li className="empty-state">Sin ventas para este filtro.</li>}
      </ul>
    </section>
    <CorregirDia ventas={ventas} fecha={fecha} onDeleteMany={onDeleteMany} onImport={onImport} onToast={onToast} />
    </div>
  );}
