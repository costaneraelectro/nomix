import { AnimatePresence } from 'framer-motion';
import type { Vendedor } from '../data/vendedores';
import { money } from '../lib/format';
import type { NuevaVenta, Venta } from '../lib/store';
import { SaleForm } from './SaleForm';
import { SaleRow } from './SaleRow';

export function RegisterView({ ventas, vendedores, onSave, onSaved, onToggle, onEdit, onDelete, onSetOC, onNewVendor }: {
  ventas: Venta[]; vendedores: Vendedor[]; onSave: (v: NuevaVenta) => Promise<void>; onSaved: (msg: string) => void;
  onToggle: (id: string, b: boolean) => void; onEdit: (v: Venta) => void; onDelete: (id: string) => void; onSetOC: (id: string, oc: string) => void; onNewVendor: (nombre: string) => void;
}) {
  const recientes = ventas.slice(0, 12);
  return (
    <div className="split">
      <section className="panel">
        <h2 className="panel-title">Registrar venta</h2>
        <SaleForm vendedores={vendedores} submitLabel="Registrar venta" onNewVendor={onNewVendor}
          onSubmit={async (v) => { await onSave(v); onSaved(`${money(v.monto)} · ${v.vendedorNombre.split(' ')[0]} · ${v.sublinea}`); }} />
      </section>
      <section className="panel">
        <h2 className="panel-title">Últimas ventas <small>{ventas.length} en total</small></h2>
        <ul className="sales">
          <AnimatePresence initial={false}>
            {recientes.map((v) => <SaleRow key={v.id} v={v} showDate onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} onSetOC={onSetOC} />)}
          </AnimatePresence>
          {!recientes.length && <li className="empty-state">Aún no hay ventas registradas.</li>}
        </ul>
      </section>
    </div>
  );
}
