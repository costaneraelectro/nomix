import { useCallback, useEffect, useMemo, useState } from 'react';
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
  orden: string;
  grupo: GrupoId;
  sublinea: string;
  boleteado: boolean;
  createdAt: number;
}
export type NuevaVenta = Omit<Venta, 'id' | 'createdAt'>;

const LS_VENTAS = 'nomix.ventas.v1';
const LS_VEND = 'nomix.vendedores.v1';
const readLocal = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const writeLocal = (key: string, v: unknown) => {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* sin storage */ }
};

export function useData() {
  const [ventas, setVentas] = useState<Venta[]>(() => (db ? [] : readLocal<Venta>(LS_VENTAS)));
  const [extra, setExtra] = useState<Vendedor[]>(() => (db ? [] : readLocal<Vendedor>(LS_VEND)));
  const [loading, setLoading] = useState(Boolean(db));
  const [error, setError] = useState<string | null>(null);

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
    const offU = onSnapshot(collection(db, 'vendedores'), (snap) => {
      setExtra(snap.docs.map((d) => d.data() as Vendedor));
    });
    return () => { offV(); offU(); };
  }, []);

  const vendedores = useMemo(() => {
    const map = new Map<string, Vendedor>();
    for (const v of [...VENDEDORES, ...extra]) map.set(v.codigo, v);
    return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [extra]);

  const agregar = useCallback(async (v: NuevaVenta) => {
    const data = { ...v, createdAt: Date.now() };
    if (db) { await addDoc(collection(db, 'ventas'), data); return; }
    const next = [{ ...data, id: crypto.randomUUID() }, ...readLocal<Venta>(LS_VENTAS)];
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, []);

  const editar = useCallback(async (id: string, patch: Partial<NuevaVenta>) => {
    if (db) { await updateDoc(doc(db, 'ventas', id), patch); return; }
    const next = readLocal<Venta>(LS_VENTAS).map((v) => (v.id === id ? { ...v, ...patch } : v));
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, []);

  const eliminar = useCallback(async (id: string) => {
    if (db) { await deleteDoc(doc(db, 'ventas', id)); return; }
    const next = readLocal<Venta>(LS_VENTAS).filter((v) => v.id !== id);
    setVentas(next); writeLocal(LS_VENTAS, next);
  }, []);

  const agregarVendedor = useCallback(async (v: Vendedor) => {
    if (db) { await setDoc(doc(db, 'vendedores', v.codigo), v); return; }
    const next = [...readLocal<Vendedor>(LS_VEND).filter((x) => x.codigo !== v.codigo), v];
    setExtra(next); writeLocal(LS_VEND, next);
  }, []);

  return { ventas, vendedores, loading, error, agregar, editar, eliminar, agregarVendedor };
}
