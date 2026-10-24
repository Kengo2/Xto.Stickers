/**
 * XTO.STICKER · Pedidos en Google Sheets
 *
 * Guarda cada pedido de la tienda en la hoja "Pedidos", guarda las fotos de los clientes en Drive,
 * le envía al cliente un correo de confirmación y devuelve el pedido por su número
 * para el link "Ver pedido".
 * Instrucciones: google-apps-script/LEEME.md
 */

const HOJA = 'Pedidos';
const SITIO = 'https://kengo2.github.io/Xto.Stickers/';
const WHATSAPP = '593987946718';
const CARPETA_FOTOS = 'Pedidos XTO - fotos de clientes';
// Opcional: escribe tu correo para recibir un aviso por cada pedido nuevo (déjalo vacío para no recibir).
const CORREO_AVISO = '';
// Opcional: aviso en el celular por Telegram. Pega aquí la clave (token) que te da @BotFather.
// No subas este archivo con la clave a GitHub: pégala solo en Apps Script.
const TELEGRAM_TOKEN = '';

const COLUMNAS = ['Fecha', 'Pedido', 'Cliente', 'Teléfono', 'Correo', 'Total', 'Resumen', 'Estado', 'Ver pedido', 'Datos', 'Fotos'];
const ESTADOS = ['Nuevo', 'En proceso', 'Listo', 'Entregado', 'Cancelado'];

/** Ejecuta esta función una vez (y otra vez después de actualizar el código): prepara la hoja y pide los permisos. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);
  sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#f1e8f7');
  sh.setFrozenRows(1);
  const reglas = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
  sh.getRange(2, 8, sh.getMaxRows() - 1, 1).setDataValidation(reglas);
  sh.setColumnWidth(7, 360);
  sh.setColumnWidth(11, 260);
  sh.hideColumns(10);   // "Datos" es para la página, no hace falta verla
  carpeta();            // pide permiso para Drive
  MailApp.getRemainingDailyQuota();   // pide permiso para enviar correos
}

/** La tienda envía aquí cada pedido nuevo. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!/^XTO-[A-Z0-9-]{6,30}$/.test(d.id || '')) return respuesta({ ok: false, error: 'numero' });
    if (typeof d.p !== 'string' || d.p.length > 45000) return respuesta({ ok: false, error: 'datos' });
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    let nuevo = false, fotos = [];
    try {
      const sh = hoja();
      if (!buscar(sh, d.id)) {
        fotos = guardarFotos(d.id, d.fotos || []);
        sh.appendRow([new Date(), d.id, texto(d.n), texto(d.t), texto(d.e), texto(d.total), texto(d.r), 'Nuevo', SITIO + '#' + d.id, d.p,
          fotos.map(f => 'Línea ' + f.li + ' (' + f.tipo + '): ' + f.url).join('\n')]);
        nuevo = true;
      }
    } finally {
      lock.releaseLock();
    }
    let correo = false;
    if (nuevo) {
      try { correoCliente(d); correo = true; } catch (err) { console.error('Correo al cliente', err); }
      try { avisoTelegram(d, fotos); } catch (err) { console.error('Telegram', err); }
      if (CORREO_AVISO) {
        try {
          const disenos = fotos.filter(f => f.tipo === 'diseño').map(f => f.blob);
          MailApp.sendEmail(CORREO_AVISO, 'Nuevo pedido ' + d.id + ' · ' + (d.n || ''),
            (d.n || '') + ' · ' + (d.t || '') + ' · ' + (d.e || '') + '\n\n' + (d.detalle || []).join('\n') + '\n\nTotal estimado: ' + (d.total || '') + '\n\n' + SITIO + '#' + d.id,
            disenos.length ? { attachments: disenos } : {});
        } catch (err) { console.error('Aviso', err); }
      }
    }
    return respuesta({ ok: true, correo: correo });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  }
}

/** La página pide aquí un pedido por su número para mostrarlo con imágenes. */
function doGet(e) {
  const id = (e.parameter.id || '').trim();
  if (!/^XTO-[A-Z0-9-]{6,30}$/.test(id)) return respuesta({ ok: false, error: 'numero' });
  const fila = buscar(hoja(), id);
  if (!fila) return respuesta({ ok: false, error: 'no existe' });
  const fotos = String(fila[10] || '').split('\n').map(t => t.match(/^Línea (\d+) \((.+?)\): (\S+)$/)).filter(Boolean)
    .map(m => ({ li: +m[1], tipo: m[2], url: m[3] }));
  fotos.filter(f => f.tipo === 'diseño').forEach(f => {
    try {
      const b = DriveApp.getFileById(f.url.match(/\/d\/([^/]+)/)[1]).getBlob();
      f.data = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
    } catch (err) { console.error('Diseño', err); }
  });
  return respuesta({ ok: true, p: fila[9], fotos: fotos });
}

