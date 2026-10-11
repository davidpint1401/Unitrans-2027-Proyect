# Fundación Unitrans — Sitio Web

> **Tu camino, acompañado.**

Sitio web de **Fundación Unitrans**, organización sin fines de lucro establecida en 2018 en Venezuela y dedicada a mejorar la calidad de vida de la comunidad LGBTQI+. No somos una clínica ni tenemos sede física: somos una **red de acompañamiento** que conecta a personas trans y no binarias con especialistas que atienden en sus propios consultorios, a precios solidarios y siguiendo los protocolos **WPATH (SOC-8)**.

Es un sitio minimalista, responsive y accesible, con solo 3 páginas, hecho con HTML5 y CSS3 puros y un poco de JavaScript.

---

## Identidad visual

El diseño parte del **manual de marca Unitrans**. Es cálido, cercano y humano, con mucho espacio en blanco, bordes redondeados (16–28 px), sombras sutiles e íconos de trazo redondeado.

- **Logo:** se construye con texto y SVG inline, sin imágenes. Lleva el corazón naranja con la figura humana y la palabra *Unitrans* con los colores de la bandera trans, como en el manual (T celeste · r rosa · a negro · n rosa · s celeste). En el footer va en versión compacta sobre fondo oscuro.
- **Tono:** cálido y sin tecnicismos. Concepto: *"Tu camino, acompañado"*.

### Paleta de colores

| Nombre | Variable CSS | Hex |
|---|---|---|
| Azul / morado principal | `--brand-blue` | `#6769BE` |
| Rosa suave | `--brand-pink-light` | `#F9B4C4` |
| Rosa pálido | `--brand-pink-pale` | `#FFCECB` |
| Rosa crema | `--brand-pink-cream` | `#F2DFDB` |
| Blanco cálido | `--brand-white` | `#FFECE8` |
| Verde agua | `--brand-green` | `#55AEA0` |
| Mostaza | `--brand-mustard` | `#BAAB4A` |
| Naranja corazón (logo) | `--logo-orange` | `#FF4D0C` |
| Celeste (logo) | `--logo-sky` | `#5BC5EC` |
| Rosa (logo) | `--logo-pink` | `#F4A6B7` |
| Texto | `--text` | `#1A1A2E` |
| Texto secundario | `--text-muted` | `#6B6B7B` |
| Fondo lila | `--bg-soft` | `#F5F1FA` |

> El verde, la mostaza y los colores del logo se usan solo como acento decorativo, nunca como color de texto sobre blanco, para mantener el contraste WCAG AA.

### Tipografías

| Uso | Fuente | Fuente original del manual |
|---|---|---|
| Títulos, botones, navegación | **Comfortaa** (400 / 700) | Comfortaa Regular |
| Texto de cuerpo | **Inter** (400 / 500 / 600) | Glacial Indifference* |

\* Glacial Indifference no está en Google Fonts, por eso se usa Inter como sustituta en la web.

---

## Estructura de archivos

```
.
├── index.html            # Inicio
├── acompanamiento.html   # Servicios, ruta, equipo, FAQ y alianzas
├── contacto.html         # Historia clínica, canales, voluntariado y recursos
├── styles.css            # Variables, reset, componentes y media queries
├── main.js               # Menú hamburguesa y acordeones FAQ
├── .gitignore
├── LICENSE
└── README.md
```

**Detalles técnicos**

- Mobile-first, con breakpoints en `640px` y `900px`.
- HTML semántico (`header`, `nav`, `main`, `section`, `footer`), enlace "Saltar al contenido" y `aria-current` en la navegación.
- Menú móvil con `aria-expanded`, que se cierra con <kbd>Esc</kbd>, y FAQ accesible con `aria-controls`.
- Botones `.btn` con los modificadores `.btn-primary`, `.btn-outline` y `.btn-ghost`.
- `<title>`, `<meta description>` y Open Graph en cada página.
- No usa frameworks ni herramientas de build. La única dependencia externa es Google Fonts.

---

## Cómo verlo en local

**Opción 1: Live Server (VS Code)**
1. Instala la extensión *Live Server*.
2. Haz clic derecho sobre `index.html` y elige **Open with Live Server**.

**Opción 2: terminal**
```bash
npx serve .
```
Luego abre la URL que aparece (normalmente `http://localhost:3000`).

También puedes abrir `index.html` directamente con doble clic.

---

## Despliegue

### Netlify
1. Entra en [app.netlify.com](https://app.netlify.com) y elige **Add new site → Import an existing project**.
2. Conecta GitHub y selecciona este repositorio.
3. Deja vacío el *Build command* y pon `.` (la raíz) como *Publish directory*.
4. Pulsa **Deploy**. Cada `git push` a `main` vuelve a publicar el sitio.

### Vercel
1. Entra en [vercel.com/new](https://vercel.com/new) e importa el repositorio.
2. En *Framework Preset* elige **Other**, sin comando de build.
3. Pulsa **Deploy**.

### GitHub Pages (alternativa gratuita)
En **Settings → Pages**, elige *Deploy from a branch*, la rama `main` y la carpeta `/ (root)`.

---

## Datos pendientes por confirmar

El sitio **no inventa datos**. Todo lo que falta aparece marcado como *"por confirmar"*:

- [ ] Nombres, fotos y bios reales de las personas especialistas (hoy son "Perfil de ejemplo / Nombre por confirmar").
- [ ] Modalidad, costos y canal de contacto de cada servicio.
- [ ] Alcance del servicio de Rehabilitación.
- [ ] URL oficial de Instagram (por ahora se enlaza `instagram.com/fundacionunitrans`).
- [ ] Enlaces de Telegram y WhatsApp (los botones están deshabilitados).
- [ ] Tipo de vínculo y beneficios de cada alianza (PLAFAM, VIHvos, CEBLAB, ELVILAB, Laboratorio Clínico Corona, Farmacias), además de sus logos oficiales.
- [ ] Proceso de voluntariado (hoy el botón abre un correo a la Fundación).
- [ ] Condiciones de atención para menores de 18 años.
- [ ] Guías completas de la sección Recursos ("Protocolo por confirmar").

---

## Licencia

El código de este repositorio se publica bajo **CC0 1.0 Universal** (ver [`LICENSE`](LICENSE)). El nombre, el logotipo y la identidad visual de Fundación Unitrans pertenecen a la Fundación y no están cubiertos por esta licencia.

## Créditos

© 2025 **Fundación Unitrans**. Organización sin fines de lucro · Venezuela
Instagram: [@FundacionUnitrans](https://www.instagram.com/fundacionunitrans/) · Correo: [fundaunitrans2020@gmail.com](mailto:fundaunitrans2020@gmail.com)
