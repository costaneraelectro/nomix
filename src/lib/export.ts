import { GRUPOS, SUBLINEAS, type GrupoId } from '../data/metas';
import { esPedido } from './orden';
import type { NuevaVenta, Venta } from './store';

const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;

export function ventasCsv(ventas: Venta[]): string {
  const grupo = (id: string) => GRUPOS.find((g) => g.id === id)?.nombre ?? id;
  const head = ['Fecha', 'N° Pedido / Orden ingresado', 'N° Orden (OC)', 'Código vendedor', 'Vendedor', 'Línea', 'Sublínea', 'Monto', 'Boleteado', 'Registrado', 'Origen'];
  const rows = [...ventas]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.createdAt - b.createdAt)
    .map((v) => [v.fecha, v.orden, v.ordenOC || (esPedido(v.orden) ? '' : v.orden), v.vendedorCodigo, v.vendedorNombre, grupo(v.grupo), v.sublinea, v.monto,
      v.boleteado ? 'Sí' : 'No', new Date(v.createdAt).toLocaleString('es-CL'), v.origen === 'looker' ? 'Agregada desde Looker' : 'Asesor'].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...rows].join('\n');
}

export function descargarCsv(nombre: string, contenido: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Lee un CSV exportado desde la app (separador ;, con o sin BOM, formato nuevo o antiguo). */
export function parseVentasCsv(text: string): NuevaVenta[] {
  const rows: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ';') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((c) => c.trim())) rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); if (row.some((c) => c.trim())) rows.push(row); }
  if (rows.length < 2) throw new Error('El CSV no tiene filas');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iF = idx(/^fecha/), iO = idx(/^n° (orden|pedido)(?!.*oc)/), iOC = idx(/\(oc\)/), iC = idx(/código/), iV = idx(/^vendedor/),
    iL = idx(/^línea|^linea/), iS = idx(/^sublínea|^sublinea/), iM = idx(/^monto/), iB = idx(/^boleteado/);
  if ([iF, iO, iC, iM, iS].some((i) => i < 0)) throw new Error('No reconozco las columnas del CSV (Fecha, N° Orden, Código vendedor, Sublínea, Monto)');
  const grupoDe = (l: string, sub: string): GrupoId => {
    const s2 = SUBLINEAS.find((x) => x.nombre === sub); if (s2) return s2.grupo;
    const n = l.toLowerCase(); return n.startsWith('calz') ? 'calzado' : n.startsWith('elec') ? 'electro' : 'otras';
  };
  return rows.slice(1).map((r) => {
    const monto = Number((r[iM] || '').replace(/[^\d-]/g, ''));
    const oc = iOC >= 0 ? (r[iOC] || '').trim() : '';
    return {
      fecha: r[iF].trim(), orden: r[iO].trim(), ordenOC: oc && oc !== r[iO].trim() ? oc : undefined,
      vendedorCodigo: r[iC].trim(), vendedorNombre: (iV >= 0 ? r[iV] : '').trim(), monto,
      grupo: grupoDe(iL >= 0 ? r[iL] : '', r[iS].trim()), sublinea: r[iS].trim(), boleteado: iB >= 0 && /^s[ií]/i.test(r[iB].trim()),
    } as NuevaVenta;
  }).filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v.fecha) && v.orden && v.monto > 0);
}
