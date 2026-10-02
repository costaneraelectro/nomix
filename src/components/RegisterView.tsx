import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GRUPOS, SUBLINEAS, type GrupoId } from '../data/metas';
import { VENDEDORES, type Vendedor } from '../data/vendedores';
import { money, todayISO } from '../lib/format';
import type { NuevaVenta } from '../lib/store';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function RegisterView({ onSave, onSaved }: { onSave: (v: NuevaVenta) => Promise<void>; onSaved: (msg: string) => void }) {
  const [fecha, setFecha] = useState(todayISO());
  const [vend, setVend] = useState<Vendedor | null>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState('');
  const [orden, setOrden] = useState('');
  const [grupo, setGrupo] = useState<GrupoId>('electro');
  const [sub, setSub] = useState('');
  const [boleteado, setBoleteado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const montoRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const n = norm(q);
    return VENDEDORES.filter((v) => !n || norm(v.nombre).includes(n) || v.codigo.includes(n)).slice(0, 40);
  }, [q]);
  const subs = SUBLINEAS.filter((s) => s.grupo === grupo);
  const montoNum = Number(monto.replace(/\D/g, ''));

  const pick = (v: Vendedor) => { setVend(v); setQ(''); setOpen(false); montoRef.current?.focus(); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vend) return setErr('Selecciona un vendedor');
    if (!montoNum) return setErr('Ingresa el monto');
    if (!orden.trim()) return setErr('Ingresa el número de orden');
    if (!sub) return setErr('Selecciona el departamento');
    setErr(''); setBusy(true);
    try {
      await onSave({
        fecha, vendedorCodigo: vend.codigo, vendedorNombre: vend.nombre, monto: montoNum,
        orden: orden.trim(), grupo, sublinea: sub, boleteado,
      });
      onSaved(`${money(montoNum)} · ${vend.nombre.split(' ')[0]} · ${sub}`);
      setMonto(''); setOrden(''); setSub(''); setBoleteado(false);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'No se pudo guardar');
    } finally { setBusy(false); }
  }

  return (
    <form className="view form" onSubmit={submit}>
      <label className="field">
        <span>Fecha</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>

      <div className="field">
        <span>Vendedor</span>
        {vend && !open ? (
          <button type="button" className="vend-chip" onClick={() => setOpen(true)}>
            <b>{vend.codigo}</b> {vend.nombre} <em>cambiar</em>
          </button>
        ) : (
          <div className="combo">
            <input
              autoFocus={open} placeholder="Busca por nombre o código…" value={q} autoComplete="off"
              onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 120)}
            />
            <AnimatePresence>
              {open && (
                <motion.ul className="combo-list" initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}>
                  {matches.map((v) => (
                    <li key={v.codigo}><button type="button" onPointerDown={(e) => { e.preventDefault(); pick(v); }}>
                      <b>{v.codigo}</b>{v.nombre}</button></li>
                  ))}
                  {!matches.length && <li className="empty">Sin resultados</li>}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="row">
        <label className="field">
          <span>Monto</span>
          <div className="money-in"><i>$</i>
            <input ref={montoRef} inputMode="numeric" placeholder="0" value={monto ? new Intl.NumberFormat('es-CL').format(montoNum) : ''}
              onChange={(e) => setMonto(e.target.value)} />
          </div>
        </label>
        <label className="field">
          <span>N° de orden</span>
          <input inputMode="numeric" placeholder="Ej. 123456789" value={orden} autoComplete="off"
            onChange={(e) => setOrden(e.target.value)} />
        </label>
      </div>

      <div className="field">
        <span>Departamento</span>
        <div className="seg">
          {GRUPOS.map((g) => (
            <button type="button" key={g.id} className={g.id === grupo ? 'on' : ''}
              onClick={() => { setGrupo(g.id); setSub(''); }}>
              {g.id === grupo && <motion.i layoutId="seg" className="seg-pill" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
              <span>{g.emoji} {g.nombre}</span>
            </button>
          ))}
        </div>
        <div className="chips">
          {subs.map((s, i) => (
            <motion.button type="button" key={grupo + s.nombre} className={s.nombre === sub ? 'chip on' : 'chip'}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.22 }}
              onClick={() => setSub(s.nombre)}>{s.nombre}</motion.button>
          ))}
        </div>
      </div>

      <label className={boleteado ? 'toggle on' : 'toggle'}>
        <input type="checkbox" checked={boleteado} onChange={(e) => setBoleteado(e.target.checked)} />
        <span className="box"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></span>
        <span>{boleteado ? 'Boleteado ✔' : 'Aún sin boletear'}</span>
      </label>

      <AnimatePresence>{err && <motion.p className="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>{err}</motion.p>}</AnimatePresence>
      <button className="cta" disabled={busy}>{busy ? 'Guardando…' : 'Registrar venta'}</button>
    </form>
  );
}