// Guarda en Drive las fotos que subió el cliente; solo tú puedes abrirlas.
function guardarFotos(id, lista) {
  if (!lista.length) return [];
  const dir = carpeta();
  return lista.slice(0, 10).map(f => {
    const tipo = ['sin fondo', 'diseño'].indexOf(f.tipo) >= 0 ? f.tipo : 'original';
    const mime = /^image\/(png|jpeg|webp)$/.test(f.mime) ? f.mime : 'image/jpeg';
    const nombre = id + ' - linea ' + f.li + ' - ' + tipo + ' - ' + String(f.n || 'foto').slice(0, 80);
    const blob = Utilities.newBlob(Utilities.base64Decode(f.b64), mime, nombre + (mime === 'image/png' ? '.png' : '.jpg'));
    const archivo = dir.createFile(blob);
    return { li: f.li, tipo: tipo, url: archivo.getUrl(), blob: blob };
  });
}

function correoCliente(d) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.e || '')) return;
  const link = SITIO + '#' + d.id;
  const nombre = String(d.n || '').split(' ')[0];
  const filas = (d.detalle || []).map(t => '<li style="margin:4px 0">' + html(t.replace(/^• /, '')) + '</li>').join('');
  const cuerpo =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;color:#1a1423;line-height:1.5">' +
    '<h2 style="color:#7a3fa0;margin:0 0 12px">¡Recibimos tu pedido!</h2>' +
    '<p>Hola ' + html(nombre) + ',</p>' +
    '<p>Tu pedido <b>' + html(d.id) + '</b> llegó bien. <b>Nos comunicaremos contigo lo más pronto posible</b> para confirmar tu pedido y cualquier cambio que desees hacer.</p>' +
    '<ul style="padding-left:18px">' + filas + '</ul>' +
    '<p><b>Total estimado:</b> ' + html(d.total || '') + '</p>' +
    '<p style="margin:22px 0"><a href="' + link + '" style="background:#ff5a1f;color:#1a1423;padding:11px 20px;border-radius:99px;text-decoration:none;font-weight:bold;border:2px solid #1a1423">Ver mi pedido</a></p>' +
    '<p style="color:#554d62;font-size:13px">¿Tienes dudas o quieres cotizar algo más? Escríbenos por WhatsApp: <a href="https://wa.me/' + WHATSAPP + '" style="color:#7a3fa0">+593 98 794 6718</a></p>' +
    '<p style="color:#554d62;font-size:13px">XTO.STICKER · Arte Adhesivo</p></div>';
  const texto = 'Hola ' + nombre + ',\n\nTu pedido ' + d.id + ' llegó bien. Nos comunicaremos contigo lo más pronto posible para confirmar tu pedido y cualquier cambio que desees hacer.\n\n' +
    (d.detalle || []).join('\n') + '\n\nTotal estimado: ' + (d.total || '') + '\n\nVer mi pedido: ' + link + '\n\nWhatsApp: +593 98 794 6718\nXTO.STICKER · Arte Adhesivo';
  const opciones = { htmlBody: cuerpo, name: 'XTO.STICKER' };
  if (CORREO_AVISO) opciones.replyTo = CORREO_AVISO;
  MailApp.sendEmail(d.e, 'Recibimos tu pedido ' + d.id + ' · XTO.STICKER', texto, opciones);
}

