/**
 * Fundación Unitrans — receptor de registros de la web.
 *
 * Guarda cada registro de la web en:
 *   1. esta hoja de cálculo (pestaña "Registros web", con todos los datos), y
 *   2. la hoja de respuestas del Google Form de historia clínica (HOJA_FORMULARIO),
 *      en las columnas que ya tiene, reconocidas por su título.
 *
 * Un registro por persona: antes de guardar busca el correo + los últimos 4 dígitos del
 * teléfono en las dos hojas. Si ya existe, no duplica y responde { ok, yaRegistrado: true }.
 * También atiende { accion: 'verificar', correo, telefono4 } para que quien ya se registró
 * (en la web o en el Google Form) vea precios y especialistas sin registrarse de nuevo.
 * La web nunca recibe la lista de correos: solo un sí o un no.
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

// Hoja de respuestas del Google Form de historia clínica ("Formularios de Atención UNITRANS2020 (respuestas)").
// Vacío = solo se guarda en esta hoja.
const HOJA_FORMULARIO = '1D2wzkuRvVbkkCw9Oyb7oaJ92Kq66vQkLrZvcAGy7bwU';

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
  ['posibleDuplicado', 'Posible duplicado (mismo correo, otro teléfono)'],
];

// Máximo de verificaciones por correo y por hora (evita que alguien pruebe correos ajenos al azar)
const MAX_INTENTOS_POR_HORA = 8;

// Datos que se guardan como texto para que la hoja no los convierta en número
// (si no, "0412 1234567" pierde el 0 inicial y "0000000000" queda como 0)
const COMO_TEXTO = ['telefono', 'representanteTelefono', 'representanteCedula'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Campo trampa para bots: las personas no lo ven ni lo llenan
    if (datos.sitioWeb) return respuesta({ ok: true });

    // Acceso de quien ya tiene registro: correo + últimos 4 dígitos del teléfono
    if (datos.accion === 'verificar') {
      if (!limiteDeIntentos(datos.correo)) return respuesta({ ok: false, error: 'demasiados intentos' });
      const tel4 = String(datos.telefono4 || '').replace(/\D/g, '').slice(-4);
      return respuesta({ ok: true, registrado: buscarRegistro(datos.correo, tel4).completo });
    }

    if (!datos.nombre || !datos.correo) return respuesta({ ok: false, error: 'faltan datos' });

    // Un registro por persona
    const previo = buscarRegistro(datos.correo, ultimos4(datos.telefono));
    if (previo.completo) return respuesta({ ok: true, yaRegistrado: true });
    datos.posibleDuplicado = previo.correo ? 'Sí' : '';

    const libro = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = libro.getSheetByName(HOJA) || libro.insertSheet(HOJA);
    // Títulos siempre al día (por si se agregan columnas nuevas)
    hoja.getRange(1, 1, 1, COLUMNAS.length)
      .setValues([COLUMNAS.map(function (c) { return c[1]; })])
      .setFontWeight('bold');
    hoja.setFrozenRows(1);

    hoja.appendRow(COLUMNAS.map(function (c) {
      return c[0] === 'fechaRegistro' ? new Date() : limpiar(datos[c[0]], COMO_TEXTO.indexOf(c[0]) > -1);
    }));

    // Copia en la hoja de respuestas del formulario de historia clínica
    let copiaFormulario = 'sin configurar';
    if (HOJA_FORMULARIO) {
      try {
        copiaFormulario = guardarEnHojaDelFormulario(datos);
      } catch (err) {
        copiaFormulario = 'error: ' + err;
      }
    }

    // El aviso es opcional: si falla (p. ej. por el límite diario de correos de Google), el registro
    // ya está guardado y se responde ok. Si no, la persona reintentaría y quedaría duplicado.
    if (CORREO_AVISO) {
      try {
        MailApp.sendEmail({
          to: CORREO_AVISO,
          subject: 'Nuevo registro en la web: ' + limpiar(datos.nombre),
          body: 'Hay un registro nuevo en la web de la Fundación Unitrans.\n\n' +
            'Revísalo en la hoja "' + HOJA + '":\n' + libro.getUrl(),
        });
      } catch (err) {
        console.warn('No se pudo enviar el aviso por correo: ' + err);
      }
    }
    return respuesta({ ok: true, hojaFormulario: copiaFormulario });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Columnas de la hoja del formulario → dato de la web. Se reconocen por el título (sin tildes ni mayúsculas);
// la primera regla que coincide gana. Las columnas que no coinciden quedan vacías.
const REGLAS_FORMULARIO = [
  [/marca temporal|timestamp/, 'fechaRegistro'],
  [/direccion de correo/, 'correo'],
  [/correo/, 'correo'],
  [/apellido/, 'apellidos'],
  [/nombre/, 'nombre'],
  [/sexo/, 'sexoAsignado'],
  [/identidad/, 'identidad'],
  [/lopnna/, 'lopnna'],
  [/fecha de nacimiento/, 'fechaNacimiento'],
  [/edad/, 'edad'],
  [/estado/, 'estado'],
  [/telefono/, 'telefono'],
  [/expectativa/, 'expectativas'],
  [/intervenci/, 'intervenciones'],
];

function normalizar(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function guardarEnHojaDelFormulario(datos) {
  const libro = SpreadsheetApp.openById(HOJA_FORMULARIO);
  // La pestaña de respuestas es la que tiene "Marca temporal" y "Apellidos" en la primera fila
  const hoja = libro.getSheets().find(function (h) {
    if (h.getLastColumn() === 0) return false;
    const titulos = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(normalizar).join('|');
    return /marca temporal|timestamp/.test(titulos) && /apellido/.test(titulos);
  });
  if (!hoja) return 'no se encontró la pestaña de respuestas';

  const titulos = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const fila = titulos.map(function (titulo) {
    const t = normalizar(titulo);
    const regla = REGLAS_FORMULARIO.find(function (r) { return r[0].test(t); });
    if (!regla) return '';
    return regla[1] === 'fechaRegistro' ? new Date() : limpiar(datos[regla[1]], COMO_TEXTO.indexOf(regla[1]) > -1);
  });
  hoja.appendRow(fila);
  return 'ok';
}

// Texto plano, máximo 500 caracteres, y sin fórmulas (evita que una respuesta como "=..." se ejecute en la hoja).
// comoTexto: el apóstrofo inicial hace que la hoja lo guarde tal cual (no se ve en la celda).
function limpiar(valor, comoTexto) {
  if (valor === undefined || valor === null) return '';
  let texto = Array.isArray(valor) ? valor.join(', ') : String(valor);
  texto = texto.slice(0, 500).trim();

  // Si comienza con un operador de fórmula, se escapa para que la hoja no lo ejecute.
  if (/^[=+\-@]/.test(texto)) texto = "'" + texto;

  if (comoTexto && texto) return "'" + texto;
  return texto;
}
  if (valor === undefined || valor === null) return '';
  let texto = Array.isArray(valor) ? valor.join(', ') : String(valor);
  texto = texto.slice(0, 500).trim();
  return texto && (comoTexto || /^[=+\-@]/.test(texto)) ? "'" + texto : texto;
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
