import { useCallback, useEffect, useState } from 'react';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { GrupoId } from '../data/metas';

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

const LS_KEY = 'nomix.ventas.v1';
const readLocal = (): Venta[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
};

export function useVentas() {
  const [ventas, setVentas] = useState<Venta[]>(() => (db ? [] : readLocal()));
  const [loading, setLoading] = useState(Boolean(db));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'ventas'), orderBy('createdAt', 'desc'));
    return onSnapshot(
      q,
      (snap) => {
        setVentas(snap.docs.map((d) => ({ ...(d.data() as Omit<Venta, 'id'>), id: d.id })));
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); },
    );
  }, []);

  const persistLocal = (next: Venta[]) => {
    setVentas(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* sin storage */ }
  };

  const agregar = useCallback(async (v: NuevaVenta) => {
    const data = { ...v, createdAt: Date.now() };
    if (db) { await addDoc(collection(db, 'ventas'), data); return; }
    persistLocal([{ ...data, id: crypto.randomUUID() }, ...readLocal()]);
  }, []);

  const setBoleteado = useCallback(async (id: string, boleteado: boolean) => {
    if (db) { await updateDoc(doc(db, 'ventas', id), { boleteado }); return; }
    persistLocal(readLocal().map((v) => (v.id === id ? { ...v, boleteado } : v)));
  }, []);

  const eliminar = useCallback(async (id: string) => {
    if (db) { await deleteDoc(doc(db, 'ventas', id)); return; }
    persistLocal(readLocal().filter((v) => v.id !== id));
  }, []);

  return { ventas, loading, error, agregar, setBoleteado, eliminar };
}
