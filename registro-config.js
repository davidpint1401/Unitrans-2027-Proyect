/*
 * Configuración del registro de la web → Google Form de historia clínica.
 *
 * Mientras `activo` sea false, la web funciona como siempre: botón al Google Form
 * y costos/contactos visibles. Para activarlo:
 *   1. En el Google Form: ⋮ → "Obtener enlace rellenado previamente", llena todo y copia el enlace.
 *      Cada pregunta aparece como entry.123456789: ese número va en `campos`.
 *   2. Los textos de `opciones` deben ser IDÉNTICOS a las opciones del formulario.
 *   3. Cambia `activo` a true.
 * Ver README → "Registro de pacientes".
 */
window.UNITRANS_REGISTRO = {
  activo: false,

  // Mismo ID del formulario, terminando en /formResponse
  formAction: 'https://docs.google.com/forms/d/e/1FAIpQLSdtpMTkAnMtqpmvA0tcirgAL3okOtXZBCxzfw0XreKmvx6rZQ/formResponse',

  // Si el formulario tiene secciones (páginas), pon aquí sus números: '0,1,2'. Si no, déjalo vacío.
  pageHistory: '',

  // Código entry.XXXX de cada pregunta. Vacío = esa respuesta no se envía.
  campos: {
    // Preguntas que ya existen en el formulario
    correoRecolectado: 'emailAddress',   // "Dirección de correo electrónico" (la que recopila Google)
    nombre: '',                          // Nombres (con el que se identifica)
    apellidos: '',                       // Apellidos
    sexoAsignado: '',                    // Sexo asignado al nacer
    identidad: '',                       // ¿Cuál es su identidad de género?
    correo: '',                          // Correo electrónico
    estado: '',                          // ¿Estado donde vive?
    telefono: '',                        // Número de teléfono
    expectativas: '',                    // ¿Cuáles son sus expectativas de atención?
    intervenciones: '',                  // Intervenciones de su interés (transición quirúrgica)
    edad: '',                            // ¿Qué edad tiene?
    lopnna: '',                          // ¿Conoce el Artículo 50 de la LOPNNA? (menores de edad)

    // Preguntas NUEVAS que conviene agregar al formulario (ver README)
    acompanamiento: '',                  // ¿Se registra con acompañamiento de su representante?
    representanteNombre: '',             // Nombre y apellido del representante
    representanteParentesco: '',         // Parentesco
    representanteCedula: '',             // Cédula del representante
    representanteTelefono: '',           // Teléfono del representante
    representanteCorreo: '',             // Correo del representante
    consentimiento: ''                   // Consentimiento para el uso de los datos
  },

  // Opciones de las preguntas de selección (deben coincidir letra por letra con el formulario)
  opciones: {
    sexoAsignado: ['Femenino', 'Masculino', 'Intersexual', 'Prefiero no decirlo'],
    identidad: ['Mujer trans', 'Hombre trans', 'Persona no binaria', 'Género fluido', 'Prefiero no decirlo'],
    // true si la pregunta de identidad tiene la opción "Otro" de Google Forms
    identidadTieneOtro: true,
    estado: [
      'Amazonas', 'Anzoátegui', 'Apure', 'Aragua', 'Barinas', 'Bolívar', 'Carabobo', 'Cojedes',
      'Delta Amacuro', 'Distrito Capital', 'Falcón', 'Guárico', 'La Guaira', 'Lara', 'Mérida',
      'Miranda', 'Monagas', 'Nueva Esparta', 'Portuguesa', 'Sucre', 'Táchira', 'Trujillo',
      'Yaracuy', 'Zulia', 'Fuera de Venezuela'
    ],
    expectativas: [
      'Asesoría y acompañamiento',
      'Acompañamiento psicológico',
      'Terapia hormonal',
      'Ginecología',
      'Transición quirúrgica',
      'Fisioterapia y rehabilitación',
      'Información y orientación'
    ],
    // Cuál de las expectativas activa la pregunta de intervenciones
    expectativaQuirurgica: 'Transición quirúrgica',
    parentesco: ['Madre', 'Padre', 'Representante legal', 'Otro familiar'],
    lopnnaSi: 'Sí',
    acompanamientoSi: 'Sí, con mi representante',
    acompanamientoNo: 'No, por mi cuenta (14 años o más)',
    consentimientoSi: 'Acepto'
  }
};
