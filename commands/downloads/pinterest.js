// commands/downloads/pinterest.js
// ============================================================
// BOT-API
// COMANDO: PINTEREST
// ============================================================
// Usa un descargador web externo para resolver Pins públicos,
// evitando hacer la búsqueda directamente contra Pinterest.
// ============================================================

import axios from 'axios';
import * as cheerio from 'cheerio';

const DOWNLOADER_URL = 'https://pinsavepro.com/image-downloader';
const LIMITE_RESULTADOS = 8;
const TIMEOUT = 30000;

async function obtenerImagen(url) {
    const respuesta = await axios.get(url, {
        headers: {
            'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36',
            Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        timeout: TIMEOUT,
        maxRedirects: 5
    });

    const $ = cheerio.load(respuesta.data);

    const urls = new Set();

    $('img').each((_, elemento) => {
        const src =
            $(elemento).attr('src') ||
            $(elemento).attr('data-src') ||
            $(elemento).attr('data-lazy-src');

        if (
            src &&
            (
                src.includes('pinimg.com') ||
                src.startsWith('https://')
            )
        ) {
            urls.add(src);
        }
    });

    $('a').each((_, elemento) => {
        const href = $(elemento).attr('href');

        if (
            href &&
            (
                href.includes('pinimg.com') ||
                /\.(jpg|jpeg|png|webp)(\?|$)/i.test(href)
            )
        ) {
            urls.add(href);
        }
    });

    const imagenes = [...urls]
        .filter(url => /^https?:\/\//i.test(url))
        .slice(0, LIMITE_RESULTADOS);

    return imagenes;
}

async function descargar(url) {
    const respuesta = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxRedirects: 5,
        headers: {
            'User-Agent': 'Mozilla/5.0',
            Referer: DOWNLOADER_URL,
            Accept: 'image/avif,image/webp,image/jpeg,image/png,*/*'
        }
    });

    const tipo =
        respuesta.headers['content-type'] || '';

    if (!tipo.startsWith('image/')) {
        throw new Error('El resultado no es una imagen.');
    }

    return Buffer.from(respuesta.data);
}

export default {
    nombre: 'pinterest',
    categoria: 'descargas',
    alias: ['pin'],
    descripcion: 'Descarga imágenes de Pins públicos',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {
        const jid = msg?.key?.remoteJid;
        const consulta = argumento?.trim();

        if (!jid) return;

        if (!consulta) {
            return await responder.texto(
                '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe una búsqueda o un\n' +
                '┃ enlace de Pinterest.\n' +
                '┃\n' +
                '┃ Ejemplo:\n' +
                '┃ › .pinterest anime\n' +
                '┃ › .pinterest gatos\n' +
                '┃ › .pinterest https://pin.it/...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        try {
            await responder.texto(
                '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                '┃ ⏳ Procesando...\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            let pinUrl = consulta;

            if (!/^https?:\/\//i.test(pinUrl)) {
                pinUrl =
                    `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(consulta)}`;
            }

            const imagenes =
                await obtenerImagen(pinUrl);

            if (!imagenes.length) {
                return await responder.texto(
                    '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                    '┃\n' +
                    '┃ No se encontraron imágenes.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            let enviadas = 0;

            for (let i = 0; i < imagenes.length; i++) {
                try {
                    const buffer =
                        await descargar(imagenes[i]);

                    await sock.sendMessage(
                        jid,
                        {
                            image: buffer,
                            caption:
                                `📌 *Pinterest*\n` +
                                `🖼️ ${i + 1}/${imagenes.length}`
                        },
                        { quoted: msg }
                    );

                    enviadas++;
                } catch (error) {
                    console.error(
                        `[PINTEREST] Imagen ${i + 1}:`,
                        error.message
                    );
                }
            }

            if (!enviadas) {
                throw new Error(
                    'El descargador no devolvió una imagen utilizable.'
                );
            }

            await responder.texto(
                '╭〔 ✅ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                `┃ 🖼️ Resultados enviados: *${enviadas}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        } catch (error) {
            console.error(
                '[PINTEREST]',
                error.stack || error.message
            );

            await responder.texto(
                '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                `┃ ${error.message || 'No se pudo completar la descarga.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};
```0