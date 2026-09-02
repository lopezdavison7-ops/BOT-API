// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST
// BOT-API
//
// Busca imágenes directamente desde Pinterest mediante scraping
// del HTML inicial de la página de búsqueda.
//
// Uso:
//   .pinterest anime
//   .pinterest gatos
//   .pin carros
//
// No depende de una API externa ni de API Keys.
// ============================================================

import axios from 'axios';

const PINTEREST_URL = 'https://www.pinterest.com/search/pins/';
const LIMITE_RESULTADOS = 10;
const TIMEOUT = 30000;

const HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
    'Accept':
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache'
};

// ============================================================
// LIMPIAR HTML / TEXTO
// ============================================================

function limpiarTexto(texto = '') {
    return String(texto)
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\\u002F/g, '/')
        .replace(/\\u003A/g, ':')
        .trim();
}

// ============================================================
// NORMALIZAR URL DE IMAGEN
// ============================================================

function normalizarImagen(url) {
    if (!url) return null;

    let imagen = limpiarTexto(url);

    // Pinterest suele entregar variantes 236x, 474x, 736x, etc.
    // Intentamos pedir la versión original cuando existe.
    imagen = imagen.replace(
        /\/\d+x\//,
        '/originals/'
    );

    return imagen;
}

// ============================================================
// EXTRAER IMÁGENES DEL HTML
// ============================================================

