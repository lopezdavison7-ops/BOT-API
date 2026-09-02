// commands/downloads/pinterest.js
// ============================================================
// BOT-API
// COMANDO: PINTEREST
// ============================================================
// Busca imágenes de Pinterest y las envía al chat.
// Compatible con la estructura ES Modules del BOT-API.
// ============================================================

import axios from 'axios';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const PINTEREST_URL =
'https://www.pinterest.com/search/pins/';

const LIMITE_RESULTADOS = 8;

const USER_AGENT =
'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
'(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// ============================================================
// BUSCAR IMÁGENES
// ============================================================

async function buscarPinterest(consulta) {

const respuesta = await axios.get(
    PINTEREST_URL,
    {
        params: {
            q: consulta
        },

        headers: {
            'User-Agent': USER_AGENT,
            'Accept':
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language':
                'es-ES,es;q=0.9,en;q=0.8',
            'Referer':
                'https://www.pinterest.com/'
        },

        timeout: 30000,

        responseType: 'text',

        maxRedirects: 5
    }
);

const html = respuesta.data;

const imagenes = new Set();

// --------------------------------------------------------
// Pinterest guarda las imágenes dentro del HTML/JSON.
// Buscamos directamente las URLs de pinimg.
// --------------------------------------------------------

const regex =
    /https?:\\?\/\\?\/i\.pinimg\.com\\?\/[^"'\\\s<>]+/gi;

const encontrados =
    html.match(regex) || [];

for (let url of encontrados) {

    url = url
        .replace(/\\u002F/g, '/')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
        .replace(/\\+"/g, '')
        .replace(/["']/g, '');

    if (!url.includes('i.pinimg.com')) {
        continue;
    }

    // Intentar utilizar una imagen de mayor resolución.
    url = url
        .replace('/236x/', '/originals/')
        .replace('/290x/', '/originals/')
        .replace('/474x/', '/originals/')
        .replace('/564x/', '/originals/')
        .replace('/600x/', '/originals/')
        .replace('/736x/', '/originals/')
        .replace('/750x/', '/originals/')
        .replace('/1200x/', '/originals/');

    imagenes.add(url);

    if (imagenes.size >= LIMITE_RESULTADOS) {
        break;
    }
}

return [...imagenes];

}

// ============================================================
// DESCARGAR IMAGEN
// ============================================================

async function descargarImagen(url) {

const respuesta = await axios.get(
    url,
    {
        responseType: 'arraybuffer',

        timeout: 60000,

        headers: {
            'User-Agent': USER_AGENT,

            'Accept':
                'image/avif,image/webp,image/apng,image/jpeg,image/png,*/*',

            'Referer':
                'https://www.pinterest.com/'
        },

        maxRedirects: 5
    }
);

const contentType =
    respuesta.headers['content-type'] || '';

if (
    !contentType.startsWith('image/')
) {
    throw new Error(
        'La URL no devolvió una imagen.'
    );
}

return Buffer.from(
    respuesta.data
);

}

// ============================================================
// COMANDO
// ============================================================

export default {

nombre: 'pinterest',

categoria: 'descargas',

alias: [
    'pin',
    'pinterestimg'
],

descripcion:
    'Busca y descarga imágenes de Pinterest.',

ejecutar: async ({
    sock,
    msg,
    responder,
    argumento
}) => {

    const jid =
        msg?.key?.remoteJid;

    const consulta =
        String(argumento || '')
            .trim();

    if (!jid) return;

    // ----------------------------------------------------
    // SIN BÚSQUEDA
    // ----------------------------------------------------

    if (!consulta) {

        return await responder.texto(
            '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            '┃ ❌ Escribe algo para buscar.\n' +
            '┃\n' +
            '┃ 📌 Ejemplos:\n' +
            '┃ › .pinterest anime\n' +
            '┃ › .pinterest gatos\n' +
            '┃ › .pinterest carros\n' +
            '┃ › .pin fondos de pantalla\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }

    try {

        await responder.texto(
            '╭〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            `┃ 🔎 Buscando: *${consulta}*\n` +
            '┃ ⏳ Espera un momento...\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );

        console.log(
            `[PINTEREST] Búsqueda: ${consulta}`
        );

        const imagenes =
            await buscarPinterest(
                consulta
            );

        if (!imagenes.length) {

            return await responder.texto(
                '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                '┃ No encontré imágenes.\n' +
                '┃\n' +
                '┃ Pinterest puede estar\n' +
                '┃ bloqueando la búsqueda.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        console.log(
            `[PINTEREST] Encontradas: ${imagenes.length}`
        );

        let enviadas = 0;

        // ------------------------------------------------
        // ENVIAR RESULTADOS
        // ------------------------------------------------

        for (
            let i = 0;
            i < imagenes.length;
            i++
        ) {

            try {

                const buffer =
                    await descargarImagen(
                        imagenes[i]
                    );

                await sock.sendMessage(
                    jid,
                    {
                        image: buffer,

                        caption:
                            `📌 *Pinterest*\n` +
                            `🔎 ${consulta}\n` +
                            `🖼️ ${i + 1}/${imagenes.length}`
                    },
                    {
                        quoted: msg
                    }
                );

                enviadas++;

            } catch (error) {

                console.error(
                    `[PINTEREST] Error imagen ${i + 1}:`,
                    error?.message
                );
            }
        }

        // ------------------------------------------------
        // NINGUNA IMAGEN DESCARGADA
        // ------------------------------------------------

        if (!enviadas) {

            return await responder.texto(
                '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
                '┃\n' +
                '┃ Encontré resultados, pero\n' +
                '┃ no pude descargar las imágenes.\n' +
                '┃\n' +
                '┃ Pinterest puede estar bloqueando\n' +
                '┃ las imágenes temporalmente.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        // ------------------------------------------------
        // RESULTADO FINAL
        // ------------------------------------------------

        await responder.texto(
            '╭〔 ✅ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            `┃ 🔎 *${consulta}*\n` +
            `┃ 🖼️ Descargadas: *${enviadas}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );

    } catch (error) {

        console.error(
            '[PINTEREST] Error:',
            error?.stack || error
        );

        await responder.texto(
            '╭〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕⬣\n' +
            '┃\n' +
            '┃ Ocurrió un error al buscar.\n' +
            `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
}

};