import { DIAS_CYBER, FECHAS_CYBER, GRUPOS, SUBLINEAS, type GrupoId } from '../data/metas';
import type { Venta } from './store';
import { longDate, money, pct } from './format';

export type Periodo = { tipo: 'dia'; fecha: string } | { tipo: 'cyber' };

export interface Linea { nombre: string; meta: number; venta: number; boleteado: number; cumpl: number; falta: number }
export interface GrupoReport extends Linea { id: GrupoId; emoji: string; sublineas: Linea[]; ordenes: number }
export interface Report { grupos: GrupoReport[]; total: Linea; ordenes: number; sinBoletear: number }

const mk = (nombre: string, meta: number, venta: number, boleteado: number): Linea => ({
  nombre, meta, venta, boleteado,
  cumpl: meta ? venta / meta : 0,
  falta: Math.max(meta - venta, 0),
});

export function buildReport(ventas: Venta[], periodo: Periodo): Report {
  const f = ventas.filter((v) =>
    periodo.tipo === 'dia' ? v.fecha === periodo.fecha : FECHAS_CYBER.includes(v.fecha));
  const dias = periodo.tipo === 'dia' ? 1 : DIAS_CYBER;

  const grupos: GrupoReport[] = GRUPOS.map((g) => {
    const subs = SUBLINEAS.filter((s) => s.grupo === g.id).map((s) => {
      const mine = f.filter((v) => v.grupo === g.id && v.sublinea === s.nombre);
      return mk(s.nombre, (s.meta3d / DIAS_CYBER) * dias,
        mine.reduce((a, v) => a + v.monto, 0),
        mine.filter((v) => v.boleteado).reduce((a, v) => a + v.monto, 0));
    });
    const sum = (k: 'meta' | 'venta' | 'boleteado') => subs.reduce((a, s) => a + s[k], 0);
    return {
      ...mk(g.nombre, sum('meta'), sum('venta'), sum('boleteado')),
      id: g.id, emoji: g.emoji, sublineas: subs,
      ordenes: f.filter((v) => v.grupo === g.id).length,
    };
  });
  const sum = (k: 'meta' | 'venta' | 'boleteado') => grupos.reduce((a, g) => a + g[k], 0);
  return {
    grupos, ordenes: f.length, sinBoletear: f.filter((v) => !v.boleteado).length,
    total: mk('Total', sum('meta'), sum('venta'), sum('boleteado')),
  };
}

/** Texto listo para pegar en WhatsApp. */
export function reportText(r: Report, periodo: Periodo): string {
  const titulo = periodo.tipo === 'dia' ? longDate(periodo.fecha) : 'Acumulado Cyber Monday (5-7 oct 2026)';
  const head = (l: Linea) =>
    `Venta ${money(l.venta)} | Meta ${money(l.meta)} | ${pct(l.cumpl)} | Falta ${money(l.falta)}`;
  const out = [`*REPORTE VENTA NO MIX* 🟢`, titulo, '', `*TOTAL DÍA* ${head(r.total)}`,
    `Boleteado ${money(r.total.boleteado)} · ${r.sinBoletear} orden(es) sin boletear`, ''];
  for (const g of r.grupos) out.push(`${g.emoji} *TOTAL ${g.nombre.toUpperCase()}*`, head(g));
  for (const g of r.grupos) {
    out.push('', `*DETALLE ${g.nombre.toUpperCase()}*`);
    for (const s of g.sublineas)
      out.push(`• ${s.nombre}: ${money(s.venta)} / ${money(s.meta)} (${pct(s.cumpl)}) · falta ${money(s.falta)}`);
  }
  return out.join('\n');
}
