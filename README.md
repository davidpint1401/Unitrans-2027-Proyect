# Fundación Unitrans — Sitio Web

> **Tu camino, acompañado.**

Sitio web de **Fundación Unitrans**, organización sin fines de lucro establecida en 2018 en Venezuela y dedicada a mejorar la calidad de vida de la comunidad LGBTQI+. No somos una clínica ni tenemos sede física: somos una **red de acompañamiento** que conecta a personas trans y no binarias con especialistas que atienden en sus propios consultorios, a precios solidarios y siguiendo los protocolos **WPATH (SOC-8)**.

Es un sitio minimalista, responsive y accesible, con solo 3 páginas, hecho con HTML5 y CSS3 puros y un poco de JavaScript.

---

## Identidad visual

El diseño parte del **manual de marca Unitrans**. Es cálido, cercano y humano, con mucho espacio en blanco, bordes redondeados (16–28 px), sombras sutiles e íconos de trazo redondeado.

- **Logo:** se usa el archivo oficial (`assets/`), con el corazón naranja y la palabra *Unitrans* en los colores de la bandera trans. En el footer va la versión con letras blancas sobre fondo oscuro.
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
├── acompanamiento.html   # Asesoría, servicios, ruta, especialistas, terapia hormonal, laboratorios, cirugía, FAQ y alianzas
├── contacto.html         # Historia clínica, canales, voluntariado y recursos
├── styles.css            # Variables, reset, componentes y media queries
├── main.js               # Menú hamburguesa, acordeones FAQ y respaldo de imágenes
├── registro.js           # Registro de pacientes y desbloqueo de costos
├── registro-config.js    # Destino de los registros y opciones del formulario
├── google-apps-script/
│   └── Codigo.gs         # Receptor de registros para la hoja de la Fundación
├── data/
│   ├── fuentes.json          # Hormonas, farmacias, enlaces y precios de referencia
│   └── precios.json          # Precios y tasa BCV del día (lo genera GitHub Actions)
├── scripts/
│   └── actualizar-precios.mjs  # Consulta la tasa BCV y la web de cada farmacia
├── .github/workflows/
│   └── precios.yml           # Ejecuta el script dos veces al día
├── assets/
│   ├── logo-unitrans.png         # Logo oficial a color (header)
│   └── logo-unitrans-blanco.png  # Logo para fondos oscuros (footer)
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
- No usa frameworks ni herramientas de build. La única dependencia externa es Google Fonts. El script de precios usa Node 20 sin paquetes.

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

## Precios de hormonas actualizados automáticamente

La sección **Terapia hormonal** muestra cada precio en dólares y en bolívares a la tasa oficial del BCV del día.

**Cómo funciona**

