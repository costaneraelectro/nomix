import { useMemo, useRef, useState } from 'react';
import { descargarCsv, parseVentasCsv, ventasCsv } from '../lib/export';
import { money } from '../lib/format';
import type { NuevaVenta, Venta } from '../lib/store';

const clave = (v: { fecha: string; orden: string; vendedorCodigo: string; monto: number }) => `${v.fecha}|${v.orden.trim()}|${v.vendedorCodigo}|${Math.round(v.monto)}`;

/** Deja los días del CSV exactamente como estaban: borra lo que sobra y devuelve lo que falta. */
export function RestaurarCSV({ ventas, onDeleteMany, onImport, onToast }: {
  ventas: Venta[]; onDeleteMany: (ids: string[]) => Promise<void>; onImport: (l: NuevaVenta[]) => Promise<void>; onToast: (m: string) => void;
}) {
  const [csv, setCsv] = useState<NuevaVenta[] | null>(null);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [fuera, setFuera] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const plan = useMemo(() => {
    if (!csv) return null;
    const fechas = [...new Set(csv.map((v) => v.fecha))].sort();
    const enCsv = new Set(csv.map(clave));
    const actuales = ventas.filter((v) => fechas.includes(v.fecha));
    const hay = new Set(actuales.map(clave));
    return {
      fechas,
      sobran: actuales.filter((v) => !enCsv.has(clave(v))).sort((a, b) => a.createdAt - b.createdAt),
      faltan: csv.filter((v) => !hay.has(clave(v))),
      totalActual: actuales.reduce((a, v) => a + v.monto, 0),
      totalCsv: csv.reduce((a, v) => a + v.monto, 0),
    };
  }, [csv, ventas]);

  async function leer(f: File) {
    try { const l = parseVentasCsv(await f.text()); if (!l.length) throw new Error('No encontré ventas en el CSV'); setCsv(l); setNombre(f.name); setError(''); setFuera(new Set()); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer el CSV'); }
  }
  const borrar = plan?.sobran.filter((v) => !fuera.has(v.id)) ?? [];
  const sum = (l: { monto: number }[]) => l.reduce((a, v) => a + v.monto, 0);
  const quedaria = plan ? plan.totalActual - sum(borrar) + sum(plan.faltan) : 0;

  async function aplicar() {
    if (!plan || (!borrar.length && !plan.faltan.length)) return;
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 4000); return; }
    setConfirm(false); setBusy(true);
    try {
      if (borrar.length) descargarCsv(`respaldo-antes-de-restaurar-${plan.fechas[0]}.csv`, ventasCsv(borrar));
      if (plan.faltan.length) await onImport(plan.faltan);
      if (borrar.length) await onDeleteMany(borrar.map((v) => v.id));
      onToast(`✔ Restaurado: ${borrar.length} eliminada(s), ${plan.faltan.length} devuelta(s)`);
    } catch { onToast('No se pudo restaurar, intenta de nuevo'); }
    finally { setBusy(false); }
  }

  return (
    <div className="restaurar">
      <h3>Restaurar el día desde un CSV de respaldo</h3>
      <p className="muted">Sube el CSV que descargaste (Ventas → Descargar detalle). Los días que trae quedan <b>idénticos al CSV</b>: se borra lo que no está en él y se devuelve lo que falte.</p>
      <div className="drop" onClick={() => input.current?.click()}>
        <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void leer(f); e.target.value = ''; }} />
        <b>{nombre || 'Haz clic y elige el CSV'}</b>
        <small>{csv ? `${csv.length} ventas · ${plan?.fechas.join(', ')} · ${money(plan?.totalCsv ?? 0)}` : 'Formato .csv exportado desde esta app'}</small>
      </div>
      {error && <p className="err">{error}</p>}
      {plan && (
        <>
          <div className="kpi-row">
            <div className="kpi"><small>Hoy en el reporte</small><b>{money(plan.totalActual)}</b></div>
            <div className="kpi bad"><small>Sobran ({borrar.length})</small><b>−{money(sum(borrar))}</b></div>
            <div className="kpi"><small>Faltan ({plan.faltan.length})</small><b>+{money(sum(plan.faltan))}</b></div>
            <div className={quedaria === plan.totalCsv ? 'kpi good' : 'kpi bad'}><small>Quedaría (CSV: {money(plan.totalCsv)})</small><b>{money(quedaria)}{quedaria === plan.totalCsv ? ' ✔' : ''}</b></div>
          </div>
          {plan.sobran.length > 0 && (
            <div className="table-wrap"><table className="tbl">
              <thead><tr><th></th><th>Fecha</th><th>Registrada</th><th>Orden</th><th>Asesor</th><th className="num">Monto</th></tr></thead>
              <tbody>{plan.sobran.map((v) => (
                <tr key={v.id} className={fuera.has(v.id) ? 'off' : ''}>
                  <td><input type="checkbox" checked={!fuera.has(v.id)} aria-label="Eliminar" onChange={(e) => { const n = new Set(fuera); if (e.target.checked) n.delete(v.id); else n.add(v.id); setFuera(n); }} /></td>
                  <td>{v.fecha}</td><td>{new Date(v.createdAt).toLocaleString('es-CL')}</td><td className="mono">{v.orden}</td>
                  <td>{v.vendedorNombre}<small>{v.vendedorCodigo}</small></td><td className="num">{money(v.monto)}</td></tr>
              ))}</tbody></table></div>
          )}
          {plan.faltan.length > 0 && <p className="notice">Se devolverán {plan.faltan.length} venta(s) del CSV que ya no están en el reporte: {plan.faltan.slice(0, 6).map((v) => `${v.orden} (${money(v.monto)})`).join(', ')}{plan.faltan.length > 6 ? '…' : ''}</p>}
          {!plan.sobran.length && !plan.faltan.length && <p className="empty-state">El reporte ya coincide con el CSV.</p>}
          <div className="toolbar">
            <p className="muted grow">Antes de borrar se descarga un CSV de respaldo con lo eliminado.</p>
            <button className={confirm ? 'cta warnbtn' : 'cta'} disabled={busy || (!borrar.length && !plan.faltan.length)} onClick={() => void aplicar()}>
              {busy ? 'Restaurando…' : confirm ? `¿Confirmar? Quitar ${borrar.length} y devolver ${plan.faltan.length}` : `Dejar el reporte igual al CSV`}</button>
          </div>
        </>
      )}
    </div>
  );
}
