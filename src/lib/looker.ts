import { SUBLINEAS, type GrupoId } from '../data/metas';
import { claveOrden, pedidoSinOC } from './orden';
import type { Venta } from './store';

export interface LookerLine {
  vendedorCodigo: string;
  vendedorNombre: string;
  oc: string;
  sku: string;
  skuDesc: string;
  canal: string;
  monto: number;
}

/** Lee el HTML exportado desde Looker (Detalle Vendedores). */
export function parseLooker(html: string): LookerLine[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = [...doc.querySelectorAll('tr')];
  if (!rows.length) return [];
  const head = [...rows[0].querySelectorAll('th')].map((t) => (t.textContent || '').trim().toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iV = col(/^vendedor/), iOc = col(/orden de compra|^oc$/), iSku = col(/^sku$/),
    iDesc = col(/sku desc/), iCanal = col(/canal/), iMonto = col(/monto/);
  if (iV < 0 || iOc < 0 || iMonto < 0) throw new Error('El archivo no tiene las columnas Vendedor, Orden de Compra y Monto Venta');
  const out: LookerLine[] = [];
  for (const r of rows.slice(1)) {
    const c = [...r.querySelectorAll('td')].map((t) => (t.textContent || '').trim());
    if (!c.length) continue;
    const oc = c[iOc];
    const monto = Number((c[iMonto] || '').replace(/[^\d-]/g, ''));
    if (!oc || !Number.isFinite(monto)) continue;
    const m = (c[iV] || '').match(/^(\d+)\s*-\s*(.+)$/);
    out.push({
      vendedorCodigo: m ? m[1] : '', vendedorNombre: m ? m[2].trim() : c[iV] || '',
      oc, sku: iSku >= 0 ? c[iSku] : '', skuDesc: iDesc >= 0 ? c[iDesc] : '',
      canal: iCanal >= 0 ? c[iCanal] : '', monto,
    });
  }
  return out;
}

/** Adivina la sublínea a partir de la descripción del SKU (solo sugerencia, se puede cambiar). */
export function guessSublinea(desc: string): { grupo: GrupoId; sublinea: string } {
  const d = ` ${desc.toUpperCase()} `;
  const has = (re: RegExp) => re.test(d);
  const pick = (sublinea: string) => ({ grupo: SUBLINEAS.find((s) => s.nombre === sublinea)!.grupo, sublinea });

  if (has(/ GAR /) || has(/SWITCH|PS5|PS4|XBOX|NINTENDO|VIDEOJUEGO/)) return pick('Videojuegos, garantía y otros electro');
  if (has(/IPHONE|SAMSUNG GALAXY|XIAOMI|REDMI|HUAWEI|MOTOROLA|CELULAR|SMARTPHONE|SMARTWATCH|WATCH|IPAD|TABLET/)) return pick('Telefonía');
  if (has(/ TV |SMART TV|TELEVISOR|PROYECTOR/)) return pick('Video');
  if (has(/AUDIFONO|PARLANTE|JBL|SOUNDBAR|BARRA DE SONIDO/)) return pick('Audio');
  if (has(/NOTEBOOK|LAPTOP|\bNT\b|MACBOOK|IMPRESORA|MULTIFUNCIONAL|MONITOR|MOUSE|TECLADO|\bI[357]-|CORE I[357]|\bP CORE/)) return pick('Computación y hogar');
  if (has(/REFRIGERADOR|FRIGOBAR|CONGELADOR/)) return pick('Refrigeración');
  if (has(/LAVADORA|SECADORA|LAVASECA/)) return pick('Lavado');
  if (has(/HORNO|ENCIMERA|COCINA|CAMPANA|MICROONDAS/)) return pick('Cocina');
  if (has(/CALENTADOR|ESTUFA|AIRE ACOND|CALEFACTOR|CLIMATIZ/)) return pick('Climatización');
  if (has(/ASPIRADORA|FREID|LICUADORA|LIC |PLANCHA|BATERIA|BATIDORA|HERVIDOR|CAFETERA|SECADOR/)) return pick('Electrodomésticos');
  if (has(/CABLE|CARGADOR|FUNDA|CASE |ADAPTADOR/)) return pick('Accesorios');
  if (has(/COLCHON|COLCHÓN|BOX SPRING|CAMA /)) return pick('Colchones y box spring');
  if (has(/VELADOR|COMODA|CÓMODA|CLOSET|CÓMODA|MUEBLE/)) return pick('Muebles dormitorio');
  if (has(/SILLON|SOFA|SOFÁ|TAPIZ|SILLA /)) return d.includes('SILLA AUTO') ? pick('Rodados y accesorios bebé') : pick('Tapicería');
  if (has(/COCHE|CARRIOLA|SILLA AUTO|BEBE|BEBÉ/)) return pick('Rodados y accesorios bebé');
  if (has(/BICICLETA|MANCUERNA|TROTADORA|PESAS|COLCHONETA|DISCOS|BANDAS EL|SPINNING|DEPORT/)) return pick('Deportes');
  if (has(/ZAP|ZAPATILLA|BOTIN|BOTÍN|SAN |SANDALIA|BOTA |MOCASIN|ASICS|ADIDAS|NIKE|GAZELLE|COURT|FILA|TIMBERLAN|HUSH|PUMA|REEBOK|CONVERSE|VANS/)) {
    const nino = has(/NI&NTILDE;O|NIÑO|NINO|INFANT|KIDS|COLEGIAL/);
    if (nino) return pick('Zapatos infantil y colegial');
    const mujer = has(/ MUJER | W |DAMA| DA |WOMEN/);
    const zapatilla = has(/ZAPATILLA|RUN|NIKE|ADIDAS|ASICS|COURT|GAZELLE|GEL |PUMA|REEBOK|FILA/);
    if (zapatilla) return pick(mujer ? 'Zapatillas mujer' : 'Zapatillas hombre');
    return pick(mujer ? 'Zapatos mujer' : 'Zapatos hombre');
  }
  return pick('Resto (vestuario, perfumería, blanco, deco, otros)');
}

export type Estado = 'ok' | 'diferencia' | 'faltante' | 'sobrante';

export interface ConcilRow {
  oc: string;
  estado: Estado;
  vendedor: string;           // "codigo - nombre" según Looker (o reporte si sobrante)
  vendedorCodigo: string;
  vendedorNombre: string;
  vendedorReportado: string;  // codigo del vendedor en el reporte
  canal: string;
  descripcion: string;
  montoLooker: number;
  montoReporte: number;
  diff: number;               // reporte - looker
  ventas: Venta[];            // ventas registradas con esa OC
  sugerencia: { grupo: GrupoId; sublinea: string };
  vendedorDistinto: boolean;
  pedidosSinOC: Venta[];      // ventas del reporte con N° de pedido (empieza con 1) sin OC
  candidatoOC?: string;       // OC de Looker que podría corresponder (mismo vendedor y monto)
}

export interface Conciliacion {
  rows: ConcilRow[];
  totalLooker: number;
  totalReporte: number;
  porVendedor: { codigo: string; nombre: string; looker: number; reporte: number; diff: number }[];
}

const norm = (s: string) => s.replace(/\s+/g, '').replace(/^0+/, '');

export function conciliar(lines: LookerLine[], ventas: Venta[]): Conciliacion {
  const byOc = new Map<string, LookerLine[]>();
  for (const l of lines) { const k = norm(l.oc); byOc.set(k, [...(byOc.get(k) || []), l]); }
  const repByOc = new Map<string, Venta[]>();
  for (const v of ventas) { const k = norm(claveOrden(v)); repByOc.set(k, [...(repByOc.get(k) || []), v]); }

  const rows: ConcilRow[] = [];
  for (const [k, ls] of byOc) {
    const rep = repByOc.get(k) || [];
    const montoLooker = ls.reduce((a, l) => a + l.monto, 0);
    const montoReporte = rep.reduce((a, v) => a + v.monto, 0);
    const top = [...ls].sort((a, b) => b.monto - a.monto)[0];
    const estado: Estado = !rep.length ? 'faltante' : Math.abs(montoLooker - montoReporte) <= 1 ? 'ok' : 'diferencia';
    rows.push({
      oc: ls[0].oc, estado, vendedorCodigo: top.vendedorCodigo, vendedorNombre: top.vendedorNombre,
      vendedor: `${top.vendedorCodigo} - ${top.vendedorNombre}`,
      vendedorReportado: rep[0]?.vendedorCodigo ?? '',
      canal: [...new Set(ls.map((l) => l.canal))].join(' / '),
      descripcion: ls.map((l) => l.skuDesc || '(sin SKU)').join(' · '),
      montoLooker, montoReporte, diff: montoReporte - montoLooker, ventas: rep,
      sugerencia: guessSublinea(top.skuDesc),
      vendedorDistinto: Boolean(rep.length && top.vendedorCodigo && rep.some((v) => v.vendedorCodigo !== top.vendedorCodigo)),
      pedidosSinOC: rep.filter(pedidoSinOC),
    });
  }
  for (const [k, rep] of repByOc) {
    if (byOc.has(k)) continue;
    const montoReporte = rep.reduce((a, v) => a + v.monto, 0);
    rows.push({
      oc: rep[0].orden, estado: 'sobrante', vendedorCodigo: rep[0].vendedorCodigo, vendedorNombre: rep[0].vendedorNombre,
      vendedor: `${rep[0].vendedorCodigo} - ${rep[0].vendedorNombre}`, vendedorReportado: rep[0].vendedorCodigo,
      canal: '', descripcion: rep.map((v) => v.sublinea).join(' · '), montoLooker: 0, montoReporte,
      diff: montoReporte, ventas: rep, sugerencia: { grupo: rep[0].grupo, sublinea: rep[0].sublinea }, vendedorDistinto: false,
      pedidosSinOC: rep.filter(pedidoSinOC),
    });
  }
  // Pedidos sin OC: buscar una orden de Looker faltante con mismo vendedor y monto
  for (const r of rows) {
    if (r.estado !== 'sobrante' || r.pedidosSinOC.length !== 1) continue;
    const cand = rows.filter((x) => x.estado === 'faltante' && x.vendedorCodigo === r.vendedorCodigo && Math.abs(x.montoLooker - r.montoReporte) <= 1);
    if (cand.length === 1) r.candidatoOC = cand[0].oc;
  }
  const orden: Record<Estado, number> = { faltante: 0, diferencia: 1, sobrante: 2, ok: 3 };
  rows.sort((a, b) => orden[a.estado] - orden[b.estado] || Math.abs(b.diff) - Math.abs(a.diff));

  const vend = new Map<string, { codigo: string; nombre: string; looker: number; reporte: number }>();
  for (const r of rows) {
    const e = vend.get(r.vendedorCodigo) || { codigo: r.vendedorCodigo, nombre: r.vendedorNombre, looker: 0, reporte: 0 };
    e.looker += r.montoLooker; e.reporte += r.montoReporte; vend.set(r.vendedorCodigo, e);
  }
  return {
    rows,
    totalLooker: rows.reduce((a, r) => a + r.montoLooker, 0),
    totalReporte: rows.reduce((a, r) => a + r.montoReporte, 0),
    porVendedor: [...vend.values()].map((v) => ({ ...v, diff: v.reporte - v.looker })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
  };
}

export const ESTADO_LABEL: Record<Estado, string> = {
  ok: 'Cuadra', diferencia: 'Monto distinto', faltante: 'Falta en reporte', sobrante: 'No está en Looker',
};

export function conciliacionCsv(c: Conciliacion, fecha: string): string {
  const q = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const head = ['Fecha', 'Estado', 'OC', 'Vendedor', 'Canal', 'Detalle', 'Monto Looker', 'Monto Reporte', 'Diferencia'];
  const lines = c.rows.map((r) => [fecha, ESTADO_LABEL[r.estado], r.oc, r.vendedor, r.canal, r.descripcion, r.montoLooker, r.montoReporte, r.diff].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...lines].join('\n');
}
