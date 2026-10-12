/*
 * Configuración del registro de pacientes de la web.
 *
 * A dónde van los registros (puede ser a uno o a los dos):
 *   A. appsScriptUrl → hoja de cálculo propia de la Fundación (recomendado: guarda TODOS los datos).
 *      Ver google-apps-script/Codigo.gs para instalarlo.
 *   B. Google Form de historia clínica → completa los códigos entry.XXXX en `campos`
 *      (en el formulario: ⋮ → "Obtener enlace rellenado previamente").
 * Si no hay ninguno configurado, al enviar se prepara un correo a la Fundación con los datos.
 *
 * Ver README → "Registro de pacientes".
 */
window.UNITRANS_REGISTRO = {
  // false = la web vuelve a funcionar como antes (botón al Google Form, costos visibles)
  activo: true,

  // A. URL de la aplicación web de Apps Script (termina en /exec)
  appsScriptUrl: '',

  // B. Google Form de historia clínica
  formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSdtpMTkAnMtqpmvA0tcirgAL3okOtXZBCxzfw0XreKmvx6rZQ/formResponse',
  pageHistory: '',            // si el formulario tiene secciones: '0,1,2'
  campos: {                   // entry.XXXX de cada pregunta; vacío = no se envía
    correo: '',               // "Correo" (si es la que recopila Google, usa 'emailAddress')
    nombre: '',               // Nombres (con el que se identifica)
    apellidos: '',            // Apellidos
    sexoAsignado: '',         // Sexo que asignado al nacer
    identidad: '',            // ¿Cuál es su identidad de género?
    edad: '',                 // ¿Qué edad tiene?
    lopnna: '',               // De ser menor de edad, ¿está consciente del Artículo 50 de la LOPNNA?
    estado: '',               // ¿Estado donde vive?
    telefono: '',             // Número de teléfono
    expectativas: '',         // ¿Cuáles son sus expectativas de atención?
    intervenciones: '',       // Intervenciones de su interés
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
