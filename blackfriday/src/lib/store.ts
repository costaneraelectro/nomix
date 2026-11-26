import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_CONFIG, type Config, type GrupoId } from '../data/config';
import { VENDEDORES, type Vendedor } from '../data/vendedores';

export interface Venta {
  id: string;
  fecha: string; // YYYY-MM-DD
  vendedorCodigo: string;
  vendedorNombre: string;
  monto: number;
  orden: string;      // lo que se anotó (puede ser N° de pedido, empieza con 1)
  ordenOC?: string;   // N° de orden (OC) que aparece en Looker
  origen?: 'looker';  // agregada desde Conciliar (no la registró un asesor)
  grupo: GrupoId;
  sublinea: string;
  boleteado: boolean;
  createdAt: number;
}
export type NuevaVenta = Omit<Venta, 'id' | 'createdAt'>;
export type Modo = 'api' | 'local' | 'detectando';

const LS_VENTAS = 'nomix.bf.ventas.v1';
const LS_VEND = 'nomix.bf.vendedores.v1';
const LS_CONFIG = 'nomix.bf.config.v1';
const readLocal = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const readLocalConfig = (): Config | null => {
  try { const c = JSON.parse(localStorage.getItem(LS_CONFIG) || 'null'); return c && Array.isArray(c.deptos) ? c : null; } catch { return null; }
};
const writeLocal = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin storage */ }
};

interface ApiState { ventas: Venta[]; vendedores: Vendedor[]; config: Config | null; etag: string }
const POLL_MS = 6000;

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(path, {
    method, headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store',
  });
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('json')) throw new Error('API no disponible');
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Error del servidor');
  return j as T;
}

export function useData() {
  const [modo, setModo] = useState<Modo>('detectando');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [extra, setExtra] = useState<Vendedor[]>([]);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const etag = useRef('');

  const applyApi = useCallback((s: ApiState) => {
    etag.current = s.etag; setVentas(s.ventas); setExtra(s.vendedores); setCfg(s.config ?? null);
  }, []);

  // API en línea (Netlify) o, si no existe, modo local
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async (first: boolean) => {
      try {
        if (document.visibilityState === 'hidden' && !first) throw new Error('hidden');
        const r = await api<ApiState & { unchanged?: boolean }>('GET', `/api/state${etag.current ? `?etag=${etag.current}` : ''}`);
        if (!alive) return;
        if (!r.unchanged) applyApi(r);
        setModo('api'); setError(null); setLoading(false);
      } catch (e) {
        if (!alive) return;
        if (first) {
          setVentas(readLocal<Venta>(LS_VENTAS)); setExtra(readLocal<Vendedor>(LS_VEND)); setCfg(readLocalConfig());
          setModo('local'); setLoading(false); return; // sin API: no seguir consultando
        }
        if (e instanceof Error && e.message !== 'hidden') setError('Sin conexión con el servidor, reintentando…');
      }
      timer = setTimeout(() => void tick(false), POLL_MS);
    };
    void tick(true);
    return () => { alive = false; clearTimeout(timer); };
  }, [applyApi]);

  const [pendientesLocales, setPendientesLocales] = useState(0);
  useEffect(() => { if (modo === 'api') setPendientesLocales(readLocal<Venta>(LS_VENTAS).length); }, [modo]);

  const config = cfg ?? DEFAULT_CONFIG;
  const configGuardada = cfg !== null;

  const vendedores = useMemo(() => {
    const map = new Map<string, Vendedor>();
    for (const v of [...VENDEDORES, ...extra]) map.set(v.codigo, v);
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [extra]);

  const viaApi = useCallback(async (method: string, path: string, body?: unknown) => {
    applyApi(await api<ApiState>(method, path, body));
  }, [applyApi]);

  const importarLocales = useCallback(async () => {
    const lv = readLocal<Venta>(LS_VENTAS);
    const r = await api<ApiState & { added: number }>('POST', '/api/ventas/import', { ventas: lv, vendedores: readLocal<Vendedor>(LS_VEND) });
    applyApi(r);
    writeLocal(`${LS_VENTAS}.respaldo`, lv);
    writeLocal(LS_VENTAS, []); writeLocal(LS_VEND, []); setPendientesLocales(0);
    return { total: lv.length, nuevas: r.added };
  }, [applyApi]);

  const agregar = useCallback(async (v: NuevaVenta) => {
    if (modo === 'api') return viaApi('POST', '/api/ventas', v);
    const next = [{ ...v, createdAt: Date.now(), id: crypto.randomUUID() }, ...readLocal<Venta>(LS_VENTAS)];
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const editar = useCallback(async (id: string, patch: Partial<NuevaVenta>) => {
    if (modo === 'api') return viaApi('PATCH', `/api/ventas/${id}`, patch);
    const next = readLocal<Venta>(LS_VENTAS).map((v) => (v.id === id ? { ...v, ...patch } : v));
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const eliminar = useCallback(async (id: string) => {
    if (modo === 'api') return viaApi('DELETE', `/api/ventas/${id}`);
    const next = readLocal<Venta>(LS_VENTAS).filter((v) => v.id !== id);
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const eliminarVarias = useCallback(async (ids: string[]) => {
    if (modo === 'api') return viaApi('POST', '/api/ventas/delete', { ids });
    const set = new Set(ids);
    const next = readLocal<Venta>(LS_VENTAS).filter((v) => !set.has(v.id));
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const importarVentas = useCallback(async (lista: NuevaVenta[]) => {
    if (!lista.length) return;
    if (modo === 'api') return viaApi('POST', '/api/ventas/import', { ventas: lista });
    const next = [...lista.map((v) => ({ ...v, createdAt: Date.now(), id: crypto.randomUUID() })), ...readLocal<Venta>(LS_VENTAS)];
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const agregarVendedor = useCallback(async (v: Vendedor) => {
    if (modo === 'api') return viaApi('POST', '/api/vendedores', v);
    const next = [...readLocal<Vendedor>(LS_VEND).filter((x) => x.codigo !== v.codigo), v];
    setExtra(next); writeLocal(LS_VEND, next);
  }, [modo, viaApi]);

  const guardarConfig = useCallback(async (c: Config) => {
    if (modo === 'api') return viaApi('PUT', '/api/config', c);
    setCfg(c); writeLocal(LS_CONFIG, c);
  }, [modo, viaApi]);

  return {
    modo, pendientesLocales, importarLocales, ventas, vendedores, config, configGuardada, loading, error,
    agregar, editar, eliminar, eliminarVarias, importarVentas, agregarVendedor, guardarConfig,
  };
}
