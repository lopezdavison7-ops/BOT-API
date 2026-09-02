 commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST
// BOT-API
//
// Busca Pins públicos en Pinterest y descarga las imágenes
// mediante un extractor externo de medios. Esto evita depender
// de descargar directamente desde i.pinimg.com, que puede
// rechazar algunas peticiones del bot.
//
// Uso:
//   .pinterest anime
//   .pinterest gatos
//   .pin carros
//
// También acepta una URL directa de Pinterest/pin.it.
// ============================================================

const PINTEREST_SEARCH = 'https://www.pinterest.com/search/pins/';
const MEDIA_RESOLVER = 'https://pin.vinayop.cloud/v1/pin/img';

const MAX_RESULTS = 8;
const SEARCH_TIMEOUT = 30000;
const DOWNLOAD_TIMEOUT = 60000;
const CAPTION = '📌 Pinterest • BOT-API 💙';

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchTimeout(url, options = {}, timeout = SEARCH_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        return await fetch(url, {
            ...options,
            redirect: 'follow',
            signal: controller.signal
        });
    } finally {
        clearTimeout(timer);
    }
}

// ============================================================
// TEXTO
// ============================================================

function limpiar(texto) {
    return String(texto ?? '')
        .replace(/\\u002F/g, '/')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
        .trim();
}

function esPinterestUrl(url) {
    try {
        const u = new URL(url);
        return /(^|\\.)pinterest\\.(com|ca|co|cl|mx|es|fr|de|it|jp|kr|pt|uk)$/i.test(u.hostname) ||
            u.hostname === 'pin.it';
    } catch {
        return false;
    }
}

// ============================================================
// EXTRAER URLS DE PINS DEL HTML DE PINTEREST
// ============================================================

function extraerPins(html) {
    const encontrados = new Set();

    const patrones = [
        /https?:\/\/(?:www\.)?pinterest\.com\/pin\/(\d+)/gi,
        /https?:\/\/(?:[a-z]{2}\.)?pinterest\.com\/pin\/(\d+)/gi,
        /href=["'](?:https?:\/\/(?:www\.)?pinterest\.com)?\/pin\/(\d+)[^"']*["']/gi,
        /["']\/pin\/(\d+)[^"']*["']/gi
    ];

    for (const regex of patrones) {
        let match;
        while ((match = regex.exec(html)) !== null) {
            const id = match[match.length - 1];
            if (/^\\d{6,}$/.test(id)) {
                encontrados.add(`https://www.pinterest.com/pin/${id}/`);
            }
        }
    }

    return [...encontrados].slice(0, MAX_RESULTS);
}

// ============================================================
// BUSCAR EN PINTEREST
// ============================================================

async function buscarPins(consulta) {
    const url = new URL(PINTEREST_SEARCH);
    url.searchParams.set('q', consulta);

    console.log(`[PINTEREST] Buscando: ${consulta}`);

    const respuesta = await fetchTimeout(
        url.toString(),
        {
            headers: {
                Accept: 'text/html,application/xhtml+xml',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/131.0.0.0 Safari/537.36'
            }
        },
        SEARCH_TIMEOUT
    );

    if (!respuesta.ok) {
        throw new Error(`Pinterest respondió HTTP ${respuesta.status}.`);
    }

    const html = await respuesta.text();
    const pins = extraerPins(html);

    console.log(`[PINTEREST] Pins encontrados: ${pins.length}`);

    if (!pins.length) {
        throw new Error(
            'Pinterest no entregó Pins en el HTML inicial. Intenta otra búsqueda.'
        );
    }

    return pins;
}

// ============================================================
// RESOLVER / DESCARGAR IMAGEN
// ============================================================

