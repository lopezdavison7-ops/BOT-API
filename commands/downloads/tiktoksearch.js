// commands/downloads/tiktoksearch.js
// ============================================================
// BOT-API
// COMANDO: TT
// ============================================================
// Busca videos de TikTok.
//
// USO:
// .tt motos
// .tt nicaragua
// .tt futbol
//
// No necesita Playwright ni Chromium.
// Utiliza fetch, que ya está disponible en el proyecto.
// ============================================================

const API_URL =
    'https://www.tikwm.com/api/feed/search';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const MAX_RESULTS = 10;

// ============================================================
// LIMPIAR TEXTO
// ============================================================

function limpiarTexto(texto) {
    return String(texto || '')
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// OBTENER URL DEL VIDEO
// ============================================================

function obtenerUrlVideo(video) {
    if (video?.play) {
        return video.play;
    }

    if (video?.wmplay) {
        return video.wmplay;
    }

    if (
        video?.author?.unique_id &&
        video?.video_id
    ) {
        return (
            `https://www.tiktok.com/@` +
            `${video.author.unique_id}/video/` +
            `${video.video_id}`
        );
    }

    return null;
}

// ============================================================
// BUSCAR EN TIKTOK
// ============================================================

async function buscarTikTok(consulta) {
    const url =
        `${API_URL}?keywords=${encodeURIComponent(consulta)}` +
        `&count=${MAX_RESULTS}`;

    console.log(
        `[TT] Buscando: ${consulta}`
    );

    const response =
        await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 ' +
                    '(KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36',

                'Accept':
                    'application/json,text/plain,*/*'
            }
        });

    if (!response.ok) {
        throw new Error(
            `La API respondió ${response.status}`
        );
    }

    const json =
        await response.json();

    if (
        !json ||
        !Array.isArray(
            json?.data?.videos
        )
    ) {
        throw new Error(
            'La API no devolvió resultados válidos.'
        );
    }

    return json.data.videos;
}

// ============================================================
// CREAR MENSAJE
// ============================================================

function crearMensaje(
    consulta,
    videos
) {
    let texto =
        '╭━━〔 🔎 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n' +
        '┃\n' +
        `┃ 🔍 ${consulta}\n` +
        `┃ 📊 ${videos.length} resultados\n` +
        '┃\n';

    videos.forEach(
        (video, index) => {

            const titulo =
                limpiarTexto(
                    video?.title
                ) ||
                'Sin título';

            const usuario =
                video?.author?.unique_id ||
                video?.author?.nickname ||
                'desconocido';

            const videoId =
                video?.video_id ||
                '';

            const url =
                video?.share_url ||
                (
                    videoId
                        ? `https://www.tiktok.com/@${usuario}/video/${videoId}`
                        : obtenerUrlVideo(video)
                );

            texto +=
                `┃ ${index + 1}. ${titulo.slice(0, 120)}\n`;

            texto +=
                `┃ 👤 @${usuario}\n`;

            if (url) {
                texto +=
                    `┃ 🔗 ${url}\n`;
            }

            texto +=
                '┃\n';
        }
    );

    texto +=
        '╰━━━━━━━━━━━━━━━━⬣';

    return texto;
}

// ============================================================
// COMANDO
// ============================================================

export default {

    // IMPORTANTE:
    // Este es el nombre que aparecerá como .tt
    nombre: 'tt',

    categoria: 'descargas',

    alias: [
        'tiktoksearch',
        'ttsearch'
    ],

    descripcion:
        'Busca videos de TikTok.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento,
        args
    }) => {

        try {

            // =================================================
            // OBTENER CONSULTA
            // =================================================

            let consulta = '';

            if (
                Array.isArray(args) &&
                args.length
            ) {
                consulta =
                    args
                        .join(' ')
                        .trim();
            } else {
                consulta =
                    String(
                        argumento || ''
                    ).trim();
            }

            // =================================================
            // VALIDACIÓN
            // =================================================

            if (!consulta) {

                await responder.texto(
                    '╭━━〔 🔎 𝐓𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Escribe algo para buscar.\n' +
                    '┃\n' +
                    '┃ Ejemplos:\n' +
                    '┃ • *.tt motos*\n' +
                    '┃ • *.tt Nicaragua*\n' +
                    '┃ • *.tt futbol*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            if (consulta.length > 100) {

                await responder.texto(
                    '❌ La búsqueda no puede superar 100 caracteres.'
                );

                return;
            }

            // =================================================
            // AVISO
            // =================================================

            await responder.texto(
                '🔎 *Buscando en TikTok...*\n\n' +
                `🔍 ${consulta}\n` +
                '⏳ Espera un momento...'
            );

            // =================================================
            // BUSCAR
            // =================================================

            const videos =
                await buscarTikTok(
                    consulta
                );

            if (!videos.length) {

                await responder.texto(
                    '╭━━〔 🔎 𝐓𝐓 〕━━⬣\n' +
                    '┃\n' +
                    `┃ ❌ No encontré resultados para:\n` +
                    `┃ "${consulta}"\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // =================================================
            // TOMAR RESULTADOS
            // =================================================

            const resultados =
                videos.slice(
                    0,
                    MAX_RESULTS
                );

            // =================================================
            // ENVIAR
            // =================================================

            await responder.texto(
                crearMensaje(
                    consulta,
                    resultados
                )
            );

            console.log(
                `[TT] ✅ ${resultados.length} resultados enviados`
            );

        } catch (error) {

            console.error(
                '[TT] ❌ Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐓𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo realizar la búsqueda.\n' +
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