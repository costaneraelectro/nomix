import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SUBLINEAS } from '../data/metas';
import type { Vendedor } from '../data/vendedores';
import { longDate, money } from '../lib/format';
import {
  ESTADO_LABEL, conciliacionCsv, conciliar, parseLooker, type ConcilRow, type Estado, type LookerLine,
} from '../lib/looker';
import type { NuevaVenta, Venta } from '../lib/store';
import { AnimatedNumber } from './AnimatedNumber';

const fm = (n: number) => money(n);
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const KEY = (s: { grupo: string; nombre: string }) => `${s.grupo}|${s.nombre}`;

export function ReconcileView({ ventas, vendedores, onAdd, onEdit, onAddVendedor, onToast }: {
  ventas: Venta[]; vendedores: Vendedor[]; onAdd: (v: NuevaVenta) => Promise<void>;
  onEdit: (id: string, patch: Partial<NuevaVenta>) => Promise<void>; onAddVendedor: (v: Vendedor) => Promise<void>; onToast: (m: string) => void;
}) {
  const [fecha, setFecha] = useState(yesterday());
  const [lines, setLines] = useState<LookerLine[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [canales, setCanales] = useState<Record<string, boolean>>({});
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [sel, setSel] = useState<Record<string, string>>({});
  const [confirmAll, setConfirmAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function load(file: File) {
    try {
      const ls = parseLooker(await file.text());
      if (!ls.length) throw new Error('No encontré filas de ventas en el archivo');
      setLines(ls); setFileName(file.name); setError(''); setFiltro('todos');
      setCanales(Object.fromEntries([...new Set(ls.map((l) => l.canal))].map((c) => [c, true])));
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo leer el archivo'); }
  }

  const ventasDia = useMemo(() => ventas.filter((v) => v.fecha === fecha), [ventas, fecha]);
  const usadas = useMemo(() => (lines ? lines.filter((l) => canales[l.canal] !== false) : []), [lines, canales]);
  const c = useMemo(() => (lines ? conciliar(usadas, ventasDia) : null), [lines, usadas, ventasDia]);
  const counts = useMemo(() => {
    const k: Record<Estado, number> = { ok: 0, diferencia: 0, faltante: 0, sobrante: 0 };
    c?.rows.forEach((r) => { k[r.estado]++; });
    return k;
  }, [c]);
  const rows = c ? c.rows.filter((r) => filtro === 'todos' || r.estado === filtro) : [];
  const faltantes = c?.rows.filter((r) => r.estado === 'faltante') ?? [];

  const sugerido = (r: ConcilRow) => sel[r.oc] ?? KEY({ grupo: r.sugerencia.grupo, nombre: r.sugerencia.sublinea });

  async function agregar(r: ConcilRow) {
    const s = SUBLINEAS.find((x) => KEY(x) === sugerido(r))!;
    if (r.vendedorCodigo && !vendedores.some((v) => v.codigo === r.vendedorCodigo))
      await onAddVendedor({ codigo: r.vendedorCodigo, nombre: r.vendedorNombre });
    await onAdd({
      fecha, vendedorCodigo: r.vendedorCodigo, vendedorNombre: r.vendedorNombre, monto: r.montoLooker, orden: r.oc,
      grupo: s.grupo, sublinea: s.nombre, boleteado: true,
    });
  }
  async function agregarTodas() {
    if (!confirmAll) { setConfirmAll(true); setTimeout(() => setConfirmAll(false), 3500); return; }
    setConfirmAll(false);
    for (const r of faltantes) await agregar(r);
    onToast(`${faltantes.length} venta(s) agregadas al reporte`);
  }
  async function marcarBoleteadas() {
    const todo = (c?.rows ?? []).filter((r) => r.estado !== 'sobrante' && r.estado !== 'faltante').flatMap((r) => r.ventas).filter((v) => !v.boleteado);
    for (const v of todo) await onEdit(v.id, { boleteado: true });
    onToast(`${todo.length} orden(es) marcadas como boleteadas`);
  }
  function descargar() {
    if (!c) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([conciliacionCsv(c, fecha)], { type: 'text/csv;charset=utf-8' }));
    a.download = `conciliacion-no-mix-${fecha}.csv`; a.click();
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="toolbar">
          <label className="field"><span>Fecha del archivo</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <p className="muted grow">Sube cada día el <b>Detalle Vendedores</b> de Looker. Se compara contra lo reportado el {longDate(fecha).toLowerCase()} ({ventasDia.length} venta(s) registradas).</p>
        </div>
        <div className={drag ? 'drop over' : 'drop'} onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void load(f); }}>
          <input ref={input} type="file" accept=".html,.htm,.xls,text/html" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); e.target.value = ''; }} />
          <b>{fileName || 'Arrastra el archivo de Looker aquí o haz clic para elegirlo'}</b>
          <small>{lines ? `${lines.length} líneas · ${new Set(lines.map((l) => l.oc)).size} órdenes` : 'Formato .html exportado desde Looker'}</small>
        </div>
        {error && <p className="err">{error}</p>}
      </section>

      {c && (
        <>
          <section className="kpi-row">
            <div className="kpi"><small>Venta según Looker</small><b><AnimatedNumber value={c.totalLooker} format={fm} /></b></div>
            <div className="kpi"><small>Venta reportada</small><b><AnimatedNumber value={c.totalReporte} format={fm} /></b></div>
            <div className={c.totalReporte - c.totalLooker === 0 ? 'kpi good' : 'kpi bad'}><small>Diferencia (reportado − Looker)</small>
              <b><AnimatedNumber value={c.totalReporte - c.totalLooker} format={(n) => `${n > 0 ? '+' : ''}${money(n)}`} /></b></div>
            <div className="kpi"><small>Órdenes que cuadran</small><b>{counts.ok} <em>de {c.rows.length}</em></b></div>
          </section>

          <section className="panel">
            <div className="toolbar">
              <div className="seg small wrap">
                <button className={filtro === 'todos' ? 'on' : ''} onClick={() => setFiltro('todos')}>Todos {c.rows.length}</button>
                {(['faltante', 'diferencia', 'sobrante', 'ok'] as Estado[]).map((e) => (
                  <button key={e} className={filtro === e ? `on st-${e}` : ''} onClick={() => setFiltro(e)}>{ESTADO_LABEL[e]} {counts[e]}</button>
                ))}
              </div>
              <span className="spacer" />
              {Object.keys(canales).length > 1 && (
                <div className="chips-inline">Canal:
                  {Object.keys(canales).map((k) => (
                    <label key={k} className={canales[k] ? 'mini-check on' : 'mini-check'}>
                      <input type="checkbox" checked={canales[k]} onChange={(e) => setCanales({ ...canales, [k]: e.target.checked })} />{k}</label>
                  ))}
                </div>
              )}
            </div>
            <div className="toolbar">
              {faltantes.length > 0 && (
                <button className={confirmAll ? 'cta slim warnbtn' : 'ghost'} onClick={agregarTodas}>
                  {confirmAll ? `¿Confirmar? Agregar ${faltantes.length} al reporte` : `Agregar las ${faltantes.length} faltantes`}</button>
              )}
              <button className="ghost" onClick={marcarBoleteadas}>Marcar boleteadas las que existen en Looker</button>
              <span className="spacer" />
              <button className="cta slim" onClick={descargar}>Descargar detalle (CSV)</button>
            </div>

            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Estado</th><th>OC</th><th>Vendedor</th><th>Detalle Looker</th><th className="num">Looker</th><th className="num">Reporte</th><th className="num">Dif.</th><th>Acción</th></tr></thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {rows.map((r) => (
                      <motion.tr key={r.oc} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                        <td><span className={`badge st-${r.estado}`}>{ESTADO_LABEL[r.estado]}</span></td>
                        <td className="mono">{r.oc}{r.canal && <small>{r.canal}</small>}</td>
                        <td>{r.vendedorNombre}<small>{r.vendedorCodigo}{r.vendedorDistinto && ' · ⚠ vendedor distinto en reporte'}</small></td>
                        <td className="desc" title={r.descripcion}>{r.descripcion}</td>
                        <td className="num">{r.montoLooker ? money(r.montoLooker) : '—'}</td>
                        <td className="num">{r.montoReporte ? money(r.montoReporte) : '—'}</td>
                        <td className={r.diff === 0 ? 'num' : 'num neg'}>{r.diff === 0 ? '✔' : `${r.diff > 0 ? '+' : ''}${money(r.diff)}`}</td>
                        <td className="act">
                          {r.estado === 'faltante' && (
                            <div className="act-row">
                              <select value={sugerido(r)} onChange={(e) => setSel({ ...sel, [r.oc]: e.target.value })}>
                                {['calzado', 'electro', 'otras'].map((g) => (
                                  <optgroup key={g} label={g === 'otras' ? 'Otras líneas' : g[0].toUpperCase() + g.slice(1)}>
                                    {SUBLINEAS.filter((s) => s.grupo === g).map((s) => <option key={KEY(s)} value={KEY(s)}>{s.nombre}</option>)}
                                  </optgroup>
                                ))}
                              </select>
                              <button className="cta slim" onClick={() => void agregar(r)}>Agregar</button>
                            </div>
                          )}
                          {r.estado === 'diferencia' && r.ventas.length === 1 && (
                            <button className="ghost slim" onClick={() => void onEdit(r.ventas[0].id, { monto: r.montoLooker }).then(() => onToast('Monto ajustado a Looker'))}>Ajustar a Looker</button>
                          )}
                          {r.estado === 'diferencia' && r.ventas.length > 1 && <small>{r.ventas.length} ventas con esta OC · editar a mano</small>}
                          {r.estado === 'sobrante' && <small>Revisar OC o fecha</small>}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              {!rows.length && <p className="empty-state">Nada en esta categoría.</p>}
            </div>
          </section>

          <details className="panel">
            <summary>Resumen por vendedor ({c.porVendedor.length})</summary>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Vendedor</th><th className="num">Looker</th><th className="num">Reportado</th><th className="num">Diferencia</th></tr></thead>
                <tbody>
                  {c.porVendedor.map((v) => (
                    <tr key={v.codigo}><td>{v.nombre}<small>{v.codigo}</small></td><td className="num">{money(v.looker)}</td><td className="num">{money(v.reporte)}</td>
                      <td className={v.diff === 0 ? 'num' : 'num neg'}>{v.diff === 0 ? '✔' : `${v.diff > 0 ? '+' : ''}${money(v.diff)}`}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
