/* Fundación Unitrans — registro de pacientes en la web.
 *
 * - La edad se calcula con la fecha de nacimiento:
 *     · menos de 14 años: registro con madre, padre o representante (obligatorio);
 *     · 14 a 17 años: elige si quiere ir acompañada/o; los datos del representante
 *       se piden solo si responde que sí;
 *     · menores de 18: pregunta del Artículo 50 de la LOPNNA.
 * - Envía el registro al Apps Script de la Fundación, que lo guarda en Google Drive
 *   (hoja "Registros web Unitrans" y hoja de respuestas del Google Form).
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
    return cfg.enviarAlGoogleForm && Object.keys(cfg.campos).some(function (k) { return cfg.campos[k]; });
  };

  // Uno o varios Apps Script (p. ej. el nuevo y el viejo): el registro se envía a todos
  var urlsAppsScript = [].concat(cfg.appsScriptUrls || [], cfg.appsScriptUrl || []).filter(function (u, i, todas) {
    return u && todas.indexOf(u) === i;
  });

  var enviarAppsScript = function (url, d) {
    // text/plain evita la verificación previa (CORS); Apps Script responde {"ok": true} si guardó la fila.
    // Si la implementación no es pública, Google redirige al inicio de sesión y la petición falla.
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(d)
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || 'sin confirmación');
        return j;
      });
  };

  /* ---------- Pantalla final ---------- */
  var mostrarExito = function (yaRegistrado) {
    desbloquear();
    form.hidden = true;
    var acceso = $('acceso');
    if (acceso) acceso.hidden = true;
    if (yaRegistrado) {
      $('reg-exito-titulo').textContent = 'Ya presentas un registro en Unitrans';
      $('reg-exito-texto').textContent = 'Como ya presentas un registro en Unitrans, puedes ver los precios hormonales y los datos actualizados de los médicos siempre que quieras. No necesitas registrarte de nuevo.';
    }
    var ok = $('reg-exito');
    ok.hidden = false;
    ok.focus();
  };

  /* ---------- Acceso de quien ya se registró (web o Google Form) ---------- */
  var formAcceso = $('form-acceso');
  if (formAcceso) {
    var estadoAcceso = $('acc-estado');
    var botonAcceso = formAcceso.querySelector('button[type="submit"]');
    formAcceso.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!formAcceso.reportValidity()) return;
      botonAcceso.disabled = true;
      estadoAcceso.className = 'form-status';
      estadoAcceso.textContent = 'Buscando tu registro…';
      // Solo se envían el correo y 4 dígitos; la web nunca recibe datos de otras personas.
      // Se pregunta a todos los Apps Script: basta con que uno encuentre el registro.
      var consulta = { accion: 'verificar', correo: $('acc-correo').value.trim(), telefono4: $('acc-tel4').value.trim() };
      var errores = [];
      Promise.all(urlsAppsScript.map(function (url) {
        return enviarAppsScript(url, consulta).catch(function (err) { errores.push(err); return null; });
      }))
        .then(function (res) {
          if (res.some(function (j) { return j && j.registrado; })) return mostrarExito(true);
          // Si ninguno pudo responder, es un error de conexión y no un "no encontrado"
          if (errores.length === res.length) throw errores[0] || new Error('sin destino');
          botonAcceso.disabled = false;
          estadoAcceso.className = 'form-status is-error';
          estadoAcceso.textContent = 'No encontramos un registro con ese correo y esos 4 dígitos. Revisa los datos o completa el registro más abajo.';
        })
        .catch(function (err) {
          botonAcceso.disabled = false;
          estadoAcceso.className = 'form-status is-error';
          estadoAcceso.textContent = /intentos/.test(err.message)
            ? 'Hiciste muchos intentos. Espera una hora e inténtalo de nuevo, o escríbenos por Telegram.'
            : 'No pudimos revisar tu registro. Revisa tu conexión e inténtalo de nuevo.';
        });
    });
  }

  var enviarGoogleForm = function (d) {
    var datos = new URLSearchParams();
    Object.keys(cfg.campos).forEach(function (k) {
      var v = k === 'correoRecolectado' ? d.correo : d[k];
      if (cfg.campos[k] && v) datos.append(cfg.campos[k], v);
    });
    if (cfg.pageHistory) datos.append('pageHistory', cfg.pageHistory);
    // Google Forms no deja leer la respuesta desde otra web: sin error de red, se da por enviado
    return fetch(cfg.formAction, { method: 'POST', mode: 'no-cors', body: datos });
  };

  /* ---------- Envío ---------- */
  var estado = $('reg-estado-envio');
  var boton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var s = estadoActual();
    var nac = $('reg-nacimiento');
    nac.setCustomValidity(nac.value && s.edad === null ? 'Revisa la fecha de nacimiento.' : '');
    // El patrón acepta espacios y guiones; aquí se exige que haya al menos 10 dígitos de verdad
    ['reg-telefono', 'reg-rep-telefono'].forEach(function (id) {
      var tel = $(id);
      var digitos = tel.value.replace(/\D/g, '').length;
      tel.setCustomValidity(tel.value && digitos < 10 ? 'Escribe un número de teléfono completo, con código de área (por ejemplo 0412 1234567).' : '');
    });
    if (!form.reportValidity()) return;

    var d = recoger();
    var envios = urlsAppsScript.map(function (url) { return enviarAppsScript(url, d); });
    if (formConfigurado()) envios.push(enviarGoogleForm(d));

    boton.disabled = true;
    estado.className = 'form-status';
    estado.textContent = 'Enviando tu registro…';
    // Sin destino configurado no se puede guardar: se informa como error
    if (!envios.length) envios.push(Promise.reject(new Error('sin destino')));

    // Basta con que un destino confirme que guardó: si se pidiera reintentar, los que sí guardaron
    // quedarían con el registro duplicado. Los fallos se anotan en la consola para revisarlos.
    var confirmados = 0;
    Promise.all(envios.map(function (p, i) {
      return p.then(function (res) {
        confirmados++;
        return res;
      }, function (err) {
        if (window.console) console.warn('Destino ' + (i + 1) + ' no confirmó el registro:', err && err.message);
        return null;
      });
    }))
      .then(function (res) {
        if (!confirmados) throw new Error('ningún destino confirmó');
        return res;
      })
      .then(function (res) { mostrarExito(res.some(function (j) { return j && j.yaRegistrado; })); })
      .catch(function () {
        // No se confirmó el guardado en Drive: los datos siguen en el formulario para reintentar
        boton.disabled = false;
        estado.className = 'form-status is-error';
        estado.textContent = 'No pudimos guardar tu registro. Revisa tu conexión e inténtalo de nuevo en unos minutos.';
      });
  });

  if (registrado()) $('reg-ya-registrado').hidden = false;
})();
