#!/usr/bin/env node
/**
 * Actualiza data/precios.json con:
 *  - la tasa oficial del BCV (USD y EUR), y
 *  - el precio de cada hormona en la web de cada farmacia (data/fuentes.json).
 *
 * Lee el precio del JSON-LD / metadatos de cada página (Farmatodo, Suplementos Venezuela),
 * de la API de VTEX (Locatel) o del JSON de PrestaShop (Badan).
 *
 * Se ejecuta desde GitHub Actions (.github/workflows/precios.yml). Sin dependencias: Node 20+.
 * Si una fuente falla o devuelve un valor absurdo, se conserva el último dato verificado.
 *
 * Uso: node scripts/actualizar-precios.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const FUENTES = new URL('../data/fuentes.json', import.meta.url);
const SALIDA = new URL('../data/precios.json', import.meta.url);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept-Language': 'es-VE,es-419;q=0.9,es;q=0.8,en;q=0.7',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

/** Mensaje de error con su causa (fetch solo dice "fetch failed") */
const motivo = (err) => [err.message, err.cause?.code, err.cause?.message].filter(Boolean).join(' · ');

// Una lectura se acepta solo si, en USD, queda dentro de este factor del precio de referencia.
const MARGEN = 4;

async function get(url, { json = false } = {}) {
  const res = await fetch(url, {
    headers: { ...HEADERS, Accept: json ? 'application/json' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
    signal: AbortSignal.timeout(25000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

/** "1.234,56" · "1,234.56" · "83.47" · "83,47" · "Bs. 3.042,51" → número */
export function parseNumero(texto) {
  if (typeof texto === 'number') return texto;
  let s = String(texto).replace(/[^\d.,]/g, '');
  if (!s) return NaN;
  const coma = s.lastIndexOf(','), punto = s.lastIndexOf('.');
  if (coma > -1 && punto > -1) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (coma > -1) {
    // "1,234" y "1,234,567" son miles; "83,47" o "875,65050000" (formato BCV) son decimales
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  return parseFloat(s);
}

function normalizarMoneda(c) {
  if (!c) return null;
  c = String(c).toUpperCase();
  if (['USD', 'US$', '$', 'DOLAR', 'DÓLAR'].includes(c)) return 'USD';
  if (['VES', 'VEF', 'VED', 'BS', 'BS.', 'BSS', 'BSD'].includes(c)) return 'VES';
  if (['EUR', '€'].includes(c)) return 'EUR';
  return null;
}

/* ------------------------------------------------------------------ Tasa BCV */

async function tasaDesdeBCV() {
  const html = await get('https://www.bcv.org.ve/');
  // Bloque: <div id="dolar"> … <span> USD</span> … <strong> 875,65050000 </strong>
  const valor = (id) => {
    const m = html.match(new RegExp(`id=["']${id}["'][\\s\\S]{0,2000}?<strong[^>]*>\\s*([\\d.,]+)\\s*</strong>`, 'i'));
    return m ? parseNumero(m[1]) : NaN;
  };
  const usd = valor('dolar'), eur = valor('euro');
  const fecha = (html.match(/date-display-single["'][^>]*content=["']([^"']+)["']/i) || [])[1] || null;
  if (!(usd > 0)) {
    const i = html.search(/dolar|USD/i);
    const muestra = (i > -1 ? html.slice(Math.max(0, i - 200), i + 400) : html.slice(0, 400)).replace(/\s+/g, ' ');
    throw new Error(`no se encontró la tasa del dólar (${html.length} bytes). Fragmento: ${muestra}`);
  }
  return { usd, eur: eur > 0 ? eur : null, fecha_valor: fecha, fuente: 'bcv.org.ve' };
}

async function tasaDesdeDolarApi() {
  // Respaldo: ve.dolarapi.com publica la tasa oficial del BCV
  const d = await get('https://ve.dolarapi.com/v1/dolares/oficial', { json: true });
  const usd = Number(d.promedio);
  if (!(usd > 0)) throw new Error('respuesta sin tasa');
  let eur = null;
  try {
    const e = await get('https://ve.dolarapi.com/v1/euros/oficial', { json: true });
    eur = Number(e.promedio) > 0 ? Number(e.promedio) : null;
  } catch { /* el euro es opcional */ }
  return { usd, eur, fecha_valor: d.fechaActualizacion || null, fuente: 've.dolarapi.com (tasa oficial BCV)' };
}

async function obtenerTasa(anterior) {
  for (const fuente of [tasaDesdeBCV, tasaDesdeDolarApi]) {
    try {
      const t = await fuente();
      console.log(`Tasa: ${t.usd} Bs/USD · ${t.eur ?? '-'} Bs/EUR (${t.fuente})`);
      return { ...t, verificado: new Date().toISOString(), estado: 'ok' };
    } catch (err) {
      console.warn(`Tasa: ${fuente.name} falló: ${motivo(err)}`);
    }
  }
  console.warn('Tasa: se conserva la anterior');
  return anterior ? { ...anterior, estado: 'desactualizado' } : null;
}

/* ------------------------------------------------------------------ Extractores */

function desdeJsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const visitar = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) return o.forEach(visitar);
      const precio = o.price ?? o.lowPrice;
      if ((o['@type'] === 'Offer' || o['@type'] === 'AggregateOffer') && precio != null) {
        out.push({ valor: parseNumero(precio), moneda: normalizarMoneda(o.priceCurrency), via: 'json-ld' });
      }
      Object.values(o).forEach(visitar);
    };
    visitar(data);
  }
  return out;
}

function desdeMeta(html) {
  const meta = (prop) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${prop}["']`, 'i'));
    return m ? m[1] : null;
  };
  const out = [];
  for (const [p, c] of [['product:price:amount', 'product:price:currency'], ['og:price:amount', 'og:price:currency']]) {
    const v = meta(p);
    if (v) out.push({ valor: parseNumero(v), moneda: normalizarMoneda(meta(c)), via: p });
  }
  const ip = html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i);
  if (ip) {
    const cur = html.match(/itemprop=["']priceCurrency["'][^>]*content=["']([^"']+)["']/i);
    out.push({ valor: parseNumero(ip[1]), moneda: normalizarMoneda(cur && cur[1]), via: 'itemprop' });
  }
  return out;
}

function desdePrestaShop(html) {
  // Badan (PrestaShop) incluye un JSON del producto y la moneda de la tienda
  const precio = html.match(/"price_amount"\s*:\s*"?([\d.]+)/);
  if (!precio) return [];
  const iso = html.match(/"currency"\s*:\s*\{[^}]*"iso_code"\s*:\s*"([A-Z]{3})"/);
  return [{ valor: parseFloat(precio[1]), moneda: normalizarMoneda(iso && iso[1]), via: 'prestashop' }];
}

async function desdeVtex(url) {
  // Locatel (VTEX): API pública del catálogo
  const m = url.match(/^(https:\/\/[^/]+)\/(.+)\/p\/?$/);
  if (!m) return [];
  const data = await get(`${m[1]}/api/catalog_system/pub/products/search/${m[2]}/p`, { json: true });
  const sellers = data?.[0]?.items?.[0]?.sellers ?? [];
  const oferta = (sellers.find((s) => s.sellerDefault) ?? sellers[0])?.commertialOffer;
  return oferta?.Price > 0 ? [{ valor: oferta.Price, moneda: null, via: 'vtex' }] : [];
}

async function candidatos(url) {
  const out = [];
  const host = new URL(url).hostname;
  try {
    if (host.includes('locatel')) out.push(...await desdeVtex(url));
  } catch (err) {
    console.warn(`    API de la tienda falló: ${motivo(err)}`);
  }
  try {
    const html = await get(url);
    out.push(...desdeJsonLd(html), ...desdeMeta(html), ...desdePrestaShop(html));
  } catch (err) {
    console.warn(`    página falló: ${motivo(err)}`);
  }
  return out.filter((c) => c.valor > 0 && Number.isFinite(c.valor));
}

/**
 * Convierte una lectura a USD y Bs. Si la tienda no indica la moneda, se elige la
 * interpretación (Bs o USD) más cercana al precio de referencia.
 */
function interpretar(c, ref, tasa, monedaTienda = null) {
  const opciones = [];
  const add = (moneda) => {
    const o = convertir(c.valor, moneda, tasa);
    if (o) opciones.push(o);
  };
  // Si la tienda tiene moneda fija en fuentes.json (p. ej. EUR), manda sobre lo que diga la página
  const moneda = monedaTienda ?? c.moneda;
  if (moneda) add(moneda); else { add('USD'); add('VES'); }
  const validas = opciones.filter((o) => o.usd >= ref / MARGEN && o.usd <= ref * MARGEN);
  validas.sort((a, b) => Math.abs(Math.log(a.usd / ref)) - Math.abs(Math.log(b.usd / ref)));
  return validas[0] ?? null;
}

/** Monto en su moneda → { moneda, precio, usd, bs } con la tasa BCV (USD o EUR según corresponda) */
function convertir(valor, moneda, tasa) {
  if (moneda === 'USD') return { moneda, precio: valor, usd: valor, bs: tasa ? valor * tasa.usd : null };
  if (moneda === 'VES' && tasa) return { moneda, precio: valor, usd: valor / tasa.usd, bs: valor };
  if (moneda === 'EUR' && tasa?.eur) return { moneda, precio: valor, usd: (valor * tasa.eur) / tasa.usd, bs: valor * tasa.eur };
  if (moneda === 'EUR') return { moneda, precio: valor, usd: null, bs: null };
  return null;
}

/* ------------------------------------------------------------------ Principal */

const redondear = (n) => (n == null ? null : Math.round(n * 100) / 100);

async function main() {
  const fuentes = JSON.parse(await readFile(FUENTES, 'utf8'));
  let anterior = {};
  try { anterior = JSON.parse(await readFile(SALIDA, 'utf8')); } catch { /* primera ejecución */ }

  const tasa = await obtenerTasa(anterior.tasa);
  const productos = {};
  let ok = 0, fallos = 0;

  for (const prod of fuentes.productos) {
    productos[prod.id] = {};
    for (const t of prod.tiendas) {
      const previo = anterior.productos?.[prod.id]?.[t.id];
      // Precio de referencia (correos) en la moneda de la tienda: USD por defecto, EUR en Suplementos Venezuela
      const monedaRef = t.moneda ?? 'USD';
      const valorRef = t.referencia ?? t.referencia_usd;
      const ref = convertir(valorRef, monedaRef, tasa);
      const refUsd = ref?.usd ?? valorRef;
      const base = { url: t.url, referencia: valorRef, moneda_referencia: monedaRef };
      const fila = (r, extra) => ({
        ...base,
        precio_origen: redondear(r.precio),
        moneda_origen: r.moneda,
        usd: redondear(r.usd),
        bs: redondear(r.bs),
        ...extra,
      });

      if (!t.url) {
        // Sin página de origen: precio de referencia de los correos, convertido a Bs con la tasa del día
        productos[prod.id][t.id] = fila(ref, { origen: 'referencia', estado: 'referencia', verificado: null });
        continue;
      }

      console.log(`${prod.id} · ${t.id}${t.moneda ? ` (moneda fija: ${t.moneda})` : ''}`);
      const lecturas = await candidatos(t.url);
      let elegido = null;
      for (const c of lecturas) {
        const r = interpretar(c, refUsd, tasa, t.moneda ?? null);
        console.log(`    ${c.via}: ${c.valor} ${c.moneda ?? '(moneda sin indicar)'} → ${r ? `${r.precio} ${r.moneda} = $${r.usd.toFixed(2)} = Bs ${r.bs?.toFixed(2)}` : 'descartado'}`);
        if (r && !elegido) elegido = { ...r, via: c.via };
      }

      if (elegido) {
        ok++;
        productos[prod.id][t.id] = fila(elegido, { origen: elegido.via, estado: 'ok', verificado: new Date().toISOString() });
      } else {
        fallos++;
        console.warn('    sin lectura válida: se conserva el último dato');
        // Un dato viejo leído en otra moneda (p. ej. antes de fijar EUR) ya no sirve
        const previoValido = previo?.verificado && (!t.moneda || previo.moneda_origen === t.moneda);
        if (previoValido) {
          // Último precio verificado, recalculado con la tasa de hoy
          const precio = previo.precio_origen ?? (previo.moneda_origen === 'VES' ? previo.bs : previo.usd);
          const r = convertir(precio, previo.moneda_origen, tasa) ?? { moneda: previo.moneda_origen, precio, usd: previo.usd, bs: previo.bs };
          productos[prod.id][t.id] = fila(r, { origen: previo.origen, estado: 'desactualizado', verificado: previo.verificado });
        } else {
          productos[prod.id][t.id] = fila(ref, { origen: 'referencia', estado: 'referencia', verificado: null });
        }
      }
    }
  }

  const salida = { actualizado: new Date().toISOString(), tasa, productos };
  await writeFile(SALIDA, JSON.stringify(salida, null, 2) + '\n');
  console.log(`\nListo: ${ok} precios verificados, ${fallos} sin actualizar.`);
}

export { desdeJsonLd, desdeMeta, desdePrestaShop, interpretar };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
