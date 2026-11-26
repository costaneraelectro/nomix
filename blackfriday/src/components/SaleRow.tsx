import { useState } from 'react';
import { motion } from 'framer-motion';
import { money } from '../lib/format';
import { esPedido, pedidoSinOC } from '../lib/orden';
import type { Venta } from '../lib/store';

export function SaleRow({ v, onToggle, onEdit, onDelete, onSetOC, showDate }: {
  v: Venta; onToggle: (id: string, b: boolean) => void; onEdit: (v: Venta) => void; onDelete: (id: string) => void;
  onSetOC?: (id: string, oc: string) => void; showDate?: boolean;
}) {
  const [sure, setSure] = useState(false);
  const [oc, setOc] = useState(v.ordenOC ?? '');
  const pedido = esPedido(v.orden);
  const guardarOC = () => { if (onSetOC && oc.trim() !== (v.ordenOC ?? '')) onSetOC(v.id, oc.trim()); };
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }}>
      <label className={v.boleteado ? 'toggle mini on' : 'toggle mini'} title="Boleteado">
        <input type="checkbox" checked={v.boleteado} onChange={(e) => onToggle(v.id, e.target.checked)} aria-label="Boleteado" />
        <span className="box"><svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" /></svg></span>
      </label>
      <div className="sale-main">
        <b>{money(v.monto)}</b>
        <span>{v.vendedorNombre} · {v.vendedorCodigo}</span>
        <small>{showDate && `${v.fecha} · `}{pedido ? 'Pedido' : 'Orden'} {v.orden} · {v.sublinea}</small>
        {pedido && onSetOC && (
          <div className={pedidoSinOC(v) ? 'oc-edit missing' : 'oc-edit'}>
            <input inputMode="numeric" placeholder="N° orden (OC)" value={oc} aria-label="N° de orden (OC)"
              onChange={(e) => setOc(e.target.value)} onBlur={guardarOC} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <em>{pedidoSinOC(v) ? 'falta OC' : '✔ OC'}</em>
          </div>
        )}
      </div>
      <div className="sale-actions">
        <button type="button" className="icon" onClick={() => onEdit(v)} aria-label="Editar" title="Editar">✎</button>
        <button type="button" className={sure ? 'icon del sure' : 'icon del'} aria-label="Eliminar" title="Eliminar"
          onClick={() => (sure ? onDelete(v.id) : (setSure(true), setTimeout(() => setSure(false), 2500)))}>
          {sure ? '¿Borrar?' : '🗑'}
        </button>
      </div>
    </motion.li>
  );
}
