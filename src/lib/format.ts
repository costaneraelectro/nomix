const clp = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

export const money = (n: number) => `$${clp.format(Math.round(n))}`;
export const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Fecha local de hoy como YYYY-MM-DD (no UTC). */
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const longDate = (iso: string) => {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
