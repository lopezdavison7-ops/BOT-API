import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60, useClones: false });

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const MODOS = ['normal', 'text', 'links', 'images', 'meta', 'json', 'head', 'img'];
const LIMITE_TEXTO = 3200;
const LIMITE_LISTA = 20;
const MAX_CACHE_BYTES = 2 * 1024 * 1024;

const ENTIDADES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    hellip: '…', mdash: '—', ndash: '–', laquo: '«', raquo: '»',
    copy: '©', reg: '®', trade: '™', euro: '€', pound: '£', deg: '°'
};

function codePoint(n) {
    try {
        return String.fromCodePoint(n);
    } catch {
        return '';
    }
}

function decodificar(texto = '') {
    return String(texto)
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePoint(parseInt(h, 16)))
        .replace(/&#(\d+);/g, (_, d) => codePoint(parseInt(d, 10)))
        .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n.toLowerCase()] ?? m);
}

function parseAtributos(cadena = '') {
    const salida = {};
    const re = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
    let m;
    while ((m = re.exec(cadena))) {
        salida[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
    }
    return salida;
}

function textoPlano(html = '') {
    return decodificar(
        String(html)
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<template[\s\S]*?<\/template>/gi, ' ')
            .replace(/<!--[\s\S]*?-->/g, ' ')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
    )
        .replace(/[ \t\u00a0]+/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/^[ \t]+|[ \t]+$/gm, '')
        .trim();
}

