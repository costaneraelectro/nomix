import { useState } from 'react';
import type { Vendedor } from '../data/vendedores';
import { Modal } from './Modal';

export function VendorModal({ open, existing, initialNombre, onClose, onSave }: {
  open: boolean; existing: Vendedor[]; initialNombre?: string; onClose: () => void; onSave: (v: Vendedor) => Promise<void>;
}) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState(initialNombre ?? '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = codigo.trim();
    if (!/^\d{3,}$/.test(c)) return setErr('El código debe ser numérico (mínimo 3 dígitos)');
    if (nombre.trim().length < 3) return setErr('Ingresa el nombre');
    const dup = existing.find((v) => v.codigo === c);
    if (dup) return setErr(`El código ${c} ya existe: ${dup.nombre}`);
    setBusy(true);
    try { await onSave({ codigo: c, nombre: nombre.trim() }); setCodigo(''); setNombre(''); setErr(''); onClose(); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'No se pudo guardar'); }
    finally { setBusy(false); }
  }

  return (
    <Modal open={open} title="Agregar vendedor" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label className="field"><span>Código</span>
          <input inputMode="numeric" autoFocus placeholder="Ej. 123456" value={codigo} onChange={(e) => setCodigo(e.target.value)} /></label>
        <label className="field"><span>Nombre</span>
          <input placeholder="Nombre y apellido" value={nombre} onChange={(e) => setNombre(e.target.value)} /></label>
        {err && <p className="err">{err}</p>}
        <div className="actions row2">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button className="cta" disabled={busy}>{busy ? 'Guardando…' : 'Guardar vendedor'}</button>
        </div>
      </form>
    </Modal>
  );
}
