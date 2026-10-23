/**
 * XTO.STICKER · Pedidos en Google Sheets
 *
 * Guarda cada pedido de la tienda en la hoja "Pedidos" y lo devuelve por su número
 * para el link corto "Ver pedido con imágenes".
 * Instrucciones: google-apps-script/LEEME.md
 */

const HOJA = 'Pedidos';
const SITIO = 'https://kengo2.github.io/Xto.Stickers/';
// Opcional: escribe tu correo para recibir un aviso por cada pedido nuevo (déjalo vacío para no recibir).
const CORREO_AVISO = '';

const COLUMNAS = ['Fecha', 'Pedido', 'Cliente', 'Teléfono', 'Correo', 'Total', 'Resumen', 'Estado', 'Ver pedido', 'Datos'];
const ESTADOS = ['Nuevo', 'En proceso', 'Listo', 'Entregado', 'Cancelado'];

/** Ejecuta esta función una vez: crea la hoja con sus columnas y la lista de estados. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);
  sh.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#f1e8f7');
  sh.setFrozenRows(1);
  const reglas = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
  sh.getRange(2, 8, sh.getMaxRows() - 1, 1).setDataValidation(reglas);
  sh.setColumnWidth(7, 360);
  sh.hideColumns(10);   // "Datos" es para la página, no hace falta verla
}

/** La tienda envía aquí cada pedido nuevo. */
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (!/^XTO-[A-Z0-9-]{6,30}$/.test(d.id || '')) return respuesta({ ok: false, error: 'numero' });
    if (typeof d.p !== 'string' || d.p.length > 45000) return respuesta({ ok: false, error: 'datos' });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sh = hoja();
      if (!buscar(sh, d.id)) {
        sh.appendRow([new Date(), d.id, texto(d.n), texto(d.t), texto(d.e), texto(d.total), texto(d.r), 'Nuevo', SITIO + '#' + d.id, d.p]);
        if (CORREO_AVISO) MailApp.sendEmail(CORREO_AVISO, 'Nuevo pedido ' + d.id, (d.n || '') + '\n' + (d.r || '') + '\n\n' + SITIO + '#' + d.id);
      }
    } finally {
      lock.releaseLock();
    }
    return respuesta({ ok: true });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  }
}

/** La página pide aquí un pedido por su número para mostrarlo con imágenes. */
function doGet(e) {
  const id = (e.parameter.id || '').trim();
  if (!/^XTO-[A-Z0-9-]{6,30}$/.test(id)) return respuesta({ ok: false, error: 'numero' });
  const fila = buscar(hoja(), id);
  return respuesta(fila ? { ok: true, p: fila[9] } : { ok: false, error: 'no existe' });
}

function hoja() {
  return SpreadsheetApp.getActive().getSheetByName(HOJA) || (setup(), SpreadsheetApp.getActive().getSheetByName(HOJA));
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

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