async function descargarDesdeResolver(pinUrl, indice) {
    const endpoint = new URL(MEDIA_RESOLVER);
    endpoint.searchParams.set('url', pinUrl);

    console.log(`[PINTEREST] Resolviendo imagen ${indice}: ${pinUrl}`);

    const respuesta = await fetchTimeout(
        endpoint.toString(),
        {
            headers: {
                Accept: 'image/avif,image/webp,image/jpeg,image/png,application/json,*/*',
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
                    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
                    'Chrome/131.0.0.0 Safari/537.36'
            }
        },
        DOWNLOAD_TIMEOUT
    );

    if (!respuesta.ok) {
        throw new Error(`Resolver HTTP ${respuesta.status}.`);
    }

    const contentType =
        (respuesta.headers.get('content-type') || '').toLowerCase();

    // Algunos resolvers devuelven directamente la imagen.
    if (contentType.startsWith('image/')) {
        const buffer = Buffer.from(await respuesta.arrayBuffer());
        if (!buffer.length) throw new Error('La imagen está vacía.');
        return { buffer, contentType };
    }

    // Compatibilidad por si el resolver devuelve JSON con una URL.
    if (contentType.includes('application/json')) {
        const data = await respuesta.json();
        const mediaUrl =
            data?.url ||
            data?.image ||
            data?.download ||
            data?.downloadUrl ||
            data?.result?.url;

        if (!mediaUrl) {
            throw new Error('El resolver no devolvió una URL de imagen.');
        }

        const imagen = await fetchTimeout(
            mediaUrl,
            {
                headers: {
                    Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*',
                    'User-Agent': 'Mozilla/5.0'
                }
            },
            DOWNLOAD_TIMEOUT
        );

        if (!imagen.ok) {
            throw new Error(`La imagen respondió HTTP ${imagen.status}.`);
        }

        const tipo = (imagen.headers.get('content-type') || '').toLowerCase();
        if (!tipo.startsWith('image/')) {
            throw new Error('La URL resuelta no devolvió una imagen.');
        }

        const buffer = Buffer.from(await imagen.arrayBuffer());
        if (!buffer.length) throw new Error('La imagen está vacía.');

        return { buffer, contentType: tipo };
    }

    throw new Error(
        `El resolver devolvió un contenido inesperado: ${contentType || 'desconocido'}.`
    );
}

// ============================================================
// ENVIAR IMÁGENES
// ============================================================

async function enviarResultados(sock, jid, msg, pins) {
    const resultados = await Promise.allSettled(
        pins.map((pin, i) => descargarDesdeResolver(pin, i + 1))
    );

    let enviadas = 0;

    for (let i = 0; i < resultados.length; i++) {
        const resultado = resultados[i];

        if (resultado.status !== 'fulfilled') {
            console.error(
                `[PINTEREST] Falló ${i + 1}/${pins.length}:`,
                resultado.reason?.message || resultado.reason
            );
            continue;
        }

        try {
            await sock.sendMessage(
                jid,
                {
                    image: resultado.value.buffer,
                    caption: CAPTION
                },
                { quoted: msg }
            );

            enviadas++;
        } catch (error) {
            console.error(
                `[PINTEREST] Error enviando ${i + 1}:`,
                error?.message || error
            );
        }
    }

    return enviadas;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin', 'pinterestimg'],
    descripcion: 'Busca y descarga imágenes públicas de Pinterest.',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const consulta = argumento?.trim();
        const jid = msg?.key?.remoteJid;

        if (!jid) return;

        if (!consulta) {
            await responder.texto(
                '╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres buscar.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .pinterest anime\n' +
                '┃ › .pinterest gatos\n' +
                '┃ › .pinterest carros\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        try {
            await responder.texto(
                `📌 *Pinterest*\n\n🔎 Buscando: *${consulta}*\n⏳ Extrayendo imágenes...`
            );

            let pins;

            // Si el usuario pasa un Pin directamente, no hacemos búsqueda.
            if (esPinterestUrl(consulta)) {
                pins = [consulta];
            } else {
                pins = await buscarPins(consulta);
            }

            const enviadas = await enviarResultados(
                sock,
                jid,
                msg,
                pins
            );

            if (!enviadas) {
                throw new Error(
                    'No pude descargar las imágenes encontradas. El extractor externo no devolvió medios válidos.'
                );
            }

            await responder.texto(
                '╭━━〔 ✅ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                `┃ 🔎 Búsqueda: *${consulta}*\n` +
                `┃ 🖼️ Enviadas: *${enviadas}/${pins.length}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        } catch (error) {
            console.error(
                '[PINTEREST] Error:',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                `┃ ${error?.message || 'No pude completar la búsqueda.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};
