import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { longDate, money, todayISO } from '../lib/format';
import { ranking, type Metrica, type PeriodoRanking } from '../lib/ranking';
import type { Venta } from '../lib/store';

const MEDAL = ['🥇', '🥈', '🥉'];

export function RankingView({ ventas }: { ventas: Venta[] }) {
  const [periodo, setPeriodo] = useState<PeriodoRanking>({ tipo: 'dia', fecha: todayISO() });
  const [metrica, setMetrica] = useState<Metrica>('monto');
  const list = useMemo(() => ranking(ventas, periodo, metrica), [ventas, periodo, metrica]);
  const max = list[0]?.[metrica] || 1;
  const total = list.reduce((a, x) => a + x.monto, 0);
  const ords = list.reduce((a, x) => a + x.cantidad, 0);
  const fmt = (v: number) => (metrica === 'monto' ? money(v) : `${v} orden${v === 1 ? '' : 'es'}`);
  const titulo = periodo.tipo === 'dia' ? longDate(periodo.fecha) : periodo.tipo === 'cyber' ? 'Cyber Monday · 5, 6 y 7 de octubre' : 'Todas las ventas registradas';

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="seg small">
          <button className={periodo.tipo === 'dia' ? 'on' : ''} onClick={() => setPeriodo({ tipo: 'dia', fecha: todayISO() })}>Día</button>
          <button className={periodo.tipo === 'cyber' ? 'on' : ''} onClick={() => setPeriodo({ tipo: 'cyber' })}>Cyber 3 días</button>
          <button className={periodo.tipo === 'todo' ? 'on' : ''} onClick={() => setPeriodo({ tipo: 'todo' })}>Todo</button>
        </div>
        {periodo.tipo === 'dia' && <input type="date" className="date-mini" value={periodo.fecha} onChange={(e) => setPeriodo({ tipo: 'dia', fecha: e.target.value })} />}
        <span className="spacer" />
        <div className="seg small">
          <button className={metrica === 'monto' ? 'on' : ''} onClick={() => setMetrica('monto')}>Por monto</button>
          <button className={metrica === 'cantidad' ? 'on' : ''} onClick={() => setMetrica('cantidad')}>Por cantidad</button>
        </div>
      </div>

      <section className="hero rank-hero">
        <div className="hero-id"><h2>RANKING DE ASESORES</h2><p>{titulo}</p></div>
        <dl className="kpis">
          <div><dt>Asesores con venta</dt><dd className="big">{list.length}</dd></div>
          <div><dt>Monto total</dt><dd>{money(total)}</dd></div>
          <div><dt>Órdenes</dt><dd>{ords}</dd></div>
          <div><dt>Ticket promedio</dt><dd>{money(ords ? total / ords : 0)}</dd></div>
        </dl>
      </section>

      {list.length === 0 && <p className="empty-state panel">Aún no hay ventas en este período.</p>}

      {list.length > 0 && (
        <div className="podium">
          {list.slice(0, 3).map((a, i) => (
            <motion.article key={a.codigo} className={`pod pod-${i + 1}`} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
              <span className="medal">{MEDAL[i]}</span>
              <h3>{a.nombre}</h3><small>{a.codigo}</small>
              <b>{fmt(a[metrica])}</b>
              <span className="sub">{metrica === 'monto' ? `${a.cantidad} orden${a.cantidad === 1 ? '' : 'es'}` : money(a.monto)} · ticket {money(a.ticket)}</span>
            </motion.article>
          ))}
        </div>
      )}

      {list.length > 0 && (
        <section className="panel">
          <ol className="rank">
            {list.map((a, i) => (
              <motion.li key={a.codigo} layout="position" transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
                <span className="pos">{i + 1}</span>
                <div className="rank-main">
                  <div className="rank-top"><b>{a.nombre}</b><span>{fmt(a[metrica])}</span></div>
                  <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(a[metrica] / max) * 100}%` }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }} /></div>
                  <small>{a.codigo} · {money(a.monto)} · {a.cantidad} orden{a.cantidad === 1 ? '' : 'es'} · ticket {money(a.ticket)} · boleteado {money(a.boleteado)}</small>
                </div>
              </motion.li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
