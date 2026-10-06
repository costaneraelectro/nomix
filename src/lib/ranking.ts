import { FECHAS_CYBER } from '../data/metas';
import { claveOrden } from './orden';
import type { Venta } from './store';

export type PeriodoRanking = { tipo: 'dia'; fecha: string } | { tipo: 'cyber' } | { tipo: 'todo' };
export type Metrica = 'monto' | 'cantidad';

export interface Asesor {
  codigo: string; nombre: string; monto: number; cantidad: number; ticket: number; boleteado: number;
}

/** Cantidad = órdenes distintas (una OC con varias líneas cuenta una vez). */
export function ranking(ventas: Venta[], p: PeriodoRanking, metrica: Metrica): Asesor[] {
  const f = ventas.filter((v) => p.tipo === 'todo' || (p.tipo === 'dia' ? v.fecha === p.fecha : FECHAS_CYBER.includes(v.fecha)));
  const m = new Map<string, Asesor & { ords: Set<string> }>();
  for (const v of f) {
    const a = m.get(v.vendedorCodigo) ?? { codigo: v.vendedorCodigo, nombre: v.vendedorNombre, monto: 0, cantidad: 0, ticket: 0, boleteado: 0, ords: new Set<string>() };
    a.monto += v.monto; if (v.boleteado) a.boleteado += v.monto; a.ords.add(claveOrden(v)); m.set(v.vendedorCodigo, a);
  }
  return [...m.values()].map(({ ords, ...a }) => ({ ...a, cantidad: ords.size, ticket: ords.size ? a.monto / ords.size : 0 }))
    .sort((a, b) => b[metrica] - a[metrica] || b.monto - a.monto);
}
