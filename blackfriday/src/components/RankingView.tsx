import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useConfig } from '../lib/config';
import { longDate, money, todayISO } from '../lib/format';
import { ranking, type Asesor, type Metrica, type PeriodoRanking } from '../lib/ranking';
import type { Venta } from '../lib/store';
import { PeriodoPicker, diaInicial } from './PeriodoPicker';

const MEDAL = ['🥇', '🥈', '🥉'];

function Lista({ titulo, metrica, list, fmt }: { titulo: string; metrica: Metrica; list: Asesor[]; fmt: (a: Asesor) => string }) {
  const max = list[0]?.[metrica] || 1;
  return (
    <section className="panel rank-panel">
      <h2 className="panel-title">{titulo} <small>{list.length} asesor(es)</small></h2>
      {list.length === 0 && <p className="empty-state">Aún no hay ventas en este período.</p>}
      <ol className="rank">
        {list.map((a, i) => (
          <motion.li key={a.codigo} layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(i, 8) * 0.03, ease: [0.23, 1, 0.32, 1] }} className={i < 3 ? `top top-${i + 1}` : ''}>
            <span className="pos">{i < 3 ? MEDAL[i] : i + 1}</span>
            <div className="rank-main">
              <div className="rank-top"><b>{a.nombre}</b><span>{fmt(a)}</span></div>
              <div className="bar"><motion.i initial={{ width: 0 }} animate={{ width: `${(a[metrica] / max) * 100}%` }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }} /></div>
              <small>{a.codigo} · {metrica === 'monto' ? `${a.cantidad} orden${a.cantidad === 1 ? '' : 'es'}` : money(a.monto)} · ticket {money(a.ticket)}</small>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

export function RankingView({ ventas }: { ventas: Venta[] }) {
  const { dias, evento } = useConfig();
  const [periodo, setPeriodo] = useState<PeriodoRanking>({ tipo: 'dia', fecha: diaInicial(dias, todayISO()) });
  const porMonto = useMemo(() => ranking(ventas, periodo, dias, 'monto'), [ventas, periodo, dias]);
  const porCantidad = useMemo(() => ranking(ventas, periodo, dias, 'cantidad'), [ventas, periodo, dias]);
  const total = porMonto.reduce((a, x) => a + x.monto, 0);
  const ords = porMonto.reduce((a, x) => a + x.cantidad, 0);
  const titulo = periodo.tipo === 'dia' ? longDate(periodo.fecha) : periodo.tipo === 'evento' ? `${evento} · acumulado` : 'Todas las ventas registradas';

  return (
    <div className="stack">
      <div className="toolbar"><PeriodoPicker value={periodo} dias={dias} conTodo onChange={setPeriodo} /></div>
      <section className="hero rank-hero">
        <div className="hero-id"><h2>RANKING DE ASESORES</h2><p>{titulo}</p></div>
        <dl className="kpis">
          <div><dt>Asesores con venta</dt><dd className="big">{porMonto.length}</dd></div>
          <div><dt>Monto total</dt><dd>{money(total)}</dd></div>
          <div><dt>Órdenes</dt><dd>{ords}</dd></div>
          <div><dt>Ticket promedio</dt><dd>{money(ords ? total / ords : 0)}</dd></div>
        </dl>
      </section>
      <div className="rank2">
        <Lista titulo="Por monto $" metrica="monto" list={porMonto} fmt={(a) => money(a.monto)} />
        <Lista titulo="Por cantidad de ventas" metrica="cantidad" list={porCantidad} fmt={(a) => `${a.cantidad} orden${a.cantidad === 1 ? '' : 'es'}`} />
      </div>
    </div>
  );
}
