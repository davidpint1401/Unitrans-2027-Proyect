#!/usr/bin/env node
/**
 * Actualiza data/precios.json con:
 *  - la tasa oficial del BCV (USD y EUR), y
 *  - el precio de cada hormona en la web de cada farmacia (data/fuentes.json).
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
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'es-VE,es;q=0.9',
};

// Una lectura se acepta solo si, en USD, queda dentro de este factor del precio de referencia.
const MARGEN = 4;

async function get(url, { json = false } = {}) {
  const res = await fetch(url, {
    headers: { ...HEADERS, Accept: json ? 'application/json' : 'text/html,application/xhtml+xml' },
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
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
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
  const valor = (id) => {
    const m = html.match(new RegExp(`id="${id}"[\\s\\S]*?<strong>\\s*([\\d.,]+)\\s*</strong>`));
    return m ? parseNumero(m[1]) : NaN;
  };
  const usd = valor('dolar'), eur = valor('euro');
  const fecha = (html.match(/date-display-single"[^>]*content="([^"]+)"/) || [])[1] || null;
  if (!(usd > 0)) throw new Error('no se encontró la tasa del dólar');
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
      console.warn(`Tasa: ${fuente.name} falló: ${err.message}`);
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

async function desdeShopify(url) {
  // Suplementos Venezuela (Shopify): /products/<handle>.js devuelve el precio en centavos
  const limpio = url.split('?')[0].replace(/\/$/, '');
  const p = await get(`${limpio}.js`, { json: true });
  const v = p.variants?.find((x) => x.available) ?? p.variants?.[0];
  const cents = v?.price ?? p.price;
  return cents != null ? [{ valor: cents / 100, moneda: null, via: 'shopify' }] : [];
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
    if (host.includes('suplementosvenezuela')) out.push(...await desdeShopify(url));
    if (host.includes('locatel')) out.push(...await desdeVtex(url));
  } catch (err) {
    console.warn(`    API de la tienda falló: ${err.message}`);
  }
  try {
    const html = await get(url);
    out.push(...desdeJsonLd(html), ...desdeMeta(html), ...desdePrestaShop(html));
  } catch (err) {
    console.warn(`    página falló: ${err.message}`);
  }
  return out.filter((c) => c.valor > 0 && Number.isFinite(c.valor));
}

/**
 * Convierte una lectura a USD y Bs. Si la tienda no indica la moneda, se elige la
 * interpretación (Bs o USD) más cercana al precio de referencia.
 */
function interpretar(c, ref, tasa) {
  const opciones = [];
  const add = (moneda) => {
    if (moneda === 'USD') opciones.push({ moneda, usd: c.valor, bs: tasa ? c.valor * tasa.usd : null });
    if (moneda === 'VES' && tasa) opciones.push({ moneda, usd: c.valor / tasa.usd, bs: c.valor });
    if (moneda === 'EUR' && tasa?.eur) opciones.push({ moneda, usd: (c.valor * tasa.eur) / tasa.usd, bs: c.valor * tasa.eur });
  };
  if (c.moneda) add(c.moneda); else { add('USD'); add('VES'); }
  const validas = opciones.filter((o) => o.usd >= ref / MARGEN && o.usd <= ref * MARGEN);
  validas.sort((a, b) => Math.abs(Math.log(a.usd / ref)) - Math.abs(Math.log(b.usd / ref)));
  return validas[0] ?? null;
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
      const base = { url: t.url, referencia_usd: t.referencia_usd };

      if (!t.url) {
        // Sin página de origen: precio de referencia de los correos, convertido a Bs con la tasa del día
        productos[prod.id][t.id] = {
          ...base, usd: t.referencia_usd, bs: tasa ? redondear(t.referencia_usd * tasa.usd) : null,
          moneda_origen: 'USD', origen: 'referencia', estado: 'referencia', verificado: null,
        };
        continue;
      }

      console.log(`${prod.id} · ${t.id}`);
      const lecturas = await candidatos(t.url);
      let elegido = null;
      for (const c of lecturas) {
        const r = interpretar(c, t.referencia_usd, tasa);
        console.log(`    ${c.via}: ${c.valor} ${c.moneda ?? '(moneda sin indicar)'} → ${r ? `$${r.usd.toFixed(2)} (${r.moneda})` : 'descartado'}`);
        if (r && !elegido) elegido = { ...r, via: c.via };
      }

      if (elegido) {
        ok++;
        productos[prod.id][t.id] = {
          ...base,
          usd: redondear(elegido.usd),
          bs: redondear(elegido.bs),
          moneda_origen: elegido.moneda,
          origen: elegido.via,
          estado: 'ok',
          verificado: new Date().toISOString(),
        };
      } else {
        fallos++;
        console.warn('    sin lectura válida: se conserva el último dato');
        productos[prod.id][t.id] = previo
          ? { ...previo, ...base, estado: previo.verificado ? 'desactualizado' : 'referencia' }
          : { ...base, usd: t.referencia_usd, bs: null, moneda_origen: 'USD', origen: 'referencia', estado: 'referencia', verificado: null };
        // Si el dato viejo estaba en USD, recalcula los Bs con la tasa nueva
        const p = productos[prod.id][t.id];
        if (p.moneda_origen === 'USD' && tasa) p.bs = redondear(p.usd * tasa.usd);
        if (p.moneda_origen === 'VES' && tasa && p.bs) p.usd = redondear(p.bs / tasa.usd);
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
