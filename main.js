/* Fundación Unitrans — interacciones mínimas: menú móvil y acordeones FAQ */
(function () {
  'use strict';

  /* ---------- Menú hamburguesa ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');

  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Cerrar con Escape y devolver el foco al botón
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Cerrar al elegir un enlace
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    // Restablecer al pasar a escritorio
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  /* ---------- Acordeones FAQ ---------- */
  document.querySelectorAll('.faq__button').forEach(function (button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.addEventListener('click', function () {
      var expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  });

  /* ---------- Imágenes externas con respaldo ---------- */
  // remove: quita la imagen y deja ver lo que hay debajo (iniciales, nombre)
  // text:   cambia la imagen por su texto alternativo
  var fallback = function (img) {
    if (img.getAttribute('data-fallback') === 'text') {
      var span = document.createElement('span');
      span.className = 'partner__name';
      span.textContent = img.alt;
      img.replaceWith(span);
    } else {
      var strip = img.closest('.logo-strip');
      img.remove();
      if (strip && !strip.querySelector('img')) strip.remove();
    }
  };
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) fallback(img);
    else img.addEventListener('error', function () { fallback(img); });
  });

  /* ---------- Precios de hormonas (data/precios.json) ---------- */
  // El archivo lo actualiza cada día GitHub Actions (scripts/actualizar-precios.mjs).
  // Si no carga, se quedan visibles los precios de referencia escritos en el HTML.
  var celdas = document.querySelectorAll('[data-precio]');
  if (celdas.length && window.fetch) {
    var num = function (v) {
      return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
    };
    var fecha = function (iso) {
      return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Caracas' }).format(new Date(iso));
    };

    fetch('data/precios.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var tasa = data.tasa;
        var barra = document.querySelector('[data-tasa]');
        if (barra && tasa && tasa.usd) {
          barra.textContent = 'Tasa oficial BCV: Bs ' + num(tasa.usd) + ' por USD' +
            (tasa.eur ? ' · Bs ' + num(tasa.eur) + ' por EUR' : '') +
            (tasa.fecha_valor ? ' · fecha valor ' + fecha(tasa.fecha_valor) : ' · consultada el ' + fecha(tasa.verificado));
          barra.hidden = false;
        }

        celdas.forEach(function (td) {
          var partes = td.getAttribute('data-precio').split('/');
          var p = data.productos && data.productos[partes[0]] && data.productos[partes[0]][partes[1]];
          if (!p || !(p.usd > 0)) return;

          var usd = td.querySelector('.price-usd');
          usd.textContent = '$' + num(p.usd);

          var bs = td.querySelector('.price-bs');
          if (!bs) {
            bs = document.createElement('span');
            bs.className = 'price-bs';
            td.insertBefore(bs, td.querySelector('.price-unit'));
          }
          // "≈" cuando el monto es una conversión y no el precio publicado por la tienda
          if (p.bs > 0) {
            bs.textContent = (p.moneda_origen === 'VES' ? '' : '≈ ') + 'Bs ' + num(p.bs);
            if (p.moneda_origen === 'VES') usd.textContent = '≈ $' + num(p.usd);
          } else {
            bs.textContent = '';
          }

          if (p.estado === 'ok' && p.verificado) {
            td.title = 'Verificado en la web de la tienda el ' + fecha(p.verificado);
          } else if (p.estado === 'desactualizado' && p.verificado) {
            td.title = 'Último precio verificado el ' + fecha(p.verificado);
            td.classList.add('is-stale');
          } else {
            td.title = 'Precio de referencia de nuestros correos informativos';
          }
        });
      })
      .catch(function () { /* sin conexión o abierto como archivo local */ });
  }

  /* ---------- Año actual en el footer ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
