import { useEffect, useMemo, useState } from 'react';
import { GRUPOS, nDias, type Config, type Depto, type GrupoId } from '../data/config';
import { diaCorto, money } from '../lib/format';

const fmtN = (n: number) => (n ? new Intl.NumberFormat('es-CL').format(n) : '');
const parseN = (s: string) => Number(s.replace(/\D/g, '')) || 0;

function MoneyInput({ value, onChange, placeholder = '0', label }: { value: number; onChange: (n: number) => void; placeholder?: string; label: string }) {
  return (
    <div className="money-in"><i>$</i>
      <input inputMode="numeric" aria-label={label} placeholder={placeholder} value={fmtN(value)} onChange={(e) => onChange(parseN(e.target.value))} />
    </div>
  );
}

export function SettingsView({ config, guardada, onSave, onToast }: {
  config: Config; guardada: boolean; onSave: (c: Config) => Promise<void>; onToast: (m: string) => void;
}) {
  const [draft, setDraft] = useState<Config>(config);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sucio = useMemo(() => JSON.stringify(draft) !== JSON.stringify(config), [draft, config]);
  // si otra persona guarda cambios y aquí no hay nada sin guardar, se actualiza sola
  useEffect(() => { if (!sucio) setDraft(config); }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (p: Partial<Config>) => setDraft((d) => ({ ...d, ...p }));
  const setDepto = (i: number, p: Partial<Depto>) => set({ deptos: draft.deptos.map((d, j) => (j === i ? { ...d, ...p } : d)) });
  const addDepto = (g: GrupoId) => set({ deptos: [...draft.deptos, { grupo: g, nombre: '', meta: 0 }] });
  const delDepto = (i: number) => set({ deptos: draft.deptos.filter((_, j) => j !== i) });
  const setDia = (i: number, v: string) => set({ dias: draft.dias.map((d, j) => (j === i ? v : d)) });
  const addDia = () => {
    const last = draft.dias[draft.dias.length - 1] ?? '2026-11-27';
    const d = new Date(`${last}T12:00:00`); d.setDate(d.getDate() + 1);
    set({ dias: [...draft.dias, `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] });
  };

  const sumaDeptos = draft.deptos.reduce((a, d) => a + d.meta, 0);
  const n = nDias(draft);
  const diaTotalCalc = draft.modo === 'dia' ? sumaDeptos : sumaDeptos / n;
  const eventoTotalCalc = draft.modo === 'dia' ? sumaDeptos * n : sumaDeptos;
  const metaDiaTotal = draft.metaDiariaTotal > 0 ? draft.metaDiariaTotal : diaTotalCalc;

  async function guardar() {
    const nombres = draft.deptos.map((d) => d.nombre.trim());
    if (nombres.some((x) => !x)) return setErr('Hay departamentos sin nombre');
    if (new Set(nombres.map((x) => x.toLowerCase())).size !== nombres.length) return setErr('Hay departamentos con el mismo nombre');
    const dias = draft.dias.filter(Boolean);
    if (!dias.length) return setErr('Agrega al menos un día del evento');
    if (new Set(dias).size !== dias.length) return setErr('Hay días repetidos');
    setErr(''); setBusy(true);
    try {
      await onSave({ ...draft, evento: draft.evento.trim() || 'Black Friday', dias: [...dias].sort(), deptos: draft.deptos.map((d) => ({ ...d, nombre: d.nombre.trim() })) });
      onToast('✔ Configuración guardada');
    } catch (e) { setErr(e instanceof Error ? e.message : 'No se pudo guardar'); }
    finally { setBusy(false); }
  }

  return (
    <div className="stack">
      <div className="split cfg-top">
        <section className="panel">
          <h2 className="panel-title">Evento</h2>
          <label className="field"><span>Nombre del evento</span>
            <input value={draft.evento} onChange={(e) => set({ evento: e.target.value })} /></label>
          <div className="field"><span>Días del evento</span>
            <div className="dias">
              {draft.dias.map((d, i) => (
                <div key={i} className="dia-row">
                  <input type="date" value={d} onChange={(e) => setDia(i, e.target.value)} aria-label={`Día ${i + 1}`} />
                  <span className="muted">{d ? diaCorto(d) : ''}</span>
                  {draft.dias.length > 1 && <button type="button" className="icon" aria-label="Quitar día" onClick={() => set({ dias: draft.dias.filter((_, j) => j !== i) })}>✕</button>}
                </div>
              ))}
              <button type="button" className="ghost slim" onClick={addDia}>＋ Agregar día</button>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2 className="panel-title">Metas</h2>
          <div className="field"><span>Las metas de los departamentos son…</span>
            <div className="seg">
              <button type="button" className={draft.modo === 'dia' ? 'on' : ''} onClick={() => set({ modo: 'dia' })}>Por día</button>
              <button type="button" className={draft.modo === 'evento' ? 'on' : ''} onClick={() => set({ modo: 'evento' })}>Del evento completo</button>
            </div>
            <small className="muted">{draft.modo === 'dia' ? `Cada día se mide contra esa meta; el evento completo (${n} día${n === 1 ? '' : 's'}) suma ${n} veces.` : `La meta del día se calcula dividiendo el evento en ${n} día${n === 1 ? '' : 's'}.`}</small>
          </div>
          <label className="field"><span>Meta diaria total (opcional)</span>
            <MoneyInput value={draft.metaDiariaTotal} onChange={(v) => set({ metaDiariaTotal: v })} placeholder={fmtN(Math.round(diaTotalCalc)) || '0'} label="Meta diaria total" />
            <small className="muted">Si la dejas vacía se usa la suma de los departamentos.</small>
          </label>
          <div className="kpi-row tight">
            <div className="kpi"><small>Meta diaria total</small><b>{money(metaDiaTotal)}</b></div>
            <div className="kpi"><small>Meta del evento</small><b>{money(draft.metaDiariaTotal > 0 ? draft.metaDiariaTotal * n : eventoTotalCalc)}</b></div>
          </div>
        </section>
      </div>

      <div className="cols3">
        {GRUPOS.map((g) => {
          const idx = draft.deptos.map((d, i) => ({ d, i })).filter((x) => x.d.grupo === g.id);
          const sub = idx.reduce((a, x) => a + x.d.meta, 0);
          return (
            <section key={g.id} className="col">
              <header className="col-head"><h3>{g.emoji} {g.nombre}</h3><b className="pill">{money(sub)}</b></header>
              <ul className="cfg-list">
                {idx.map(({ d, i }) => (
                  <li key={i}>
                    <input className="nm" aria-label="Departamento" placeholder="Nombre del departamento" value={d.nombre} onChange={(e) => setDepto(i, { nombre: e.target.value })} />
                    <MoneyInput value={d.meta} onChange={(v) => setDepto(i, { meta: v })} label={`Meta ${d.nombre}`} />
                    <button type="button" className="icon" aria-label={`Quitar ${d.nombre}`} onClick={() => delDepto(i)}>✕</button>
                  </li>
                ))}
              </ul>
              <button type="button" className="ghost slim" onClick={() => addDepto(g.id)}>＋ Agregar departamento</button>
            </section>
          );
        })}
      </div>

      <div className="savebar">
        <span className={sucio ? 'dirty on' : 'dirty'}>{sucio ? 'Cambios sin guardar' : guardada ? '✔ Todo guardado' : 'Usando valores por defecto: ingresa las metas y guarda'}</span>
        {err && <span className="err">{err}</span>}
        <span className="spacer" />
        <button type="button" className="ghost" disabled={!sucio || busy} onClick={() => { setDraft(config); setErr(''); }}>Descartar</button>
        <button type="button" className="cta" disabled={busy || (!sucio && guardada)} onClick={() => void guardar()}>{busy ? 'Guardando…' : 'Guardar configuración'}</button>
      </div>
    </div>
  );
}
