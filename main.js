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

  /* ---------- Año actual en el footer ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