/** Aviso al celular: manda el pedido nuevo a tu chat con el bot de Telegram. */
function avisoTelegram(d, fotos) {
  if (!TELEGRAM_TOKEN) return;
  const chat = chatTelegram();
  if (!chat) return;
  const t = '🛒 <b>Nuevo pedido ' + html(d.id) + '</b>\n' +
    '👤 ' + html(d.n || '') + '\n📞 ' + html(d.t || '') + '\n✉️ ' + html(d.e || '') + '\n\n' +
    (d.detalle || []).map(html).join('\n') + '\n\n💰 Total estimado: <b>' + html(d.total || '') + '</b>' +
    ((fotos || []).some(f => f.tipo !== 'diseño') ? '\n📷 Trae foto del cliente (está en Drive)' : '') +
    '\n\n<a href="' + SITIO + '#' + d.id + '">Ver pedido con imágenes</a>';
  telegram('sendMessage', { chat_id: chat, text: t.slice(0, 4000), parse_mode: 'HTML', disable_web_page_preview: true });
  // imagen del diseño final (por ejemplo, cómo quedó la patineta)
  (fotos || []).filter(f => f.tipo === 'diseño').forEach(f => {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendPhoto',
      { method: 'post', payload: { chat_id: chat, caption: 'Diseño · pedido ' + d.id + ' · línea ' + f.li, photo: f.blob }, muteHttpExceptions: true });
  });
}

// Tu chat con el bot: se guarda solo la primera vez que le escribes "/start" al bot.
function chatTelegram() {
  const props = PropertiesService.getScriptProperties();
  let chat = props.getProperty('TELEGRAM_CHAT');
  if (chat) return chat;
  const r = telegram('getUpdates', {});
  const ultimo = (r.result || []).filter(u => u.message && u.message.chat).pop();
  if (!ultimo) return null;
  chat = String(ultimo.message.chat.id);
  props.setProperty('TELEGRAM_CHAT', chat);
  return chat;
}

function telegram(metodo, datos) {
  const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/' + metodo,
    { method: 'post', contentType: 'application/json', payload: JSON.stringify(datos), muteHttpExceptions: true });
  return JSON.parse(res.getContentText());
}

/** Ejecuta esta función para probar: te debe llegar un mensaje del bot a Telegram. */
function probarTelegram() {
  if (!TELEGRAM_TOKEN) throw new Error('Primero pega la clave de @BotFather en TELEGRAM_TOKEN y guarda.');
  const chat = chatTelegram();
  if (!chat) throw new Error('Abre tu bot en Telegram, toca "Iniciar" (o escribe /start) y vuelve a ejecutar.');
  const r = telegram('sendMessage', { chat_id: chat, text: '✅ ¡Listo! Aquí te llegarán los pedidos nuevos de XTO.STICKER.' });
  if (!r.ok) throw new Error('Telegram respondió: ' + r.description);
}

/** Si cambias de celular o de cuenta de Telegram: ejecuta esto y luego escribe /start al bot otra vez. */
function olvidarChatTelegram() {
  PropertiesService.getScriptProperties().deleteProperty('TELEGRAM_CHAT');
}

function hoja() {
  return SpreadsheetApp.getActive().getSheetByName(HOJA) || (setup(), SpreadsheetApp.getActive().getSheetByName(HOJA));
}

function carpeta() {
  const it = DriveApp.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA_FOTOS);
}

function buscar(sh, id) {
  const celda = sh.getRange('B:B').createTextFinder(id).matchEntireCell(true).findNext();
  return celda ? sh.getRange(celda.getRow(), 1, 1, COLUMNAS.length).getValues()[0] : null;
}

// Guarda el texto tal cual: evita que un nombre como "=algo" se lea como fórmula y mantiene el 0 del teléfono.
function texto(v) {
  v = String(v == null ? '' : v).slice(0, 5000);
  return /^[=+\-@0]/.test(v) ? "'" + v : v;
}

function html(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