function absoluta(href, base) {
    if (!href) return null;
    const limpio = decodificar(href).trim();
    if (!limpio || /^(javascript:|mailto:|tel:|data:|#|blob:)/i.test(limpio)) return null;
    try {
        return new URL(limpio, base).href;
    } catch {
        return null;
    }
}

function extraerLinks(html, base) {
    const vistos = new Set();
    for (const m of html.matchAll(/<a\s+[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        const abs = absoluta(m[1] ?? m[2] ?? m[3], base);
        if (abs) vistos.add(abs);
    }
    return [...vistos];
}

function extraerImagenes(html, base) {
    const vistos = new Set();
    for (const m of html.matchAll(/<img\s+[^>]*?(?:data-src|data-lazy-src|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        const abs = absoluta(m[1] ?? m[2] ?? m[3], base);
        if (abs && !/^data:/i.test(abs)) vistos.add(abs);
    }
    return [...vistos];
}

function extraerMeta(html) {
    const meta = {};
    for (const m of html.matchAll(/<meta\s+([^>]+?)\/?>/gi)) {
        const attrs = parseAtributos(m[1]);
        const clave = (attrs.property || attrs.name || '').toLowerCase();
        if (clave && attrs.content) meta[clave] = attrs.content;
    }
    return meta;
}

function detectarCharset(buffer, contentType = '') {
    let m = contentType.match(/charset=["']?([\w-]+)/i);
    if (m) return m[1].toLowerCase();
    const cabecera = buffer.subarray(0, 4096).toString('latin1');
    m = cabecera.match(/<meta[^>]+charset\s*=\s*["']?([\w-]+)/i);
    if (m) return m[1].toLowerCase();
    m = cabecera.match(/<meta[^>]+content=["'][^"']*charset=([\w-]+)/i);
    return m ? m[1].toLowerCase() : 'utf-8';
}

function decodificarBytes(buffer, charset) {
    try {
        return new TextDecoder(charset, { fatal: false }).decode(buffer);
    } catch {
        return buffer.toString('utf8');
    }
}

function normalizarUrl(entrada) {
    let s = String(entrada || '').trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    try {
        const u = new URL(s);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
        return u;
    } catch {
        return null;
    }
}

async function obtener(url, timeout = 20000) {
    const clave = url.href;
    const enCache = cache.get(clave);
    if (enCache) return { ...enCache, cache: true };

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);

    try {
        const res = await fetch(url.href, {
            redirect: 'follow',
            signal: ctrl.signal,
            headers: {
                'User-Agent': UA,
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache'
            }
        });

        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get('content-type') || '';
        const charset = detectarCharset(buffer, contentType);

        const data = {
            status: res.status,
            ok: res.ok,
            urlFinal: res.url || url.href,
            contentType,
            charset,
            bytes: buffer.length,
            html: decodificarBytes(buffer, charset)
        };

        if (res.ok && buffer.length <= MAX_CACHE_BYTES) cache.set(clave, data);
        return data;
    } finally {
        clearTimeout(timer);
    }
}

function analizar(data) {
    const base = data.urlFinal;
    const html = data.html;
    const meta = extraerMeta(html);
    const imagenes = extraerImagenes(html, base);
    const og = meta['og:image'] ? absoluta(meta['og:image'], base) : null;

    return {
        titulo: decodificar((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim()) || 'Sin título',
        descripcion: decodificar(meta['description'] || meta['og:description'] || ''),
        ogTitulo: decodificar(meta['og:title'] || ''),
        ogImagen: og,
        favicon: absoluta(meta['icon'] || '/favicon.ico', base),
        canonical: absoluta(html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1], base),
        meta,
        links: extraerLinks(html, base),
        imagenes,
        texto: textoPlano(html)
    };
}

function caja(emoji, titulo, cuerpo = [], pie) {
    const lineas = Array.isArray(cuerpo) ? cuerpo : [cuerpo];
    let texto = `╭〔 ${emoji} 𝐒𝐂𝐑𝐀𝐏𝐄 › ${titulo} 〕⬣\n┃\n`;
    for (const l of lineas) texto += l === '' ? '┃\n' : `┃ ${l}\n`;
    texto += '┃\n╰━━━━━━━━⬣';
    if (pie) texto += `\n\n> ${pie}`;
    return texto + '\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';
}

const qb = n => Number(n || 0).toLocaleString('es-ES');

export default {
    nombre: 'scrape',
    categoria: 'tools',
    alias: ['scrap', 'webs', 'webscrape', 'ws'],
    descripcion: '💻 Scraper web optimizado. Modos: normal, text, links, images, meta, json, head, img',
    uso: '.scrape [modo] <url>',

    ejecutar: async ({ responder, argumento }) => {
        const partes = (argumento || '').trim().split(/\s+/).filter(Boolean);

        let modo = 'normal';
        let objetivo = partes[0];

        if (MODOS.includes((partes[0] || '').toLowerCase())) {
            modo = partes[0].toLowerCase();
            objetivo = partes[1];
        }

        if (!objetivo) {
            return responder.texto(
                caja('❓', 'AYUDA', [
                    'Uso: *.scrape [modo] <url>*',
                    '',
                    '📦 *Modos disponibles:*',
                    '• normal  → resumen + preview',
                    '• text    → texto limpio',
                    '• links   → enlaces encontrados',
                    '• images  → imágenes encontradas',
                    '• meta    → metadatos completos',
                    '• json    → respuesta JSON cruda',
                    '• head    → estado y cabeceras HTTP',
                    '• img     → envía la imagen principal',
                    '',
                    'Ej: *.scrape google.com*',
                    'Ej: *.scrape text wikipedia.org*'
                ], '⚡ 100% real · caché 5 min')
            );
        }

        const url = normalizarUrl(objetivo);
        if (!url) {
            return responder.texto(
                caja('❌', 'URL INVÁLIDA', ['Solo se permiten URLs http(s).', 'Ej: *.scrape https://google.com*'])
            );
        }

        await responder.texto(caja('🔍', 'ESCANEANDO', [`Modo: ${modo}`, `Target: ${url.href}`]));

        try {
            const data = await obtener(url);

            if (!data.ok) {
                return responder.texto(
                    caja('⚠️', 'HTTP ' + data.status, [
                        `El servidor respondió ${data.status}.`,
                        `Tipo: ${data.contentType || 'desconocido'}`
                    ], `URL final: ${data.urlFinal}`)
                );
            }

            if (modo === 'head') {
                return responder.texto(
                    caja('🧾', 'CABECERAS', [
                        `Estado: ${data.status}`,
                        `Tipo: ${data.contentType || 'N/D'}`,
                        `Charset: ${data.charset}`,
                        `Tamaño: ${qb(data.bytes)} bytes`,
                        `Final: ${data.urlFinal}`
                    ], data.cache ? '📦 servido desde caché' : '🌐 petición en vivo')
                );
            }

            if (modo === 'json') {
                const esJson = /application\/json|text\/plain/i.test(data.contentType);
                let volcado;
                if (esJson) {
                    try {
                        volcado = JSON.stringify(JSON.parse(data.html), null, 2);
                    } catch {
                        volcado = data.html;
                    }
                } else {
                    volcado = JSON.stringify(analizar(data), null, 2);
                }
                return responder.texto(
                    caja('📦', 'JSON DUMP', ['```json', volcado.slice(0, LIMITE_TEXTO), '```'], `Charset: ${data.charset}`)
                );
            }

            const info = analizar(data);

            if (modo === 'text') {
                if (!info.texto) {
                    return responder.texto(caja('📄', 'TEXTO LIMPIO', ['No se detectó texto legible.']));
                }
                return responder.texto(
                    caja('📄', 'TEXTO LIMPIO', [info.texto.slice(0, LIMITE_TEXTO)], `${qb(info.texto.length)} caracteres detectados`)
                );
            }

            if (modo === 'links') {
                const cuerpo = info.links.length
                    ? info.links.slice(0, LIMITE_LISTA).map((l, i) => `${i + 1}. ${l}`)
                    : ['No se encontraron enlaces.'];
                return responder.texto(
                    caja('🔗', 'ENLACES', cuerpo, `Total detectados: ${qb(info.links.length)}`)
                );
            }

            if (modo === 'images') {
                const cuerpo = info.imagenes.length
                    ? info.imagenes.slice(0, LIMITE_LISTA).map((l, i) => `${i + 1}. ${l}`)
                    : ['No se encontraron imágenes.'];
                return responder.texto(
                    caja('🖼️', 'IMÁGENES', cuerpo, `Total detectadas: ${qb(info.imagenes.length)}`)
                );
            }

            if (modo === 'meta') {
                const claves = Object.keys(info.meta).slice(0, 30);
                const cuerpo = claves.length
                    ? claves.map(k => `*${k}:* ${info.meta[k].slice(0, 160)}`)
                    : ['Sin metadatos.'];
                return responder.texto(
                    caja('🏷️', 'METADATOS', cuerpo, `URL: ${data.urlFinal}`)
                );
            }

            if (modo === 'img') {
                const imagen = info.ogImagen || info.imagenes[0];
                if (!imagen) {
                    return responder.texto(caja('🖼️', 'SIN IMAGEN', ['No se encontró imagen principal.']));
                }
                return responder.imagen(
                    imagen,
                    caja('🖼️', 'IMAGEN PRINCIPAL', [info.titulo], data.urlFinal)
                );
            }

            const resumen = [
                `*Título:* ${info.ogTitulo || info.titulo}`,
                info.descripcion ? `*Desc:* ${info.descripcion.slice(0, 300)}` : null,
                '',
                `*Sitio:* ${url.hostname}`,
                `*Estado:* HTTP ${data.status} · ${qb(data.bytes)} bytes`,
                `*Links:* ${qb(info.links.length)} · *Imgs:* ${qb(info.imagenes.length)}`,
                info.canonical ? `*Canonical:* ${info.canonical}` : null,
                '',
                info.texto ? `*Vista previa:*\n${info.texto.slice(0, 600)}` : null
            ].filter(l => l !== null);

            const caption = caja('✅', 'RESULTADO', resumen, data.cache ? '📦 servido desde caché' : '🌐 petición en vivo');

            if (info.ogImagen) {
                try {
                    return await responder.imagen(info.ogImagen, caption);
                } catch {
                    /* fallback a texto */
                }
            }
            return responder.texto(caption);

        } catch (e) {
            const msg = e?.name === 'AbortError'
                ? '⏱️ El sitio tardó demasiado en responder (timeout).'
                : `Falló el scrape: ${e.message || e}`;
            return responder.texto(caja('❌', 'ERROR', [msg]));
        }
    }
};
