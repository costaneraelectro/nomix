import { GRUPOS, metaDia, metaEvento, nDias, type Config, type GrupoId } from '../data/config';
import type { Venta } from './store';
import { longDate, money, pct } from './format';

export type Periodo = { tipo: 'dia'; fecha: string } | { tipo: 'evento' };

export interface Linea { nombre: string; meta: number; venta: number; boleteado: number; cumpl: number; falta: number }
export interface GrupoReport extends Linea { id: GrupoId; emoji: string; sublineas: Linea[]; ordenes: number }
export interface Report { grupos: GrupoReport[]; total: Linea; ordenes: number; sinBoletear: number }

const mk = (nombre: string, meta: number, venta: number, boleteado: number): Linea => ({
  nombre, meta, venta, boleteado,
  cumpl: meta ? venta / meta : 0,
  falta: Math.max(meta - venta, 0),
});

export function buildReport(ventas: Venta[], config: Config, periodo: Periodo): Report {
  const f = ventas.filter((v) => (periodo.tipo === 'dia' ? v.fecha === periodo.fecha : config.dias.includes(v.fecha)));
  const meta = periodo.tipo === 'dia' ? metaDia : metaEvento;

  const grupos: GrupoReport[] = GRUPOS.map((g) => {
    const nombres = config.deptos.filter((d) => d.grupo === g.id);
    const subs = nombres.map((d) => {
      const mine = f.filter((v) => v.grupo === g.id && v.sublinea === d.nombre);
      return mk(d.nombre, meta(config, d),
        mine.reduce((a, v) => a + v.monto, 0), mine.filter((v) => v.boleteado).reduce((a, v) => a + v.monto, 0));
    });
    // ventas cuyo departamento ya no existe en la configuración: no se pierden del total
    const conocidos = new Set(nombres.map((d) => d.nombre));
    const huerfanas = f.filter((v) => v.grupo === g.id && !conocidos.has(v.sublinea));
    if (huerfanas.length) subs.push(mk('Otros (sin departamento configurado)', 0,
      huerfanas.reduce((a, v) => a + v.monto, 0), huerfanas.filter((v) => v.boleteado).reduce((a, v) => a + v.monto, 0)));
    const sum = (k: 'meta' | 'venta' | 'boleteado') => subs.reduce((a, s) => a + s[k], 0);
    return {
      ...mk(g.nombre, sum('meta'), sum('venta'), sum('boleteado')),
      id: g.id, emoji: g.emoji, sublineas: subs, ordenes: f.filter((v) => v.grupo === g.id).length,
    };
  });
  const sum = (k: 'meta' | 'venta' | 'boleteado') => grupos.reduce((a, g) => a + g[k], 0);
  const metaTotal = config.metaDiariaTotal > 0
    ? (periodo.tipo === 'dia' ? config.metaDiariaTotal : config.metaDiariaTotal * nDias(config))
    : sum('meta');
  return {
    grupos, ordenes: f.length, sinBoletear: f.filter((v) => !v.boleteado).length,
    total: mk('Total', metaTotal, sum('venta'), sum('boleteado')),
  };
}

/** Texto listo para pegar en WhatsApp. */
export function reportText(r: Report, periodo: Periodo, config: Config): string {
  const titulo = periodo.tipo === 'dia' ? longDate(periodo.fecha) : `Acumulado ${config.evento} (${config.dias.length} día${config.dias.length === 1 ? '' : 's'})`;
  const head = (l: Linea) =>
    `Venta ${money(l.venta)} | Meta ${money(l.meta)} | ${pct(l.cumpl)} | Falta ${money(l.falta)}`;
  const out = [`*REPORTE VENTA NO MIX · ${config.evento.toUpperCase()}* 🟢`, titulo, '', `*TOTAL DÍA* ${head(r.total)}`,
    `Boleteado ${money(r.total.boleteado)} · ${r.sinBoletear} orden(es) sin boletear`, ''];
  for (const g of r.grupos) out.push(`${g.emoji} *TOTAL ${g.nombre.toUpperCase()}*`, head(g));
  for (const g of r.grupos) {
    out.push('', `*DETALLE ${g.nombre.toUpperCase()}*`);
    for (const s of g.sublineas)
      out.push(`• ${s.nombre}: ${money(s.venta)} / ${money(s.meta)} (${pct(s.cumpl)}) · falta ${money(s.falta)}`);
  }
  return out.join('\n');
}
