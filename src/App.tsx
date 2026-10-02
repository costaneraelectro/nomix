import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RegisterView } from './components/RegisterView';
import { ReportView } from './components/ReportView';
import { SalesView } from './components/SalesView';
import { firebaseEnabled } from './lib/firebase';
import { useVentas } from './lib/store';

const TABS = [
  { id: 'registrar', label: 'Registrar', icon: 'M12 5v14M5 12h14' },
  { id: 'reporte', label: 'Reporte', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { id: 'ventas', label: 'Ventas', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
] as const;
type Tab = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<Tab>('registrar');
  const [toast, setToast] = useState<string | null>(null);
  const { ventas, loading, error, agregar, setBoleteado, eliminar } = useVentas();

  const showToast = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast((t) => (t === m ? null : t)), 2600);
  }, []);

  return (
    <div className="app">
      <div className="glow" aria-hidden />
      <header className="topbar">
        <img src="/logo.png" alt="Cyber Monday" />
        <span className={firebaseEnabled ? 'sync on' : 'sync'} title={firebaseEnabled ? 'Sincronizado con Firebase' : 'Modo local: configura Firebase en .env'}>
          <i />{firebaseEnabled ? (loading ? 'Conectando…' : 'En vivo') : 'Modo local'}
        </span>
      </header>
      {error && <p className="err banner">Firebase: {error}</p>}

      <main>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}>
            {tab === 'registrar' && <RegisterView onSave={agregar} onSaved={(m) => showToast(`✔ Registrado: ${m}`)} />}
            {tab === 'reporte' && <ReportView ventas={ventas} onToast={showToast} />}
            {tab === 'ventas' && <SalesView ventas={ventas} onToggle={setBoleteado} onDelete={eliminar} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div className="toast" initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}>{toast}</motion.div>
        )}
      </AnimatePresence>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.id === tab && <motion.i layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', duration: 0.4, bounce: 0.18 }} />}
            <svg viewBox="0 0 24 24"><path d={t.icon} /></svg><span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
