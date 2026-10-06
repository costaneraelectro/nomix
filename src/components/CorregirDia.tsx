import { useEffect, useMemo, useState } from 'react';
import { descargarCsv, ventasCsv } from '../lib/export';
import { longDate, money } from '../lib/format';
import type { NuevaVenta, Venta } from '../lib/store';
import { RestaurarCSV } from './RestaurarCSV';

const p2 = (n: number) => String(n).padStart(2, '0');
const medianocheSiguiente = (f: string) => {
  const d = new Date(`${f}T12:00:00`); d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T00:00`;
};

/** Ayuda a sacar ventas de más: las registradas después del cierre del día o agregadas desde Looker. */
export function CorregirDia({ ventas, fecha, onDeleteMany, onImport, onToast }: {
  ventas: Venta[]; fecha: string; onDeleteMany: (ids: string[]) => Promise<void>; onImport: (l: NuevaVenta[]) => Promise<void>; onToast: (m: string) => void;
}) {
  const [corte, setCorte] = useState(medianocheSiguiente(fecha));
  const [objetivo, setObjetivo] = useState('');
  const [fuera, setFuera] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setCorte(medianocheSiguiente(fecha)); setFuera(new Set()); }, [fecha]);

  const dia = useMemo(() => ventas.filter((v) => v.fecha === fecha), [ventas, fecha]);
  const corteMs = new Date(corte).getTime();
  const candidatas = useMemo(
    () => dia.filter((v) => v.origen === 'looker' || (Number.isFinite(corteMs) && v.createdAt > corteMs)).sort((a, b) => a.createdAt - b.createdAt),
    [dia, corteMs]);
  const sel = candidatas.filter((v) => !fuera.has(v.id));
  const suma = (l: Venta[]) => l.reduce((a, v) => a + v.monto, 0);
  const totalDia = suma(dia), totalSel = suma(sel), queda = totalDia - totalSel;
  const obj = Number(objetivo.replace(/\D/g, ''));

  async function borrar() {
    if (!sel.length) return;
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 4000); return; }
    setConfirm(false); setBusy(true);
    try {
      descargarCsv(`respaldo-ventas-eliminadas-${fecha}.csv`, ventasCsv(sel)); // copia por si hay que restaurar
      await onDeleteMany(sel.map((v) => v.id));
      onToast(`✔ ${sel.length} venta(s) eliminadas · respaldo descargado`);
    } catch { onToast('No se pudo eliminar, intenta de nuevo'); }
    finally { setBusy(false); }
  }

  return (
    <details className="panel corregir">
      <summary>Corregir el total del día (quitar ventas de más)</summary>
      <p className="muted">{longDate(fecha)} · hoy suma <b>{money(totalDia)}</b> en {dia.length} orden(es). Se proponen las ventas <b>registradas después del cierre</b> o <b>agregadas desde Looker</b>.</p>
      <div className="toolbar">
        <label className="field"><span>Total correcto del día</span>
          <div className="money-in"><i>$</i><input inputMode="numeric" placeholder="Ej. 19.663.147" value={obj ? new Intl.NumberFormat('es-CL').format(obj) : ''} onChange={(e) => setObjetivo(e.target.value)} /></div></label>
        <label className="field"><span>Registradas después de</span>
          <input type="datetime-local" value={corte} onChange={(e) => { setCorte(e.target.value); setFuera(new Set()); }} /></label>
      </div>
      <div className="kpi-row">
        <div className="kpi"><small>Total actual</small><b>{money(totalDia)}</b></div>
        <div className="kpi bad"><small>A eliminar ({sel.length})</small><b>−{money(totalSel)}</b></div>
        <div className={obj && queda === obj ? 'kpi good' : 'kpi'}><small>Quedaría</small><b>{money(queda)}</b></div>
        {obj > 0 && <div className={queda === obj ? 'kpi good' : 'kpi bad'}><small>Diferencia con el total correcto</small><b>{queda === obj ? '✔ Cuadra exacto' : `${queda > obj ? '+' : ''}${money(queda - obj)}`}</b></div>}
      </div>
      {candidatas.length === 0 && <p className="empty-state">No hay ventas posteriores al cierre ni agregadas desde Looker para esta fecha.</p>}
      {candidatas.length > 0 && (
        <div className="table-wrap"><table className="tbl">
          <thead><tr><th></th><th>Registrada</th><th>Orden</th><th>Asesor</th><th className="num">Monto</th><th>Origen</th></tr></thead>
          <tbody>{candidatas.map((v) => (
            <tr key={v.id} className={fuera.has(v.id) ? 'off' : ''}>
              <td><input type="checkbox" checked={!fuera.has(v.id)} aria-label="Eliminar"
                onChange={(e) => { const n = new Set(fuera); if (e.target.checked) n.delete(v.id); else n.add(v.id); setFuera(n); }} /></td>
              <td>{new Date(v.createdAt).toLocaleString('es-CL')}</td><td className="mono">{v.orden}</td>
              <td>{v.vendedorNombre}<small>{v.vendedorCodigo}</small></td><td className="num">{money(v.monto)}</td>
              <td>{v.origen === 'looker' ? 'Desde Looker' : 'Asesor'}</td></tr>
          ))}</tbody></table></div>
      )}
      <div className="toolbar">
        <p className="muted grow">Antes de borrar se descarga un CSV de respaldo con lo eliminado.</p>
        <button className={confirm ? 'cta warnbtn' : 'ghost'} disabled={busy || !sel.length} onClick={() => void borrar()}>
          {busy ? 'Eliminando…' : confirm ? `¿Confirmar? Eliminar ${sel.length} (${money(totalSel)})` : `Eliminar ${sel.length} venta(s) seleccionada(s)`}</button>
      </div>
      <RestaurarCSV ventas={ventas} onDeleteMany={onDeleteMany} onImport={onImport} onToast={onToast} />
    </details>
  );
}