function extraerImagenes(html) {
    const encontrados = [];
    const vistas = new Set();

    // Captura URLs directas de pinimg.com que aparezcan en el HTML.
    const regex = /https?:\\?\/\\?\/[^"'\\s<>]+pinimg\.com[^"'\\s<>]+/gi;

    for (const match of html.matchAll(regex)) {
        let url = match[0]
            .replace(/\\\//g, '/')
            .replace(/\\u002F/gi, '/')
            .replace(/\\u003A/gi, ':')
            .replace(/&amp;/g, '&');

        // Quitar escapes/cierres que pueden quedar al capturar JSON.
        url = url.replace(/[\\"'\\]+$/g, '');

        if (!/^https?:\/\//i.test(url)) continue;
        if (!url.includes('pinimg.com')) continue;

        const imagen = normalizarImagen(url);
        if (!imagen || vistas.has(imagen)) continue;

        vistas.add(imagen);
        encontrados.push({
            url: imagen,
            alt: 'Imagen de Pinterest'
        });

        if (encontrados.length >= LIMITE_RESULTADOS) break;
    }

    // Segundo método: atributos src/srcset de etiquetas <img>.
    if (encontrados.length < LIMITE_RESULTADOS) {
        const imgRegex = /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*>/gi;

        for (const match of html.matchAll(imgRegex)) {
            let url = match[1]
                .replace(/\\\//g, '/')
                .replace(/\\u002F/gi, '/');

            if (!url.includes('pinimg.com')) continue;

            const imagen = normalizarImagen(url);
            if (!imagen || vistas.has(imagen)) continue;

            vistas.add(imagen);
            encontrados.push({
                url: imagen,
                alt: 'Imagen de Pinterest'
            });

            if (encontrados.length >= LIMITE_RESULTADOS) break;
        }
    }

    return encontrados;
}

// ============================================================
// SCRAPER PINTEREST
// ============================================================

async function scrapePinterest(consulta) {
    const url = `${PINTEREST_URL}?q=${encodeURIComponent(consulta)}`;

    console.log(`[PINTEREST] Scrapeando: ${url}`);

    const respuesta = await axios.get(url, {
        headers: HEADERS,
        timeout: TIMEOUT,
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400
    });

    if (!respuesta.data) {
        throw new Error('Pinterest devolvió una respuesta vacía.');
    }

    const resultados = extraerImagenes(String(respuesta.data));

    console.log(
        `[PINTEREST] Resultados encontrados: ${resultados.length}`
    );

    if (!resultados.length) {
        throw new Error(
            'Pinterest no entregó imágenes en el HTML inicial. Puede requerir contenido dinámico.'
        );
    }

    return resultados;
}

// ============================================================
// DESCARGAR IMAGEN
// ============================================================

async function descargarImagen(url, indice) {
    const respuesta = await axios.get(url, {
        headers: {
            ...HEADERS,
            Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*'
        },
        timeout: 60000,
        responseType: 'arraybuffer',
        validateStatus: status => status >= 200 && status < 400
    });

    const contentType =
        respuesta.headers['content-type'] || '';

    if (
        contentType &&
        !contentType.toLowerCase().startsWith('image/')
    ) {
        throw new Error(
            `La imagen ${indice} no devolvió contenido de imagen.`
        );
    }

    const buffer = Buffer.from(respuesta.data);

    if (!buffer.length) {
        throw new Error(`La imagen ${indice} está vacía.`);
    }

    return buffer;
}

// ============================================================
// ENVIAR IMÁGENES
// ============================================================

async function enviarResultados({
    sock,
    jid,
    msg,
    resultados,
    responder
}) {
    let enviadas = 0;

    for (let i = 0; i < resultados.length; i++) {
        try {
            console.log(
                `[PINTEREST] Descargando ${i + 1}/${resultados.length}`
            );

            const buffer = await descargarImagen(
                resultados[i].url,
                i + 1
            );

            await sock.sendMessage(
                jid,
                {
                    image: buffer,
                    caption:
                        `📌 *Pinterest Search*\n` +
                        `🔎 Resultado ${i + 1}/${resultados.length}\n\n` +
                        `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
                },
                {
                    quoted: msg
                }
            );

            enviadas++;
        } catch (error) {
            console.error(
                `[PINTEREST] Error en imagen ${i + 1}:`,
                error?.message || error
            );
        }
    }

    if (!enviadas) {
        await responder.texto(
            '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            '┃ No pude descargar las imágenes encontradas.\n' +
            '┃ Pinterest puede estar bloqueando las imágenes.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
        return 0;
    }

    return enviadas;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'pinterest',

    categoria: 'descargas',

    alias: [
        'pin',
        'pinterestimg',
        'pins'
    ],

    descripcion:
        'Busca imágenes en Pinterest mediante scraping.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {
        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *Escribe qué quieres buscar.*\n' +
                '┃\n' +
                '┃ 📌 *Ejemplos:*\n' +
                '┃ › .pinterest anime\n' +
                '┃ › .pinterest gatos\n' +
                '┃ › .pinterest carros\n' +
                '┃ › .pin fondos de pantalla\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const jid = msg?.key?.remoteJid;

        if (!jid) return;

        try {
            await responder.texto(
                '╭〔 🔎 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                `┃ 🔍 Buscando: *${consulta}*\n` +
                '┃ ⏳ Scrapeando Pinterest...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            const resultados = await scrapePinterest(consulta);

            await responder.texto(
                '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                `┃ 🔎 Búsqueda: *${consulta}*\n` +
                `┃ 🖼️ Resultados: *${resultados.length}*\n` +
                '┃ ⬇️ Enviando imágenes...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            const enviadas = await enviarResultados({
                sock,
                jid,
                msg,
                resultados,
                responder
            });

            if (enviadas > 0) {
                await responder.texto(
                    '╭〔 ✅ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                    '┃\n' +
                    `┃ 🖼️ Imágenes enviadas: *${enviadas}*\n` +
                    `┃ 🔎 Búsqueda: *${consulta}*\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }
        } catch (error) {
            console.error(
                '[COMANDO PINTEREST]',
                error?.response?.status || '',
                error?.message || error
            );

            await responder.texto(
                '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                `┃ No pude realizar la búsqueda de *${consulta}*.\n` +
                '┃\n' +
                '┃ ⚠️ Pinterest puede haber bloqueado\n' +
                '┃ el scraping o cambiado su HTML.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};
