# No Mix · Cyber Monday (Costanera Center)

App web móvil para registrar la venta No Mix (vendedor, monto, N° de orden, departamento, boleteado) y generar el reporte con metas, cumplimiento y lo que falta.

- **Stack:** Vite + React + TypeScript, Framer Motion, Firebase Firestore (tiempo real).
- **Reporte:** Total día → Total Calzado / Electro / Otras líneas (venta, meta, % cumplimiento, falta) → detalle por sublínea de cada línea. Vista *Día* (meta diaria = meta Cyber ÷ 3) o *Cyber 3 días* (5–7 oct). Se puede copiar como texto para WhatsApp o descargar como imagen.
- **Datos:** `src/data/vendedores.ts` (53 vendedores, últimos 90 días) y `src/data/metas.ts` (metas por sublínea, Excel *Metas Cyber 2026*).

## Puesta en marcha
```bash
npm install
cp .env.example .env     # pega las credenciales web de tu proyecto Firebase
npm run dev
```
Sin `.env` funciona en **modo local** (localStorage) para probar.

## Firebase
1. Crea un proyecto → Firestore Database (modo producción).
2. Agrega una app Web y copia la config en `.env`.
3. Publica las reglas: `firebase deploy --only firestore:rules` (archivo `firestore.rules`).
4. Hosting opcional: `npm run build && firebase deploy --only hosting`.

Colección `ventas`: `fecha, vendedorCodigo, vendedorNombre, monto, orden, grupo, sublinea, boleteado, createdAt`.
