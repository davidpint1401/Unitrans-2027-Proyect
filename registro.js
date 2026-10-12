/* Fundación Unitrans — registro de pacientes en la web.
 *
 * - Envía las respuestas al Google Form de historia clínica (registro-config.js).
 * - Mientras la persona no se registra, oculta costos y contactos ([data-privado])
 *   y muestra en su lugar una invitación a registrarse ([data-candado]).
 * - En el navegador solo se guarda que la persona ya se registró y la fecha; ningún dato personal.
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

  /* ---------- Opciones desde la configuración ---------- */
  var op = cfg.opciones;
  var llenarSelect = function (id, lista, otro) {
    var sel = document.getElementById(id);
    lista.forEach(function (t) { sel.add(new Option(t, t)); });
    if (otro) sel.add(new Option('Otra (escríbela)', '__otra__'));
  };
  llenarSelect('reg-sexo', op.sexoAsignado);
  llenarSelect('reg-identidad', op.identidad, op.identidadTieneOtro);
  llenarSelect('reg-estado', op.estado);
  llenarSelect('reg-rep-parentesco', op.parentesco);

  var cajaExp = document.getElementById('reg-expectativas');
  op.expectativas.forEach(function (t, i) {
    var label = document.createElement('label');
    label.className = 'check';
    label.innerHTML = '<input type="checkbox" name="expectativas"><span></span>';
    label.querySelector('input').value = t;
    label.querySelector('input').id = 'reg-exp-' + i;
    label.querySelector('span').textContent = t;
    cajaExp.appendChild(label);
  });

  /* ---------- Lógica según la edad ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var mostrar = function (el, si) {
    el.hidden = !si;
    // Los campos ocultos no se validan ni se envían
    el.querySelectorAll('input, select, textarea').forEach(function (c) {
      c.disabled = !si;
    });
  };

  var grupoEdad = function () {
    var e = parseInt($('reg-edad').value, 10);
    if (!(e > 0)) return null;
    return e < 14 ? 'menor14' : e < 18 ? 'adolescente' : 'adulto';
  };

  var actualizar = function () {
    var g = grupoEdad();
    var acomp = form.querySelector('input[name="acompanamiento"]:checked');
    var conRep = g === 'menor14' || (g === 'adolescente' && acomp && acomp.value === 'si');

    mostrar($('reg-aviso-menor14'), g === 'menor14');
    mostrar($('reg-bloque-adolescente'), g === 'adolescente');
    mostrar($('reg-bloque-lopnna'), g === 'adolescente' && acomp && acomp.value === 'no');
    mostrar($('reg-bloque-representante'), !!conRep);
    $('reg-correo-ayuda').hidden = g !== 'menor14';

    var otra = $('reg-identidad').value === '__otra__';
    mostrar($('reg-bloque-identidad-otra'), otra);

    var quir = Array.prototype.some.call(form.querySelectorAll('input[name="expectativas"]:checked'), function (c) {
      return c.value === op.expectativaQuirurgica;
    });
    mostrar($('reg-bloque-intervenciones'), quir);
  };
  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  actualizar();

  /* ---------- Envío ---------- */
  var estado = $('reg-estado-envio');
  var boton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();

    // Al menos una expectativa de atención
    var exps = form.querySelectorAll('input[name="expectativas"]:checked');
    var primera = form.querySelector('input[name="expectativas"]');
    primera.setCustomValidity(exps.length ? '' : 'Elige al menos una opción.');
    if (!form.reportValidity()) return;

    var c = cfg.campos;
    var datos = new URLSearchParams();
    var poner = function (campo, valor) {
      if (c[campo] && valor != null && valor !== '') datos.append(c[campo], valor);
    };
    var val = function (id) { var el = $(id); return el && !el.disabled ? el.value.trim() : ''; };

    var g = grupoEdad();
    var acomp = form.querySelector('input[name="acompanamiento"]:checked');
    var conRep = g === 'menor14' || (g === 'adolescente' && acomp && acomp.value === 'si');

    poner('correoRecolectado', val('reg-correo'));
    poner('correo', val('reg-correo'));
    poner('nombre', val('reg-nombre'));
    poner('apellidos', val('reg-apellidos'));
    poner('sexoAsignado', val('reg-sexo'));
    if (val('reg-identidad') === '__otra__') {
      if (c.identidad) {
        datos.append(c.identidad, '__other_option__');
        datos.append(c.identidad + '.other_option_response', val('reg-identidad-otra'));
      }
    } else {
      poner('identidad', val('reg-identidad'));
    }
    poner('estado', val('reg-estado'));
    poner('telefono', val('reg-telefono'));
    exps.forEach(function (x) { poner('expectativas', x.value); });
    poner('intervenciones', val('reg-intervenciones'));
    poner('edad', val('reg-edad'));

    if (g === 'menor14') poner('acompanamiento', op.acompanamientoSi);
    if (g === 'adolescente') poner('acompanamiento', acomp.value === 'si' ? op.acompanamientoSi : op.acompanamientoNo);
    if (g === 'adolescente' && acomp.value === 'no') poner('lopnna', op.lopnnaSi);
    if (conRep) {
      poner('representanteNombre', val('reg-rep-nombre'));
      poner('representanteParentesco', val('reg-rep-parentesco'));
      poner('representanteCedula', val('reg-rep-cedula'));
      poner('representanteTelefono', val('reg-rep-telefono'));
      poner('representanteCorreo', val('reg-rep-correo'));
    }
    poner('consentimiento', op.consentimientoSi);
    if (cfg.pageHistory) datos.append('pageHistory', cfg.pageHistory);

    boton.disabled = true;
    estado.className = 'form-status';
    estado.textContent = 'Enviando tu registro…';

    // Google Forms no permite leer la respuesta desde otra web (no-cors): si la petición
    // sale sin error de red, el registro se considera enviado.
    fetch(cfg.formAction, { method: 'POST', mode: 'no-cors', body: datos })
      .then(function () {
        desbloquear();
        form.hidden = true;
        var ok = $('reg-exito');
        ok.hidden = false;
        ok.focus();
      })
      .catch(function () {
        boton.disabled = false;
        estado.className = 'form-status is-error';
        estado.textContent = 'No pudimos enviar tu registro. Revisa tu conexión e inténtalo de nuevo, o escríbenos por Telegram.';
      });
  });

  // Si ya se registró antes, se lo decimos
  if (registrado()) $('reg-ya-registrado').hidden = false;
})();
