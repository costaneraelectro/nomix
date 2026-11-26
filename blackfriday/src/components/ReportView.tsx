import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { useConfig } from '../lib/config';
import { longDate, money, pct, todayISO } from '../lib/format';
import { buildReport, reportText, type Periodo } from '../lib/report';
import type { Venta } from '../lib/store';
import { AnimatedNumber } from './AnimatedNumber';
import { Bar } from './Bar';
import { PeriodoPicker, diaInicial, type PeriodoSel } from './PeriodoPicker';
import { Ring } from './Ring';

const fm = (n: number) => money(n);

export function ReportView({ ventas, onToast, onGoConfig }: { ventas: Venta[]; onToast: (m: string) => void; onGoConfig: () => void }) {
  const config = useConfig();
  const [periodo, setPeriodo] = useState<Periodo>({ tipo: 'dia', fecha: diaInicial(config.dias, todayISO()) });
  // si cambian los días en Configuración y el seleccionado ya no existe
  useEffect(() => {
    if (periodo.tipo === 'dia' && !config.dias.includes(periodo.fecha)) setPeriodo({ tipo: 'dia', fecha: diaInicial(config.dias, todayISO()) });
  }, [config.dias, periodo]);
  const r = useMemo(() => buildReport(ventas, config, periodo), [ventas, config, periodo]);
  const card = useRef<HTMLDivElement>(null);
  const sinMetas = config.deptos.every((d) => d.meta === 0) && config.metaDiariaTotal === 0;

  const copy = useCallback(async () => {
    try { await navigator.clipboard.writeText(reportText(r, periodo, config)); onToast('Reporte copiado para WhatsApp'); }
    catch { onToast('No se pudo copiar'); }
  }, [r, periodo, config, onToast]);

  const png = useCallback(async () => {
    if (!card.current) return;
    try {
      const url = await toPng(card.current, { pixelRatio: 2, backgroundColor: '#eef1f5' });
      const a = document.createElement('a');
      a.href = url; a.download = `reporte-no-mix-${periodo.tipo === 'dia' ? periodo.fecha : 'evento'}.png`; a.click();
    } catch { onToast('No se pudo generar la imagen'); }
  }, [periodo, onToast]);

  const titulo = periodo.tipo === 'dia' ? longDate(periodo.fecha) : `${config.evento} · ${config.dias.length} días`;

  return (
    <div className="stack">
      <div className="toolbar">
        <PeriodoPicker value={periodo as PeriodoSel} dias={config.dias} onChange={(p) => p.tipo !== 'todo' && setPeriodo(p)} />
        <span className="spacer" />
        <button className="ghost" onClick={png}>Descargar imagen</button>
        <button className="cta slim" onClick={copy}>Copiar para WhatsApp</button>
      </div>
      {sinMetas && (
        <p className="notice">Aún no hay metas cargadas, por eso el cumplimiento sale en 0%. <button className="link" onClick={onGoConfig}>Ingresar metas en Configuración</button></p>
      )}

      <div ref={card} className="report">
        <section className="hero">
          <div className="hero-id">
            <h2>REPORTE VENTA NO MIX</h2>
            <p>{titulo}</p>
          </div>
          <div className="ring-wrap">
            <Ring value={r.total.cumpl} size={132} />
            <div className="ring-label"><b><AnimatedNumber value={r.total.cumpl * 100} format={(n) => `${Math.round(n)}%`} /></b><small>cumplimiento</small></div>
          </div>
          <dl className="kpis">
            <div><dt>Total venta</dt><dd className="big"><AnimatedNumber value={r.total.venta} format={fm} /></dd></div>
            <div><dt>{periodo.tipo === 'dia' ? 'Meta del día' : 'Meta del evento'}</dt><dd>{money(r.total.meta)}</dd></div>
            <div><dt>Falta</dt><dd>{r.total.meta > 0 && r.total.falta === 0 ? '¡Meta lograda!' : money(r.total.falta)}</dd></div>
            <div><dt>Boleteado</dt><dd className="good">{money(r.total.boleteado)}</dd></div>
            <div><dt>Órdenes</dt><dd>{r.ordenes}{r.sinBoletear > 0 && <em className="warn"> · {r.sinBoletear} sin boletear</em>}</dd></div>
          </dl>
        </section>

        <div className="cols3">
          {r.grupos.map((g, i) => (
            <motion.article key={g.id} className="col" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}>
              <header className="col-head">
                <h3>{g.emoji} Total {g.nombre}</h3>
                <b className={g.cumpl >= 1 ? 'pill ok' : 'pill'}>{pct(g.cumpl)}</b>
              </header>
              <Bar value={g.cumpl} />
              <dl className="stats">
                <div><dt>Venta</dt><dd><AnimatedNumber value={g.venta} format={fm} /></dd></div>
                <div><dt>Meta</dt><dd>{money(g.meta)}</dd></div>
                <div><dt>Falta</dt><dd className={g.meta > 0 && g.falta === 0 ? 'ok' : ''}>{g.meta > 0 && g.falta === 0 ? '¡Lograda!' : money(g.falta)}</dd></div>
              </dl>
              <h4 className="sec">Detalle {g.nombre}</h4>
              <ul className="detail">
                {g.sublineas.map((s, j) => (
                  <motion.li key={s.nombre} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + j * 0.025, duration: 0.22 }}>
                    <div className="d-top"><span>{s.nombre}</span><b className={s.meta > 0 && s.cumpl >= 1 ? 'ok' : ''}>{s.meta > 0 ? pct(s.cumpl) : '—'}</b></div>
                    <Bar value={s.cumpl} />
                    <div className="d-nums"><span>{money(s.venta)} <em>de {money(s.meta)}</em></span><span>falta {money(s.falta)}</span></div>
                  </motion.li>
                ))}
              </ul>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  );
}
