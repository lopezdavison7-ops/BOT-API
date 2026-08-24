// commands/downloads/pinterest.js
// ============================================================
// COMANDO: PINTEREST
// BOT-API
//
// Busca imágenes en Pinterest y las envía directamente.
// No usa sendAlbumMessage(), para mayor compatibilidad.
// Las imágenes se envían sin mostrar URLs.
// ============================================================

import config from '../../config.js';

const API_BASE =
    'https://apiyosoyyo-ofc.onrender.com';

const API_KEY =
    config.YO_SOY_YO_API_KEY ||
    config.YT_API_KEY ||
    process.env.YO_SOY_YO_API_KEY ||
    process.env.YT_API_KEY;

const API_PINTEREST =
    `${API_BASE}/api/pinterest`;

const TIMEOUT_API = 30000;

// Cantidad máxima de imágenes que enviará el comando.
const LIMITE_RESULTADOS = 10;

const CAPTION = 'BOT-API 👄😍';

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(
    url,
    opciones = {},
    timeout = TIMEOUT_API
) {
    const controller =
        new AbortController();

    const temporizador =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {
        return await fetch(
            url,
            {
                ...opciones,
                signal: controller.signal
            }
        );
    } finally {
        clearTimeout(temporizador);
    }
}

// ============================================================
// LIMPIAR TEXTO
// ============================================================

function limpiarTexto(
    texto,
    fallback = ''
) {
    if (
        texto === null ||
        texto === undefined
    ) {
        return fallback;
    }

    return String(texto)
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// BUSCAR PINTEREST
// ============================================================

async function buscarPinterest(
    consulta
) {
    const parametros =
        new URLSearchParams({
            q: consulta,
            limite:
                String(LIMITE_RESULTADOS),
            apiKey: API_KEY
        });

    const endpoint =
        `${API_PINTEREST}?${parametros.toString()}`;

    console.log(
        `[PINTEREST] Buscando: ${consulta}`
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    Accept:
                        'application/json',
                    'User-Agent':
                        'BOT-API/1.0'
                }
            }
        );

    console.log(
        `[PINTEREST] HTTP: ${respuesta.status}`
    );

    if (!respuesta.ok) {
        throw new Error(
            `La API respondió HTTP ${respuesta.status}`
        );
    }

    const datos =
        await respuesta.json();

    if (!datos?.status) {
        throw new Error(
            datos?.message ||
            'La API rechazó la búsqueda.'
        );
    }

    let resultados = [];

    if (
        Array.isArray(
            datos.result
        )
    ) {
        resultados =
            datos.result;
    } else if (
        Array.isArray(
            datos?.result?.data
        )
    ) {
        resultados =
            datos.result.data;
    }

    const imagenes =
        resultados
            .filter(
                item =>
                    item &&
                    item.descarga
            )
            .slice(
                0,
                LIMITE_RESULTADOS
            );

    if (
        imagenes.length === 0
    ) {
        throw new Error(
            'No encontré imágenes para esa búsqueda.'
        );
    }

    console.log(
        `[PINTEREST] Imágenes válidas: ${imagenes.length}`
    );

    return imagenes;
}

// ============================================================
// ENVIAR IMAGEN
// ============================================================

async function enviarImagen(
    sock,
    jid,
    url,
    msg,
    indice,
    total
) {
    console.log(
        `[PINTEREST] Descargando imagen ${indice}/${total}`
    );

    const respuesta =
        await fetchConTimeout(
            url,
            {
                headers: {
                    Accept:
                        'image/avif,image/webp,image/jpeg,image/png,*/*',
                    'User-Agent':
                        'Mozilla/5.0'
                }
            },
            60000
        );

    if (!respuesta.ok) {
        throw new Error(
            `HTTP ${respuesta.status} al descargar imagen ${indice}`
        );
    }

    const tipo =
        respuesta.headers
            .get('content-type') ||
        'image/jpeg';

    if (
        !tipo.startsWith('image/')
    ) {
        throw new Error(
            `La URL ${indice} no devolvió una imagen.`
        );
    }

    const arrayBuffer =
        await respuesta.arrayBuffer();

    const buffer =
        Buffer.from(arrayBuffer);

    if (!buffer.length) {
        throw new Error(
            `La imagen ${indice} está vacía.`
        );
    }

    console.log(
        `[PINTEREST] Imagen ${indice}: ${buffer.length} bytes`
    );

    await sock.sendMessage(
        jid,
        {
            image: buffer,
            caption: CAPTION
        },
        {
            quoted: msg
        }
    );

    console.log(
        `[PINTEREST] Imagen ${indice}/${total} enviada`
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
        'Busca imágenes en Pinterest y las envía.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const consulta =
            argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭━━〔 📌 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué quieres buscar.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .pinterest zhao lusi\n' +
                '┃ › .pinterest anime\n' +
                '┃ › .pinterest gatos\n' +
                '┃ › .pinterest carros 4x4\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;
        }

        const jid =
            msg?.key?.remoteJid;

        if (!jid) {
            return;
        }

        console.log(
            '================================================'
        );

        console.log(
            `[PINTEREST] Consulta: ${consulta}`
        );

        try {

            // ------------------------------------------------
            // BUSCAR
            // ------------------------------------------------

            const resultados =
                await buscarPinterest(
                    consulta
                );

            // ------------------------------------------------
            // AVISO
            // ------------------------------------------------

            await responder.texto(
                '📌 *Pinterest*\n\n' +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Imágenes: *${resultados.length}*\n\n` +
                '⏳ Enviando imágenes...'
            );

            // ------------------------------------------------
            // ENVIAR IMÁGENES
            // ------------------------------------------------

            let enviadas = 0;

            for (
                let i = 0;
                i < resultados.length;
                i++
            ) {

                try {

                    await enviarImagen(
                        sock,
                        jid,
                        resultados[i].descarga,
                        msg,
                        i + 1,
                        resultados.length
                    );

                    enviadas++;

                } catch (error) {

                    console.error(
                        `[PINTEREST] Error imagen ${i + 1}:`,
                        error?.message ||
                        error
                    );
                }
            }

            // ------------------------------------------------
            // RESULTADO FINAL
            // ------------------------------------------------

            if (enviadas === 0) {

                throw new Error(
                    'No pude enviar ninguna imagen.'
                );
            }

            console.log(
                `[PINTEREST] Finalizado: ${enviadas}/${resultados.length}`
            );

            await responder.texto(
                `✅ *Pinterest terminado*\n\n` +
                `🔎 Búsqueda: *${consulta}*\n` +
                `🖼️ Enviadas: *${enviadas}/${resultados.length}*\n\n` +
                `${CAPTION}`
            );

        } catch (error) {

            console.error(
                '[PINTEREST] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐈𝐍𝐓𝐄𝐑𝐄𝐒𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude completar la búsqueda.\n' +
                '┃\n' +
                `┃ ⚠️ ${
                    error?.message ||
                    'Error desconocido.'
                }\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};