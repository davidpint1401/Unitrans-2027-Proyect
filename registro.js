/* Fundación Unitrans — registro de pacientes en la web.
 *
 * - La edad se calcula con la fecha de nacimiento:
 *     · menos de 14 años: registro con madre, padre o representante (obligatorio);
 *     · 14 a 17 años: elige si quiere ir acompañada/o; los datos del representante
 *       se piden solo si responde que sí;
 *     · menores de 18: pregunta del Artículo 50 de la LOPNNA.
 * - Envía el registro a la hoja propia (Apps Script) y/o al Google Form (registro-config.js).
 *   Si ninguno está configurado, prepara un correo a la Fundación con los datos.
 * - Mientras la persona no se registra, oculta costos y contactos ([data-privado]).
 *   En el navegador solo se guarda que ya se registró y la fecha; ningún dato personal.
 */
(function () {
  'use strict';

  var cfg = window.UNITRANS_REGISTRO;
  if (!cfg || !cfg.activo) return;

  var CLAVE = 'unitrans-registro';
  var registrado = function () {
    try { return !!localStorage.getItem(CLAVE); } catch (e) { return false; }
  };
  var desbloquear = function () {
    try { localStorage.setItem(CLAVE, JSON.stringify({ v: 1, fecha: new Date().toISOString() })); } catch (e) { /* modo privado */ }
    document.documentElement.classList.remove('reg-locked');
  };

  /* ---------- Enlaces a la historia clínica → registro de la web ---------- */
  document.querySelectorAll('[data-hc-link]').forEach(function (a) {
    a.href = a.getAttribute('data-hc-link');
    a.removeAttribute('target');
    // Ya no abre otra pestaña: se quitan el ícono externo y el aviso para lectores de pantalla
    a.querySelectorAll('.visually-hidden, svg').forEach(function (el) { el.remove(); });
  });
  document.querySelectorAll('[data-registro-visible]').forEach(function (el) { el.hidden = false; });
  document.querySelectorAll('[data-registro-oculto]').forEach(function (el) { el.hidden = true; });

  var form = document.getElementById('form-registro');
  if (!form) return;

  var $ = function (id) { return document.getElementById(id); };
  var op = cfg.opciones;

  /* ---------- Opciones desde la configuración ---------- */
  var llenarSelect = function (id, lista) {
    var sel = $(id);
    lista.forEach(function (t) { sel.add(new Option(t, t)); });
  };
  llenarSelect('reg-sexo', op.sexoAsignado);
  llenarSelect('reg-identidad', op.identidad);
  llenarSelect('reg-estado', op.estado);
  llenarSelect('reg-rep-parentesco', op.parentesco);

  var llenarRadios = function (id, nombre, lista) {
    var caja = $(id);
    lista.forEach(function (t, i) {
      var label = document.createElement('label');
      label.className = 'check';
      label.innerHTML = '<input type="radio" required><span></span>';
      var input = label.querySelector('input');
      input.name = nombre;
      input.value = t;
      input.id = id + '-' + i;
      label.querySelector('span').textContent = t;
      caja.appendChild(label);
    });
  };
  llenarRadios('reg-expectativas', 'expectativas', op.expectativas);
  llenarRadios('reg-intervenciones', 'intervenciones', op.intervenciones);

  // La fecha de nacimiento no puede ser futura
  var hoy = new Date();
  var dos = function (n) { return (n < 10 ? '0' : '') + n; };
  $('reg-nacimiento').max = hoy.getFullYear() + '-' + dos(hoy.getMonth() + 1) + '-' + dos(hoy.getDate());

  /* ---------- Edad y bloques condicionales ---------- */
  var edad = function () {
    var v = $('reg-nacimiento').value;
    if (!v) return null;
    var p = v.split('-').map(Number);
    var e = hoy.getFullYear() - p[0];
    if (hoy.getMonth() + 1 < p[1] || (hoy.getMonth() + 1 === p[1] && hoy.getDate() < p[2])) e--;
    return e >= 0 && e < 120 ? e : null;
  };
  var marcado = function (nombre) {
    var r = form.querySelector('input[name="' + nombre + '"]:checked');
    return r ? r.value : '';
  };
  var mostrar = function (el, si) {
    el.hidden = !si;
    // Lo oculto no se valida ni se envía
    el.querySelectorAll('input, select, textarea').forEach(function (c) { c.disabled = !si; });
  };

  var estadoActual = function () {
    var e = edad();
    var menor14 = e !== null && e < 14;
    var adolescente = e !== null && e >= 14 && e < 18;
    var conRep = menor14 || (adolescente && marcado('acompanamiento') === 'si');
    return { edad: e, menor14: menor14, adolescente: adolescente, menor: menor14 || adolescente, conRep: conRep };
  };

  var actualizar = function () {
    var s = estadoActual();
    var txt = $('reg-edad-texto');
    txt.textContent = s.edad === null ? '' : 'Tienes ' + s.edad + (s.edad === 1 ? ' año.' : ' años.');

    mostrar($('reg-aviso-menor14'), s.menor14);
    mostrar($('reg-bloque-adolescente'), s.adolescente);
    mostrar($('reg-bloque-representante'), s.conRep);
    mostrar($('reg-bloque-lopnna'), s.menor);
    $('reg-correo-ayuda').hidden = !s.menor14;

    mostrar($('reg-bloque-intervenciones'), op.expectativasQuirurgicas.indexOf(marcado('expectativas')) > -1);
  };
  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  actualizar();

  /* ---------- Datos del registro ---------- */
  var valor = function (id) { var el = $(id); return el && !el.disabled ? el.value.trim() : ''; };

  var recoger = function () {
    var s = estadoActual();
    var d = {
      correo: valor('reg-correo'),
      nombre: valor('reg-nombre'),
      apellidos: valor('reg-apellidos'),
      fechaNacimiento: valor('reg-nacimiento'),
      edad: s.edad === null ? '' : String(s.edad),
      sexoAsignado: valor('reg-sexo'),
      identidad: valor('reg-identidad'),
      estado: valor('reg-estado'),
      telefono: valor('reg-telefono'),
      expectativas: marcado('expectativas'),
      intervenciones: $('reg-bloque-intervenciones').hidden ? '' : marcado('intervenciones'),
      lopnna: s.menor ? (marcado('lopnna') === 'si' ? op.si : op.no) : '',
      acompanamiento: s.menor14 ? op.acompanamientoSi
        : s.adolescente ? (s.conRep ? op.acompanamientoSi : op.acompanamientoNo) : '',
      consentimiento: 'Acepto',
      sitioWeb: valor('reg-sitio-web')
    };
    if (s.conRep) {
      d.representanteNombre = valor('reg-rep-nombre');
      d.representanteParentesco = valor('reg-rep-parentesco');
      d.representanteCedula = valor('reg-rep-cedula');
      d.representanteTelefono = valor('reg-rep-telefono');
      d.representanteCorreo = valor('reg-rep-correo');
      d.representanteAutoriza = 'Sí';
    }
    return d;
  };

  /* ---------- Destinos ---------- */
  var formConfigurado = function () {
    return Object.keys(cfg.campos).some(function (k) { return cfg.campos[k]; });
  };

  var enviarAppsScript = function (d) {
    // text/plain evita la verificación previa (CORS) de Google; no-cors porque Apps Script redirige
    return fetch(cfg.appsScriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(d)
    });
  };

  var enviarGoogleForm = function (d) {
    var datos = new URLSearchParams();
    Object.keys(cfg.campos).forEach(function (k) {
      if (cfg.campos[k] && d[k]) datos.append(cfg.campos[k], d[k]);
    });
    if (cfg.pageHistory) datos.append('pageHistory', cfg.pageHistory);
    // Google Forms no deja leer la respuesta desde otra web: sin error de red, se da por enviado
    return fetch(cfg.formAction, { method: 'POST', mode: 'no-cors', body: datos });
  };

  var TITULOS = {
    nombre: 'Nombre', apellidos: 'Apellidos', fechaNacimiento: 'Fecha de nacimiento', edad: 'Edad',
    sexoAsignado: 'Sexo asignado al nacer', identidad: 'Identidad de género', estado: 'Estado',
    telefono: 'Teléfono', correo: 'Correo', expectativas: 'Expectativas de atención',
    intervenciones: 'Intervenciones de interés', lopnna: 'Conoce el Art. 50 LOPNNA',
    acompanamiento: 'Acompañamiento', representanteNombre: 'Representante',
    representanteParentesco: 'Parentesco', representanteCedula: 'Cédula del representante',
    representanteTelefono: 'Teléfono del representante', representanteCorreo: 'Correo del representante',
    representanteAutoriza: 'Representante autoriza', consentimiento: 'Consentimiento'
  };
  var abrirCorreo = function (d) {
    var cuerpo = 'Hola, quiero registrarme en la Fundación Unitrans.\n\n' +
      Object.keys(TITULOS).filter(function (k) { return d[k]; })
        .map(function (k) { return TITULOS[k] + ': ' + d[k]; }).join('\n');
    window.location.href = 'mailto:' + cfg.correoRespaldo +
      '?subject=' + encodeURIComponent('Registro web: ' + d.nombre + ' ' + d.apellidos) +
      '&body=' + encodeURIComponent(cuerpo);
  };

  /* ---------- Envío ---------- */
  var estado = $('reg-estado-envio');
  var boton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var s = estadoActual();
    var nac = $('reg-nacimiento');
    nac.setCustomValidity(nac.value && s.edad === null ? 'Revisa la fecha de nacimiento.' : '');
    if (!form.reportValidity()) return;

    var d = recoger();
    var envios = [];
    if (cfg.appsScriptUrl) envios.push(enviarAppsScript(d));
    if (formConfigurado()) envios.push(enviarGoogleForm(d));

    var listo = function (porCorreo) {
      desbloquear();
      form.hidden = true;
      $('reg-exito-correo').hidden = !porCorreo;
      var ok = $('reg-exito');
      ok.hidden = false;
      ok.focus();
    };

    if (!envios.length) {
      abrirCorreo(d);
      listo(true);
      return;
    }

    boton.disabled = true;
    estado.className = 'form-status';
    estado.textContent = 'Enviando tu registro…';
    Promise.all(envios)
      .then(function () { listo(false); })
      .catch(function () {
        boton.disabled = false;
        estado.className = 'form-status is-error';
        estado.textContent = 'No pudimos enviar tu registro. Revisa tu conexión e inténtalo de nuevo, o escríbenos por Telegram.';
      });
  });

  if (registrado()) $('reg-ya-registrado').hidden = false;
})();
