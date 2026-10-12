/**
 * Fundación Unitrans — receptor de registros de la web.
 *
 * Guarda cada registro de la web en una hoja de cálculo de Google de la Fundación.
 *
 * Instalación (una sola vez, con la cuenta de la Fundación):
 *  1. Crea una hoja de cálculo nueva en Google Drive (p. ej. "Registros web Unitrans").
 *  2. Menú Extensiones → Apps Script. Borra lo que haya y pega este archivo completo. Guarda.
 *  3. Botón "Implementar" → "Nueva implementación" → tipo "Aplicación web".
 *       - Ejecutar como: Yo (la cuenta de la Fundación)
 *       - Quién tiene acceso: Cualquier usuario
 *     Autoriza los permisos que pida Google.
 *  4. Copia la "URL de la aplicación web" (termina en /exec) y pégala en
 *     registro-config.js → appsScriptUrl.
 *
 * Si cambias este código, usa "Implementar" → "Gestionar implementaciones" → editar → "Nueva versión"
 * para que la URL siga siendo la misma.
 */

// Nombre de la pestaña donde se guardan los registros (se crea sola)
const HOJA = 'Registros web';

// Correo que recibe un aviso por cada registro nuevo (sin datos de salud). Vacío = sin aviso.
const CORREO_AVISO = 'fundaunitrans2020@gmail.com';

// Columnas en orden: [clave que envía la web, título de la columna]
const COLUMNAS = [
  ['fechaRegistro', 'Fecha de registro'],
  ['correo', 'Correo electrónico'],
  ['nombre', 'Nombres (con el que se identifica)'],
  ['apellidos', 'Apellidos'],
  ['fechaNacimiento', 'Fecha de nacimiento'],
  ['edad', 'Edad'],
  ['sexoAsignado', 'Sexo asignado al nacer'],
  ['identidad', 'Identidad de género'],
  ['estado', 'Estado donde vive'],
  ['telefono', 'Número de teléfono'],
  ['expectativas', 'Expectativas de atención'],
  ['intervenciones', 'Intervenciones de interés'],
  ['lopnna', 'Conoce el Art. 50 LOPNNA (menores)'],
  ['acompanamiento', 'Acompañamiento de representante'],
  ['representanteNombre', 'Representante: nombre y apellido'],
  ['representanteParentesco', 'Representante: parentesco'],
  ['representanteCedula', 'Representante: cédula'],
  ['representanteTelefono', 'Representante: teléfono'],
  ['representanteCorreo', 'Representante: correo'],
  ['representanteAutoriza', 'Representante autoriza'],
  ['consentimiento', 'Consentimiento de datos'],
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Campo trampa para bots: las personas no lo ven ni lo llenan
    if (datos.sitioWeb) return respuesta({ ok: true });
    if (!datos.nombre || !datos.correo) return respuesta({ ok: false, error: 'faltan datos' });

    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
    if (hoja.getLastRow() === 0) {
      hoja.appendRow(COLUMNAS.map(function (c) { return c[1]; }));
      hoja.setFrozenRows(1);
      hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
    }

    hoja.appendRow(COLUMNAS.map(function (c) {
      return c[0] === 'fechaRegistro' ? new Date() : limpiar(datos[c[0]]);
    }));

    if (CORREO_AVISO) {
      MailApp.sendEmail({
        to: CORREO_AVISO,
        subject: 'Nuevo registro en la web: ' + limpiar(datos.nombre),
        body: 'Hay un registro nuevo en la web de la Fundación Unitrans.\n\n' +
          'Revísalo en la hoja "' + HOJA + '":\n' + libro.getUrl(),
      });
    }
    return respuesta({ ok: true });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Texto plano, máximo 500 caracteres, y sin fórmulas (evita que una respuesta como "=..." se ejecute en la hoja)
function limpiar(valor) {
  if (valor === undefined || valor === null) return '';
  let texto = Array.isArray(valor) ? valor.join(', ') : String(valor);
  texto = texto.slice(0, 500).trim();
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
