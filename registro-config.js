/*
 * Configuración del registro de pacientes de la web.
 *
 * A dónde van los registros (puede ser a uno o a los dos):
 *   A. appsScriptUrl → hoja de cálculo propia de la Fundación (recomendado: guarda TODOS los datos).
 *      Ver google-apps-script/Codigo.gs para instalarlo.
 *      El Apps Script también copia el registro en la hoja de respuestas del Google Form.
 *   B. Envío directo al Google Form (enviarAlGoogleForm): hoy Google lo rechaza; queda desactivado.
 * Si no hay ninguno configurado, al enviar se prepara un correo a la Fundación con los datos.
 *
 * Ver README → "Registro de pacientes".
 */
window.UNITRANS_REGISTRO = {
  // false = la web vuelve a funcionar como antes (botón al Google Form, costos visibles)
  activo: true,

  // A. URL de la aplicación web de Apps Script (termina en /exec)
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbyZVOWA5D4rfGwijl6y-Z5YRixWPfIo0BG_UbYimpd1l4gaugmvPrhbgszS1RwpXf7T1w/exec',

  // B. Google Form de historia clínica. Desactivado: el formulario rechaza los envíos externos (HTTP 400),
  // así que el Apps Script copia cada registro en su hoja de respuestas (HOJA_FORMULARIO en Codigo.gs).
  enviarAlGoogleForm: false,
  formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSdtpMTkAnMtqpmvA0tcirgAL3okOtXZBCxzfw0XreKmvx6rZQ/formResponse',
  pageHistory: '',            // si el formulario tiene secciones: '0,1,2'
  campos: {                   // entry.XXXX de cada pregunta; vacío = no se envía
    correoRecolectado: 'emailAddress',    // "Correo" que recopila Google al inicio del formulario
    correo: 'entry.1045781291',           // Correo electrónico
    nombre: 'entry.2005620554',           // Nombres (con el que se identifica)
    apellidos: 'entry.226430101',         // Apellidos
    sexoAsignado: 'entry.345884997',      // Sexo que asignado al nacer
    identidad: 'entry.1013692133',        // ¿Cuál es su identidad de género?
    edad: 'entry.1498399976',             // ¿Qué edad tiene?
    lopnna: 'entry.1446475875',           // De ser menor de edad, ¿está consciente del Artículo 50 de la LOPNNA?
    estado: 'entry.1065046570',           // ¿Estado donde vive?
    telefono: 'entry.1166974658',         // Número de teléfono
    expectativas: 'entry.1060290331',     // ¿Cuáles son sus expectativas de atención?
    intervenciones: 'entry.207893456',    // Intervenciones de su interés
    // Preguntas nuevas, solo si las agregas al formulario
    fechaNacimiento: '',
    acompanamiento: '',
    representanteNombre: '',
    representanteParentesco: '',
    representanteCedula: '',
    representanteTelefono: '',
    representanteCorreo: ''
  },

  // Correo que recibe los datos si no hay A ni B configurados
  correoRespaldo: 'fundaunitrans2020@gmail.com',

  // Opciones: idénticas a las del Google Form de historia clínica
  opciones: {
    sexoAsignado: ['Hembra', 'Varón', 'Intersex'],
    identidad: ['Mujer', 'Hombre', 'Mujer Trans (HaM)', 'Hombre Trans (MaH)', 'Genderqueer', 'No Binario'],
    estado: [
      'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
      'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
      'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
      'Yaracuy', 'Zulia', 'Fuera de Venezuela'
    ],
    expectativas: [
      'Sólo atención Psicológica',
      'Tratamiento de Reemplazo Hormonal (TRH)',
      'Transición quirúrgica',
      'Todas las anteriores'
    ],
    // Con estas expectativas se pregunta por las intervenciones quirúrgicas
    expectativasQuirurgicas: ['Transición quirúrgica', 'Todas las anteriores'],
    intervenciones: ['Facial', 'Corporal', 'Genital', 'Todas las anteriores'],
    parentesco: ['Madre', 'Padre', 'Representante legal', 'Otro familiar'],
    si: 'Sí',
    no: 'No',
    acompanamientoSi: 'Sí, con mi representante',
    acompanamientoNo: 'No, por mi cuenta'
  }
};
