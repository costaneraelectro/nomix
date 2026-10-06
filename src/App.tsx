import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from './components/Modal';
import { ReconcileView } from './components/ReconcileView';
import { RegisterView } from './components/RegisterView';
import { RankingView } from './components/RankingView';
import { ReportView } from './components/ReportView';
import { SaleForm } from './components/SaleForm';
import { SalesView } from './components/SalesView';
import { VendorModal } from './components/VendorModal';
import { useData, type Venta } from './lib/store';

const TABS = [
  { id: 'registrar', label: 'Registrar', icon: 'M12 5v14M5 12h14' },
  { id: 'reporte', label: 'Reporte', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { id: 'ranking', label: 'Ranking', icon: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' },
  { id: 'ventas', label: 'Ventas', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id: 'conciliar', label: 'Conciliar', icon: 'M5 12l4 4L19 6M4 20h16' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<Tab>('registrar');
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<Venta | null>(null);
  const [vendorModal, setVendorModal] = useState<string | null>(null);
  const d = useData();

  const showToast = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast((t) => (t === m ? null : t)), 2600);
  }, []);
  const setOC = (id: string, oc: string) => void d.editar(id, { ordenOC: oc }).then(() => showToast(oc ? `✔ OC ${oc} guardada` : 'OC borrada'));
  const toggle = (id: string, b: boolean) => void d.editar(id, { boleteado: b });
  const remove = (id: string) => void d.eliminar(id).then(() => showToast('Venta eliminada'));

  return (
    <div className="app">
      <header className="topbar">
        <img src="/logo.png" alt="Cyber Monday" />
        <h1>Reporte No Mix <small>Costanera Center</small></h1>
        <span className={d.modo === 'local' || d.modo === 'detectando' ? 'sync' : 'sync on'}
          title={d.modo === 'local' ? 'Sin servidor: los datos quedan solo en este navegador' : 'Datos compartidos en línea'}>
          <i />{d.loading ? 'Conectando…' : d.modo === 'local' ? 'Modo local' : d.error ? 'Reconectando…' : 'En línea'}
        </span>
        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.id === tab && <motion.i layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }} />}
              <svg viewBox="0 0 24 24"><path d={t.icon} /></svg><span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>
      {d.error && <p className="err banner">{d.error}</p>}
      {d.modo === 'api' && d.pendientesLocales > 0 && (
        <div className="notice recover">
          <span>Hay <b>{d.pendientesLocales}</b> venta(s) guardadas solo en este navegador (de antes de pasar a modo en línea).</span>
          <button className="cta slim" onClick={() => void d.importarLocales()
            .then((r) => showToast(`✔ ${r.nuevas} venta(s) subidas${r.total - r.nuevas ? ` · ${r.total - r.nuevas} ya estaban` : ''}`))
            .catch(() => showToast('No se pudo subir, intenta de nuevo'))}>Subir al servidor</button>
        </div>
      )}

      <main>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>
            {tab === 'registrar' && (
              <RegisterView ventas={d.ventas} vendedores={d.vendedores} onSave={d.agregar} onSaved={(m) => showToast(`✔ Registrado: ${m}`)}
                onToggle={toggle} onEdit={setEditing} onDelete={remove} onSetOC={setOC} onNewVendor={setVendorModal} />
            )}
            {tab === 'reporte' && <ReportView ventas={d.ventas} onToast={showToast} />}
            {tab === 'ranking' && <RankingView ventas={d.ventas} />}
            {tab === 'ventas' && <SalesView ventas={d.ventas} onToggle={toggle} onEdit={setEditing} onDelete={remove} onSetOC={setOC} onToast={showToast} />}
            {tab === 'conciliar' && (
              <ReconcileView ventas={d.ventas} vendedores={d.vendedores} onAdd={d.agregar} onEdit={d.editar}
                onAddVendedor={d.agregarVendedor} onToast={showToast} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Modal open={Boolean(editing)} title="Editar venta" onClose={() => setEditing(null)}>
        {editing && (
          <SaleForm key={editing.id} initial={editing} vendedores={d.vendedores} submitLabel="Guardar cambios"
            onNewVendor={setVendorModal} onCancel={() => setEditing(null)}
            onSubmit={async (v) => { await d.editar(editing.id, v); setEditing(null); showToast('✔ Venta actualizada'); }} />
        )}
      </Modal>
      <VendorModal key={vendorModal ?? 'x'} open={vendorModal !== null} existing={d.vendedores} initialNombre={vendorModal ?? ''}
        onClose={() => setVendorModal(null)} onSave={async (v) => { await d.agregarVendedor(v); showToast(`✔ Vendedor agregado: ${v.nombre}`); }} />

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>{toast}</motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
