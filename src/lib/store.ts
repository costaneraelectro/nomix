import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { GrupoId } from '../data/metas';
import { VENDEDORES, type Vendedor } from '../data/vendedores';

export interface Venta {
  id: string;
  fecha: string; // YYYY-MM-DD
  vendedorCodigo: string;
  vendedorNombre: string;
  monto: number;
  orden: string;      // lo que se anotó (puede ser N° de pedido, empieza con 1)
  ordenOC?: string;   // N° de orden (OC) que aparece en Looker
  grupo: GrupoId;
  sublinea: string;
  boleteado: boolean;
  createdAt: number;
}
export type NuevaVenta = Omit<Venta, 'id' | 'createdAt'>;
export type Modo = 'firebase' | 'api' | 'local' | 'detectando';

const LS_VENTAS = 'nomix.ventas.v1';
const LS_VEND = 'nomix.vendedores.v1';
const readLocal = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const writeLocal = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin storage */ }
};

interface ApiState { ventas: Venta[]; vendedores: Vendedor[]; etag: string }
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
  const [modo, setModo] = useState<Modo>(db ? 'firebase' : 'detectando');
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [extra, setExtra] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const etag = useRef('');

  const applyApi = useCallback((s: ApiState) => {
    etag.current = s.etag; setVentas(s.ventas); setExtra(s.vendedores);
  }, []);

  // Firebase (tiempo real)
  useEffect(() => {
    if (!db) return;
    const offV = onSnapshot(
      query(collection(db, 'ventas'), orderBy('createdAt', 'desc')),
      (snap) => {
        setVentas(snap.docs.map((d) => ({ ...(d.data() as Omit<Venta, 'id'>), id: d.id })));
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); },
    );
    const offU = onSnapshot(collection(db, 'vendedores'), (snap) => setExtra(snap.docs.map((d) => d.data() as Vendedor)));
    return () => { offV(); offU(); };
  }, []);

  // API en línea (Netlify) o, si no existe, modo local
  useEffect(() => {
    if (db) return;
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
          setVentas(readLocal<Venta>(LS_VENTAS)); setExtra(readLocal<Vendedor>(LS_VEND));
          setModo('local'); setLoading(false); return; // sin API: no seguir consultando
        }
        if (e instanceof Error && e.message !== 'hidden') setError('Sin conexión con el servidor, reintentando…');
      }
      timer = setTimeout(() => void tick(false), POLL_MS);
    };
    void tick(true);
    return () => { alive = false; clearTimeout(timer); };
  }, [applyApi]);

  const vendedores = useMemo(() => {
    const map = new Map<string, Vendedor>();
    for (const v of [...VENDEDORES, ...extra]) map.set(v.codigo, v);
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [extra]);

  const viaApi = useCallback(async (method: string, path: string, body?: unknown) => {
    applyApi(await api<ApiState>(method, path, body));
  }, [applyApi]);

  const agregar = useCallback(async (v: NuevaVenta) => {
    if (db) { await addDoc(collection(db, 'ventas'), { ...v, createdAt: Date.now() }); return; }
    if (modo === 'api') return viaApi('POST', '/api/ventas', v);
    const next = [{ ...v, createdAt: Date.now(), id: crypto.randomUUID() }, ...readLocal<Venta>(LS_VENTAS)];
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const editar = useCallback(async (id: string, patch: Partial<NuevaVenta>) => {
    if (db) { await updateDoc(doc(db, 'ventas', id), patch); return; }
    if (modo === 'api') return viaApi('PATCH', `/api/ventas/${id}`, patch);
    const next = readLocal<Venta>(LS_VENTAS).map((v) => (v.id === id ? { ...v, ...patch } : v));
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const eliminar = useCallback(async (id: string) => {
    if (db) { await deleteDoc(doc(db, 'ventas', id)); return; }
    if (modo === 'api') return viaApi('DELETE', `/api/ventas/${id}`);
    const next = readLocal<Venta>(LS_VENTAS).filter((v) => v.id !== id);
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, [modo, viaApi]);

  const agregarVendedor = useCallback(async (v: Vendedor) => {
    if (db) { await setDoc(doc(db, 'vendedores', v.codigo), v); return; }
    if (modo === 'api') return viaApi('POST', '/api/vendedores', v);
    const next = [...readLocal<Vendedor>(LS_VEND).filter((x) => x.codigo !== v.codigo), v];
    setExtra(next); writeLocal(LS_VEND, next);
  }, [modo, viaApi]);

  return { modo, ventas, vendedores, loading, error, agregar, editar, eliminar, agregarVendedor };
}