1. Dos veces al día (7:17 am y 7:17 pm, hora de Venezuela) GitHub Actions ejecuta `scripts/actualizar-precios.mjs`.
2. El script consulta la tasa oficial (USD y EUR) y su fecha valor directamente en [bcv.org.ve](https://www.bcv.org.ve/). El BCV no tiene una API pública, así que se lee de su página. Como su servidor no envía completa la cadena de certificados, el workflow descarga el certificado intermedio que falta desde la dirección indicada en su propio certificado, y la conexión sigue verificada. Si el BCV no responde, se usa la tasa oficial publicada por `ve.dolarapi.com`.
3. Visita la página de cada producto listada en `data/fuentes.json` (Farmatodo, Badan, Locatel y Suplementos Venezuela) y lee el precio y la moneda en que está publicado (Bs, USD o EUR).
4. Convierte el precio: si la tienda lo publica en Bs, calcula el equivalente en USD con la tasa BCV; si lo publica en USD, calcula los Bs. En la web, el monto convertido se marca con "≈".
   - **Suplementos Venezuela publica en euros.** En `data/fuentes.json` tiene `"moneda": "EUR"`, así que su precio se muestra en € y se convierte a Bs con la **tasa euro del BCV**. Su página indica USD en los metadatos, pero esa moneda fija tiene prioridad. Cualquier otra tienda que cobre en euros se configura igual.
5. Guarda todo en `data/precios.json` y lo sube al repositorio. Netlify o Vercel vuelven a publicar el sitio solos.

**Protecciones**

- Si una tienda no responde o cambia su página, se conserva el último precio verificado y se marca con un asterisco (*).
- Una lectura se descarta si se aleja más de 4 veces del precio de referencia de los correos (`referencia_usd`). Así se evitan errores por ofertas, otros productos o cambios de formato.
- Si `data/precios.json` no carga, la web muestra los precios de referencia escritos en el HTML.
- Divacún y PLAFAM no tienen página de producto, así que muestran el precio de referencia convertido a Bs.
- **Badan bloquea las consultas automáticas desde los servidores de GitHub (HTTP 403).** Por ahora muestra el precio de referencia convertido a Bs. Si Badan cambia esa política, empezará a actualizarse solo.

**Tareas habituales**

- *Cambiar el enlace o el precio de referencia de una farmacia:* edita `data/fuentes.json`. El cambio por sí solo dispara una actualización.
- *Agregar una farmacia o un producto:* agrégalo en `data/fuentes.json` (con un `id` de producto y de tienda) y añade la fila en la tabla de `acompanamiento.html` con la celda `<td data-precio="producto/tienda"><span class="price-usd">$0,00</span></td>`. La web la rellena sola.
- *Forzar una actualización:* en GitHub ve a **Actions → Actualizar precios de hormonas → Run workflow**.
- *Ver qué leyó de cada tienda:* abre la última ejecución en **Actions**. El registro muestra cada precio leído y si se aceptó o se descartó.

> Las actualizaciones programadas solo corren desde la rama principal (`main`): se activan cuando esta rama se fusione.

## Registro de pacientes (historia clínica en la web)

La página **Contacto** tiene un formulario de registro (`#registro`). Al completarlo, la persona desbloquea en **Acompañamiento** los costos y contactos de especialistas y los precios de las hormonas. Las opciones de cada pregunta son las mismas del Google Form de historia clínica.

### Reglas por edad (calculada con la fecha de nacimiento)

| Edad | Qué pasa |
|---|---|
| Menos de 14 años | Se registra con su madre, padre o representante: se piden sus datos y su autorización. |
| 14 a 17 años | Se le pregunta si quiere que su representante le acompañe. **Sí:** se piden los datos del representante. **No:** continúa por su cuenta. |
| Menores de 18 | Se muestra el Artículo 50 de la LOPNNA y se pregunta si lo conoce (Sí/No). |
| 18 años o más | Registro individual. |

### A dónde llegan los registros

La web envía cada registro a **dos Google Apps Script**, el del formulario nuevo y el del formulario viejo (lista `appsScriptUrls` en `registro-config.js`). Basta con que uno confirme para dar el registro por guardado; así, si uno falla, la persona no reintenta y no queda duplicada en el otro. El código de referencia está en `google-apps-script/Codigo.gs` y guarda en dos hojas:

1. **"Registros web Unitrans"**, pestaña *Registros web*, con todos los datos: fecha de nacimiento, representante y consentimiento.
2. **"Formularios de Atención UNITRANS2020 (respuestas)"**, la hoja del Google Form de historia clínica. El registro entra como una fila más en las columnas que ya existen, que se reconocen por su título.

La web solo muestra el mensaje de éxito cuando el script confirma que guardó la fila. Si no puede confirmarlo, avisa a la persona para que lo intente de nuevo; sus datos siguen en el formulario.

> El envío directo al Google Form está desactivado (`enviarAlGoogleForm: false`) porque Google rechaza los envíos que no vienen de su propia página (HTTP 400). Por eso es el script el que escribe en la hoja del formulario.

**Instalar o actualizar el script** (con la cuenta dueña de las dos hojas):

1. Abre "Registros web Unitrans" y ve a **Extensiones → Apps Script**. Pega el contenido de `google-apps-script/Codigo.gs` y guarda.
2. Ve a **Implementar → Gestionar implementaciones**, pulsa ✏️ y en *Versión* elige **Nueva versión**. Revisa estos dos ajustes:
   - *Ejecutar como*: **Yo**. Si eliges "Usuario que accede a la aplicación web", Google pide iniciar sesión.
   - *Quién tiene acceso*: **Cualquier usuario**. Esta opción solo aparece después de elegir *Ejecutar como: Yo*. Si eliges "Cualquier usuario con una cuenta de Google", Google pide iniciar sesión y la web no puede guardar.
3. Pulsa **Implementar** y autoriza los permisos. Google pide acceso a las hojas de cálculo porque el script escribe en las dos.

La URL `/exec` no cambia, así que no hay que tocar `registro-config.js`. Si se crea una implementación nueva (URL distinta), hay que agregarla a `appsScriptUrls`.

### Privacidad y límites

- En el navegador solo se guarda que la persona ya se registró y la fecha. Ningún dato personal queda en el dispositivo.
- La hoja propia neutraliza fórmulas en las respuestas y descarta envíos de bots (campo trampa invisible).
- El bloqueo de costos y contactos es una **invitación a registrarse, no una protección de seguridad**. Al ser un sitio estático, la información sigue en el código de la página. Protegerla de verdad requeriría un servidor con inicio de sesión.

## Contenido y datos pendientes

Los horarios, costos, contactos de especialistas y precios de hormonas salen de los **correos informativos de la Fundación**. Son precios de referencia y pueden cambiar; las actualizaciones se anuncian en el [canal de WhatsApp](https://www.whatsapp.com/channel/0029VaaUsczL2ATzuoNGJz2H).

Datos que siguen **por confirmar**:

- [ ] Enlaces de Google Maps de cada especialista y laboratorio.
- [ ] Especialidad del Dr. Juan Blanco.
- [ ] Horario de la consulta pública del Dr. Freddy Salazar (aparece como "viernes de 8 am a 9 pm").
- [ ] Ortografía del apellido "Rossamando" (en un correo aparece como "Rossamodo").
- [ ] URLs de la web de VIHvos y de PLAFAM (pestañas Combos, Anticonceptivos y Laboratorio).
- [ ] URL oficial de Instagram (por ahora se enlaza `instagram.com/fundacionunitrans`) y enlaces de Facebook y TikTok.
- [ ] Condiciones de atención para menores de 18 años.
- [ ] Guías completas de la sección Recursos.

### Imágenes externas

Las fotos de especialistas, los productos hormonales y los logos de aliados se cargan desde el servidor de imágenes de los correos informativos (`woooth.stripocdn.email`). Si alguna no carga, `main.js` la retira y deja visibles las iniciales o el nombre en texto, así que el diseño no se rompe. Lo recomendable es copiar esos archivos a `assets/` y reemplazar en los HTML la dirección `https://woooth.stripocdn.email/.../images/` por `assets/`, para no depender de ese servidor.

Para actualizar precios o especialistas basta con editar el texto en `acompanamiento.html` (sección `#especialistas` y `#hormonas`).

---

## Licencia

El código de este repositorio se publica bajo **CC0 1.0 Universal** (ver [`LICENSE`](LICENSE)). El nombre, el logotipo y la identidad visual de Fundación Unitrans pertenecen a la Fundación y no están cubiertos por esta licencia.

## Créditos

© 2025 **Fundación Unitrans**. Organización sin fines de lucro · Venezuela
Instagram: [@FundacionUnitrans](https://www.instagram.com/fundacionunitrans/) · Telegram: [t.me/FundacionUnitransOf](https://t.me/FundacionUnitransOf) · Correo: [fundaunitrans2020@gmail.com](mailto:fundaunitrans2020@gmail.com)
