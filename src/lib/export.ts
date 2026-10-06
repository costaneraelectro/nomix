import { GRUPOS } from '../data/metas';
import { esPedido } from './orden';
import type { Venta } from './store';

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;

export function ventasCsv(ventas: Venta[]): string {
  const grupo = (id: string) => GRUPOS.find((g) => g.id === id)?.nombre ?? id;
  const head = ['Fecha', 'N° Pedido / Orden ingresado', 'N° Orden (OC)', 'Código vendedor', 'Vendedor', 'Línea', 'Sublínea', 'Monto', 'Boleteado', 'Registrado'];
  const rows = [...ventas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.createdAt - b.createdAt)
    .map((v) => [v.fecha, v.orden, v.ordenOC || (esPedido(v.orden) ? '' : v.orden), v.vendedorCodigo, v.vendedorNombre, grupo(v.grupo), v.sublinea, v.monto,
      v.boleteado ? 'Sí' : 'No', new Date(v.createdAt).toLocaleString('es-CL')].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...rows].join('\n');
}

export function descargarCsv(nombre: string, contenido: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
