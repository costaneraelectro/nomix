import type { Venta } from './store';

/** Los números que empiezan con 1 son N° de pedido; la OC de Looker se anota aparte. */
export const esPedido = (orden: string) => /^1/.test(orden.trim());

/** Número que se compara contra Looker: la OC si existe, si no el número ingresado. */
export const claveOrden = (v: Pick<Venta, 'orden' | 'ordenOC'>) => (v.ordenOC?.trim() || v.orden.trim());

export const pedidoSinOC = (v: Pick<Venta, 'orden' | 'ordenOC'>) => esPedido(v.orden) && !v.ordenOC?.trim();
