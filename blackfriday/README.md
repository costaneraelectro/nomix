# No Mix · Black Friday (Costanera Center)

App web para reportar la venta No Mix del Black Friday. Es una app **independiente** de la de Cyber Monday (raíz del repositorio): tiene su propio almacenamiento y su propia configuración.

- **Registrar / Ventas:** vendedor, monto, N° de orden (pedidos que empiezan con 1 llevan además la OC), departamento y casilla de boleteado. Editar y eliminar ventas, agregar vendedores, descargar CSV.
- **Reporte:** total, Calzado / Electro / Otras líneas lado a lado con detalle por departamento. Un botón por día del evento y el acumulado. Copia para WhatsApp o imagen.
- **Ranking:** por monto $ y por cantidad de ventas, del día, del evento o de todo lo registrado.
- **Conciliar:** cruza el *Detalle Vendedores* de Looker contra lo reportado (pedidos ↔ OC, faltantes, diferencias) y permite corregir o restaurar un día desde un CSV.
- **Config:** nombre del evento, días, metas por departamento (por día o del evento completo), meta diaria total opcional, agregar o quitar departamentos. Se guarda en el servidor y vale para todos.

## Desarrollo
```bash
cd blackfriday
npm install
npm run dev      # sin servidor de datos funciona en modo local (localStorage)
```

## Despliegue (Netlify)
Sitio nuevo con *Base directory* `blackfriday`. Los datos viven en Netlify Blobs a través de la función `netlify/functions/api.mts` (ruta `/api/*`), con escritura optimista para que varios usuarios guarden a la vez sin pisarse. No requiere Firebase ni variables de entorno.
