export type GrupoId = 'calzado' | 'electro' | 'otras';

export const GRUPOS: { id: GrupoId; nombre: string; emoji: string }[] = [
  { id: 'calzado', nombre: 'Calzado', emoji: '👟' },
  { id: 'electro', nombre: 'Electro', emoji: '⚡' },
  { id: 'otras', nombre: 'Otras líneas', emoji: '🛋️' },
];

export interface Depto { grupo: GrupoId; nombre: string; meta: number }

export interface Config {
  evento: string;
  dias: string[];                 // fechas del evento (YYYY-MM-DD)
  modo: 'dia' | 'evento';         // las metas de los departamentos son por día o del evento completo
  metaDiariaTotal: number;        // opcional: meta total del día (0 = usar la suma de departamentos)
  deptos: Depto[];
}

const d = (grupo: GrupoId, nombre: string): Depto => ({ grupo, nombre, meta: 0 });

/** Mismos departamentos del reporte anterior; las metas se ingresan en Configuración. */
export const DEFAULT_CONFIG: Config = {
  evento: 'Black Friday 2026',
  dias: ['2026-11-27'],
  modo: 'dia',
  metaDiariaTotal: 0,
  deptos: [
    d('calzado', 'Zapatos hombre'), d('calzado', 'Zapatos mujer'), d('calzado', 'Zapatillas hombre'),
    d('calzado', 'Zapatillas mujer'), d('calzado', 'Zapatos infantil y colegial'),
    d('electro', 'Telefonía'), d('electro', 'Computación y hogar'), d('electro', 'Audio'), d('electro', 'Video'),
    d('electro', 'Refrigeración'), d('electro', 'Lavado'), d('electro', 'Cocina'), d('electro', 'Electrodomésticos'),
    d('electro', 'Climatización'), d('electro', 'Accesorios'), d('electro', 'Videojuegos, garantía y otros electro'),
    d('otras', 'Colchones y box spring'), d('otras', 'Muebles dormitorio'), d('otras', 'Tapicería'),
    d('otras', 'Rodados y accesorios bebé'), d('otras', 'Deportes'),
    d('otras', 'Resto (vestuario, perfumería, blanco, deco, otros)'),
  ],
};

export const nDias = (c: Config) => Math.max(c.dias.length, 1);
/** Meta de un departamento para un solo día. */
export const metaDia = (c: Config, x: Depto) => (c.modo === 'dia' ? x.meta : x.meta / nDias(c));
/** Meta de un departamento para todo el evento. */
export const metaEvento = (c: Config, x: Depto) => (c.modo === 'dia' ? x.meta * nDias(c) : x.meta);
