// Lógica de la API sobre un "store" de Netlify Blobs. Un solo blob con todo el estado,
// escrito con control optimista (etag) para que dos usuarios guardando a la vez no se pisen.

export interface Venta {
  id: string;
  fecha: string;
  vendedorCodigo: string;
  vendedorNombre: string;
  monto: number;
  orden: string;
  ordenOC?: string;
  grupo: string;
  sublinea: string;
  boleteado: boolean;
  createdAt: number;
}
export interface Vendedor { codigo: string; nombre: string }
export interface State { ventas: Venta[]; vendedores: Vendedor[] }

export interface StoreLike {
  getWithMetadata(key: string, opts: { type: 'json' }): Promise<{ data: unknown; etag: string } | null>;
  getMetadata(key: string): Promise<{ etag: string } | null>;
  setJSON(key: string, value: unknown, opts?: { onlyIfNew?: boolean; onlyIfMatch?: string }): Promise<{ modified: boolean; etag?: string }>;
}

const KEY = 'state';
const EMPTY: State = { ventas: [], vendedores: [] };

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

export async function readState(store: StoreLike): Promise<{ state: State; etag: string }> {
  const r = await store.getWithMetadata(KEY, { type: 'json' });
  if (!r) return { state: EMPTY, etag: 'empty' };
  const s = r.data as Partial<State>;
  return { state: { ventas: s.ventas ?? [], vendedores: s.vendedores ?? [] }, etag: r.etag };
}

export async function currentEtag(store: StoreLike): Promise<string> {
  return (await store.getMetadata(KEY))?.etag ?? 'empty';
}

/** Lee, aplica `fn` y escribe solo si nadie escribió en medio; reintenta si hubo choque. */
export async function mutate(store: StoreLike, fn: (s: State) => State): Promise<{ state: State; etag: string }> {
  for (let i = 0; i < 10; i++) {
    const cur = await store.getWithMetadata(KEY, { type: 'json' });
    const base: State = cur
      ? { ventas: (cur.data as Partial<State>).ventas ?? [], vendedores: (cur.data as Partial<State>).vendedores ?? [] }
      : { ventas: [], vendedores: [] };
    const next = fn(structuredClone(base));
    const w = await store.setJSON(KEY, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (w.modified) return { state: next, etag: w.etag ?? 'unknown' };
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 120));
  }
  throw new HttpError(409, 'Muchos cambios a la vez, intenta de nuevo');
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function cleanVenta(b: Record<string, unknown>): Omit<Venta, 'id' | 'createdAt'> {
  const monto = Number(b.monto);
  const v = {
    fecha: str(b.fecha, 10), vendedorCodigo: str(b.vendedorCodigo, 20), vendedorNombre: str(b.vendedorNombre),
    monto, orden: str(b.orden, 40), ordenOC: str(b.ordenOC, 40) || undefined,
    grupo: str(b.grupo, 20), sublinea: str(b.sublinea), boleteado: Boolean(b.boleteado),
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) throw new HttpError(400, 'Fecha inválida');
  if (!Number.isFinite(monto) || monto <= 0) throw new HttpError(400, 'Monto inválido');
  if (!v.vendedorCodigo || !v.orden || !v.sublinea) throw new HttpError(400, 'Faltan datos');
  return v;
}

export async function handle(
  store: StoreLike, method: string, path: string, query: URLSearchParams, body: Record<string, unknown> | null,
  newId: () => string = () => crypto.randomUUID(), now: () => number = () => Date.now(),
): Promise<{ status: number; json: unknown }> {
  const parts = path.replace(/^\/api\/?/, '').split('/').filter(Boolean);
  try {
    if (method === 'GET' && parts[0] === 'state') {
      const have = query.get('etag');
      if (have && have === (await currentEtag(store))) return { status: 200, json: { unchanged: true, etag: have } };
      const { state, etag } = await readState(store);
      return { status: 200, json: { ...state, etag } };
    }
    if (method === 'POST' && parts[0] === 'ventas') {
      const v = cleanVenta(body ?? {});
      const r = await mutate(store, (s) => ({ ...s, ventas: [{ ...v, id: newId(), createdAt: now() }, ...s.ventas] }));
      return { status: 200, json: { ...r.state, etag: r.etag } };
    }
    if (method === 'PATCH' && parts[0] === 'ventas' && parts[1]) {
      const id = parts[1]; const b = body ?? {};
      const r = await mutate(store, (s) => {
        const cur = s.ventas.find((x) => x.id === id);
        if (!cur) throw new HttpError(404, 'La venta ya no existe');
        const merged = cleanVenta({ ...cur, ...b });
        return { ...s, ventas: s.ventas.map((x) => (x.id === id ? { ...x, ...merged } : x)) };
      });
      return { status: 200, json: { ...r.state, etag: r.etag } };
    }
    if (method === 'DELETE' && parts[0] === 'ventas' && parts[1]) {
      const id = parts[1];
      const r = await mutate(store, (s) => ({ ...s, ventas: s.ventas.filter((x) => x.id !== id) }));
      return { status: 200, json: { ...r.state, etag: r.etag } };
    }
    if (method === 'POST' && parts[0] === 'vendedores') {
      const codigo = str(body?.codigo, 20), nombre = str(body?.nombre);
      if (!/^\d{3,}$/.test(codigo) || nombre.length < 3) throw new HttpError(400, 'Vendedor inválido');
      const r = await mutate(store, (s) => ({ ...s, vendedores: [...s.vendedores.filter((v) => v.codigo !== codigo), { codigo, nombre }] }));
      return { status: 200, json: { ...r.state, etag: r.etag } };
    }
    return { status: 404, json: { error: 'No encontrado' } };
  } catch (e) {
    if (e instanceof HttpError) return { status: e.status, json: { error: e.message } };
    throw e;
  }
}
