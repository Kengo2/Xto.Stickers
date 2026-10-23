# Pedidos en Google Sheets

Con esto, cada pedido de la tienda se guarda en una hoja de Google y el link de WhatsApp queda corto
(por ejemplo `https://kengo2.github.io/Xto.Stickers/#XTO-261023-1715-K7QF`).

## Pasos (unos 10 minutos)

1. **Crea la hoja.** Entra a [sheets.new](https://sheets.new) con tu cuenta de Google y ponle de nombre `Pedidos XTO`.
2. **Abre el editor de código.** En el menú: **Extensiones → Apps Script**.
3. **Pega el código.** Borra lo que aparece, pega todo el contenido de [`Pedidos.gs`](Pedidos.gs) y toca **Guardar** (ícono de disquete).
   - Si quieres un correo por cada pedido nuevo, escribe tu correo entre las comillas de `CORREO_AVISO`.
4. **Prepara la hoja.** Arriba, en la lista de funciones, elige **setup** y toca **Ejecutar**.
   - Google pide permiso: **Revisar permisos → tu cuenta**.
   - Si sale "Google no ha verificado esta aplicación": **Configuración avanzada → Ir a … (no seguro)** → **Permitir**. Es tu propio código, por eso sale ese aviso.
   - Vuelve a la hoja: verás la pestaña **Pedidos** con sus columnas.
5. **Publícalo.** Toca **Implementar → Nueva implementación**.
   - En "Seleccionar tipo" (engranaje) elige **Aplicación web**.
   - **Ejecutar como:** Yo. **Quién tiene acceso:** Cualquier usuario.
   - Toca **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. **Pásale esa URL a Claude**, o pégala tú en `index.html`, en la línea `const ORDERS_URL="";`.

## Cómo se usa

- Cada pedido llega como una fila nueva con **Estado: Nuevo**. Cámbialo a *En proceso*, *Listo*, *Entregado* o *Cancelado* para llevar el control.
- La columna **Ver pedido** abre el pedido con imágenes, medidas y el acomodo de cada hoja.
- La columna **Datos** está oculta: es lo que usa la página para mostrar el pedido. No la borres.

## Si cambias el código más adelante

Después de editar `Pedidos.gs`, ve a **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Así se mantiene la misma URL.
