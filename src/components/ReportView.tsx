import { useCallback, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { FECHAS_CYBER } from '../data/metas';
import { longDate, money, pct, todayISO } from '../lib/format';
import { buildReport, reportText, type Linea, type Periodo } from '../lib/report';
import type { Venta } from '../lib/store';
import { AnimatedNumber } from './AnimatedNumber';
import { Bar } from './Bar';
import { Ring } from './Ring';

const fm = (n: number) => money(n);
const fp = (n: number) => pct(n);

function Stats({ l }: { l: Linea }) {
  return (
    <dl className="stats">
      <div><dt>Venta</dt><dd><AnimatedNumber value={l.venta} format={fm} /></dd></div>
      <div><dt>Meta</dt><dd>{money(l.meta)}</dd></div>
      <div><dt>Falta</dt><dd className={l.falta === 0 ? 'ok' : ''}>{l.falta === 0 ? '¡Meta lograda!' : money(l.falta)}</dd></div>
    </dl>
  );
}

export function ReportView({ ventas, onToast }: { ventas: Venta[]; onToast: (m: string) => void }) {
  const [periodo, setPeriodo] = useState<Periodo>({ tipo: 'dia', fecha: todayISO() });
  const r = useMemo(() => buildReport(ventas, periodo), [ventas, periodo]);
  const card = useRef<HTMLDivElement>(null);

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(reportText(r, periodo)); onToast('Reporte copiado para WhatsApp'); }
    catch { onToast('No se pudo copiar'); }
  }, [r, periodo, onToast]);

  const png = useCallback(async () => {
    if (!card.current) return;
    try {
      const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: '#050705' });
      const a = document.createElement('a');
      a.href = url; a.download = `reporte-no-mix-${periodo.tipo === 'dia' ? periodo.fecha : 'cyber'}.png`; a.click();
    } catch { onToast('No se pudo generar la imagen'); }
  }, [periodo, onToast]);

  const titulo = periodo.tipo === 'dia' ? longDate(periodo.fecha) : 'Cyber Monday · 5, 6 y 7 de octubre';

  return (
    <div className="view">
      <div className="row">
        <div className="seg small">
          <button className={periodo.tipo === 'dia' ? 'on' : ''} onClick={() => setPeriodo({ tipo: 'dia', fecha: todayISO() })}>Día</button>
          <button className={periodo.tipo === 'cyber' ? 'on' : ''} onClick={() => setPeriodo({ tipo: 'cyber' })}>Cyber 3 días</button>
        </div>
        {periodo.tipo === 'dia' && (
          <input type="date" className="date-mini" value={periodo.fecha} onChange={(e) => setPeriodo({ tipo: 'dia', fecha: e.target.value })} />
        )}
      </div>
      {periodo.tipo === 'dia' && FECHAS_CYBER.includes(periodo.fecha) && <p className="muted">🟢 Día Cyber · meta diaria = meta Cyber ÷ 3</p>}

      <div ref={card} className="report">
        <header className="report-head">
          <img src="/logo.png" alt="Cyber Monday" />
          <div><h2>REPORTE VENTA NO MIX</h2><p>{titulo}</p></div>
        </header>

        <section className="hero">
          <div className="ring-wrap">
            <Ring value={r.total.cumpl} />
            <div className="ring-label"><b><AnimatedNumber value={r.total.cumpl * 100} format={(n) => `${Math.round(n)}%`} /></b><small>cumplimiento</small></div>
          </div>
          <div className="hero-side">
            <small>TOTAL DÍA</small>
            <strong><AnimatedNumber value={r.total.venta} format={fm} /></strong>
            <span>Meta {money(r.total.meta)}</span>
            <span className="falta">Falta {money(r.total.falta)}</span>
            <span className="bol">🧾 Boleteado {money(r.total.boleteado)}</span>
            {r.sinBoletear > 0 && <span className="warn">{r.sinBoletear} orden(es) sin boletear</span>}
          </div>
        </section>

        <h3 className="sec">Resumen por línea</h3>
        <div className="cards">
          {r.grupos.map((g, i) => (
            <motion.article key={g.id} className="card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
              <div className="card-top"><h4>{g.emoji} Total {g.nombre}</h4><b className={g.cumpl >= 1 ? 'pill ok' : 'pill'}>{pct(g.cumpl)}</b></div>
              <Bar value={g.cumpl} />
              <Stats l={g} />
            </motion.article>
          ))}
        </div>

        {r.grupos.map((g) => (
          <section key={g.id}>
            <h3 className="sec">Detalle {g.nombre}</h3>
            <ul className="detail">
              {g.sublineas.map((s, i) => (
                <motion.li key={s.nombre} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03, duration: 0.22 }}>
                  <div className="d-top"><span>{s.nombre}</span><b className={s.cumpl >= 1 ? 'ok' : ''}>{fp(s.cumpl)}</b></div>
                  <Bar value={s.cumpl} />
                  <div className="d-nums"><span>{money(s.venta)} <em>de {money(s.meta)}</em></span><span>falta {money(s.falta)}</span></div>
                </motion.li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="actions">
        <button className="cta" onClick={copy}>Copiar para WhatsApp</button>
        <button className="ghost" onClick={png}>Descargar imagen</button>
      </div>
    </div>
  );
}
