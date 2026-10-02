export type GrupoId = 'calzado' | 'electro' | 'otras';

export interface Sublinea { grupo: GrupoId; nombre: string; meta3d: number }

export const GRUPOS: { id: GrupoId; nombre: string; emoji: string }[] = [
  { id: 'calzado', nombre: 'Calzado', emoji: '👟' },
  { id: 'electro', nombre: 'Electro', emoji: '⚡' },
  { id: 'otras', nombre: 'Otras líneas', emoji: '🛋️' },
];

export const DIAS_CYBER = 3;
export const FECHAS_CYBER = ['2026-10-05', '2026-10-06', '2026-10-07'];

// Metas Cyber 2026 por sublínea (estimado propio: 50% reparto Cyber 2025 + 50% septiembre 2026)
export const SUBLINEAS: Sublinea[] = [
  {
    "grupo": "calzado",
    "nombre": "Zapatos hombre",
    "meta3d": 1690486
  },
  {
    "grupo": "calzado",
    "nombre": "Zapatos mujer",
    "meta3d": 1669430
  },
  {
    "grupo": "calzado",
    "nombre": "Zapatillas hombre",
    "meta3d": 327297
  },
  {
    "grupo": "calzado",
    "nombre": "Zapatillas mujer",
    "meta3d": 302371
  },
  {
    "grupo": "calzado",
    "nombre": "Zapatos infantil y colegial",
    "meta3d": 32575
  },
  {
    "grupo": "electro",
    "nombre": "Telefonía",
    "meta3d": 22606679
  },
  {
    "grupo": "electro",
    "nombre": "Computación y hogar",
    "meta3d": 4265140
  },
  {
    "grupo": "electro",
    "nombre": "Audio",
    "meta3d": 998283
  },
  {
    "grupo": "electro",
    "nombre": "Video",
    "meta3d": 1204017
  },
  {
    "grupo": "electro",
    "nombre": "Refrigeración",
    "meta3d": 1083861
  },
  {
    "grupo": "electro",
    "nombre": "Lavado",
    "meta3d": 746634
  },
  {
    "grupo": "electro",
    "nombre": "Cocina",
    "meta3d": 156235
  },
  {
    "grupo": "electro",
    "nombre": "Electrodomésticos",
    "meta3d": 870909
  },
  {
    "grupo": "electro",
    "nombre": "Climatización",
    "meta3d": 95617
  },
  {
    "grupo": "electro",
    "nombre": "Accesorios",
    "meta3d": 1259583
  },
  {
    "grupo": "electro",
    "nombre": "Videojuegos, garantía y otros electro",
    "meta3d": 1493815
  },
  {
    "grupo": "otras",
    "nombre": "Colchones y box spring",
    "meta3d": 1105665
  },
  {
    "grupo": "otras",
    "nombre": "Muebles dormitorio",
    "meta3d": 576204
  },
  {
    "grupo": "otras",
    "nombre": "Tapicería",
    "meta3d": 740141
  },
  {
    "grupo": "otras",
    "nombre": "Rodados y accesorios bebé",
    "meta3d": 161874
  },
  {
    "grupo": "otras",
    "nombre": "Deportes",
    "meta3d": 297743
  },
  {
    "grupo": "otras",
    "nombre": "Resto (vestuario, perfumería, blanco, deco, otros)",
    "meta3d": 4256454
  }
];
