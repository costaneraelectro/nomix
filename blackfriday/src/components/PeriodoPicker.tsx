import { diaCorto } from '../lib/format';

export type PeriodoSel = { tipo: 'dia'; fecha: string } | { tipo: 'evento' } | { tipo: 'todo' };

/** Un botón por día del evento, más el acumulado (y opcionalmente todo lo registrado). */
export function PeriodoPicker({ value, dias, conTodo, onChange }: {
  value: PeriodoSel; dias: string[]; conTodo?: boolean; onChange: (p: PeriodoSel) => void;
}) {
  return (
    <div className="seg small wrap">
      {dias.map((d) => (
        <button key={d} className={value.tipo === 'dia' && value.fecha === d ? 'on' : ''} onClick={() => onChange({ tipo: 'dia', fecha: d })}>{diaCorto(d)}</button>
      ))}
      {dias.length > 1 && <button className={value.tipo === 'evento' ? 'on' : ''} onClick={() => onChange({ tipo: 'evento' })}>Evento completo</button>}
      {conTodo && <button className={value.tipo === 'todo' ? 'on' : ''} onClick={() => onChange({ tipo: 'todo' })}>Todo</button>}
    </div>
  );
}

/** Día del evento más útil para abrir: hoy si es del evento, si no el último ya iniciado, si no el primero. */
export function diaInicial(dias: string[], hoy: string): string {
  if (dias.includes(hoy)) return hoy;
  const pasados = dias.filter((d) => d <= hoy);
  return pasados.length ? pasados[pasados.length - 1] : dias[0];
}
