# Pedidos en Google Sheets

Con esto, cada pedido de la tienda:

- se guarda en una hoja de Google (con link corto, por ejemplo `https://kengo2.github.io/Xto.Stickers/#XTO-261023-1715-K7QF`),
- guarda en tu Google Drive las fotos que suben los clientes (carpeta **Pedidos XTO - fotos de clientes**, solo tú las ves),
- le envía al cliente un correo de confirmación: "nos comunicaremos lo más pronto posible para confirmar tu pedido y cualquier cambio".

El cliente ya no tiene que mandar el pedido por WhatsApp; WhatsApp queda para cotizaciones y dudas.

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

## Actualizar el código (correo al cliente y fotos)

Si ya tenías la hoja funcionando con la versión anterior:

1. En la hoja: **Extensiones → Apps Script**. Borra todo, pega el nuevo [`Pedidos.gs`](Pedidos.gs) y toca **Guardar**.
2. Elige **setup** y toca **Ejecutar**. Google pide permisos nuevos (Drive y correo): acéptalos igual que la primera vez.
3. **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar.** La URL sigue siendo la misma.

Los correos salen desde tu cuenta de Gmail con el nombre **XTO.STICKER** (Google permite unos 100 por día en cuentas gratis).

## Aviso de pedidos nuevos en Telegram

Te llega un mensaje al celular apenas entra un pedido, con el cliente, el detalle, el total y el link para verlo.

1. Instala **Telegram** y busca **@BotFather**. Escríbele `/newbot`.
   - Nombre: por ejemplo `Pedidos XTO`.
   - Usuario: tiene que terminar en `bot`, por ejemplo `xto_pedidos_bot`.
   - BotFather te responde con una **clave** (token), algo como `7123456789:AAH...`. **No la compartas con nadie.**
2. Toca el link de tu bot que te da BotFather (`t.me/xto_pedidos_bot`) y toca **Iniciar**.
3. En la hoja: **Extensiones → Apps Script**. Pega la clave entre las comillas de `TELEGRAM_TOKEN` y toca **Guardar**.
4. Elige la función **probarTelegram** y toca **Ejecutar** (acepta el permiso nuevo para conectarse a Telegram). Te debe llegar "✅ ¡Listo!" al bot.
5. **Implementar → Gestionar implementaciones → lápiz → Versión: Nueva versión → Implementar.**

No subas a GitHub el código con tu clave: pégala solo en Apps Script.

## Si cambias el código más adelante

Después de editar `Pedidos.gs`, ve a **Implementar → Gestionar implementaciones → editar (lápiz) → Versión: Nueva versión → Implementar**. Así se mantiene la misma URL.
