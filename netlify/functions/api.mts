import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';
import { handle, type StoreLike } from '../lib/db.mts';

export default async (req: Request, _ctx: Context) => {
  const store = getStore({ name: 'nomix', consistency: 'strong' }) as unknown as StoreLike;
  const url = new URL(req.url);
  let body: Record<string, unknown> | null = null;
  if (req.method === 'POST' || req.method === 'PATCH') {
    try { body = await req.json(); } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }); }
  }
  try {
    const r = await handle(store, req.method, url.pathname, url.searchParams, body);
    return Response.json(r.json, { status: r.status, headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Error del servidor' }, { status: 500 });
  }
};

export const config: Config = { path: '/api/*' };
