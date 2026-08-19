// ============================================================
// COMANDO: PLAY
// ALEX BOT
// YouTube → búsqueda → información → MP3
// Optimizado: envío directo desde URL
// ============================================================

const API_BASE = 'https://apiyosoyyo-ofc.onrender.com';

const API_KEY =
    process.env.YT_API_KEY ||
    'yosoyyo_sk_gincmnk3';

const API_SEARCH =
    `${API_BASE}/api/ytsearch`;

const API_YOUTUBE =
    `${API_BASE}/api/youtube/v2`;

const TIMEOUT_BUSQUEDA = 30000;
const TIMEOUT_MP3 = 30000;

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(
    url,
    opciones = {},
    timeout = 30000
) {
    const controller = new AbortController();

    const temporizador = setTimeout(
        () => controller.abort(),
        timeout
    );

    try {
        return await fetch(url, {
            ...opciones,
            signal: controller.signal
        });
    } finally {
        clearTimeout(temporizador);
    }
}

// ============================================================
// LIMPIAR TEXTO
// ============================================================

function limpiarTexto(texto = '') {
    return String(texto)
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// LIMPIAR NOMBRE
// ============================================================

function limpiarNombre(nombre = 'Alex Bot') {
    return String(nombre)
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'Alex Bot';
}

// ============================================================
// FORMATEAR VISTAS
// ============================================================

function formatearVistas(vistas) {
    const numero = Number(vistas);

    if (!Number.isFinite(numero)) {
        return 'No disponible';
    }

    if (numero >= 1000000000) {
        return `${(numero / 1000000000).toFixed(1)}B`;
    }

    if (numero >= 1000000) {
        return `${(numero / 1000000).toFixed(1)}M`;
    }

    if (numero >= 1000) {
        return `${(numero / 1000).toFixed(1)}K`;
    }

    return numero.toLocaleString('es-ES');
}

// ============================================================
// REACCIÓN
// ============================================================

async function reaccionar(
    sock,
    jid,
    key,
    emoji
) {
    try {
        await sock.sendMessage(
            jid,
            {
                react: {
                    text: emoji,
                    key
                }
            }
        );
    } catch {
        // No detener PLAY por una reacción.
    }
}

// ============================================================
// BUSCAR YOUTUBE
// ============================================================

async function buscarYouTube(consulta) {
    const parametros = new URLSearchParams({
        q: consulta,
        apiKey: API_KEY
    });

    const endpoint =
        `${API_SEARCH}?${parametros.toString()}`;

    console.log(
        `[PLAY] Buscando: ${consulta}`
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'AlexBot/1.0'
                }
            },
            TIMEOUT_BUSQUEDA
        );

    if (!respuesta.ok) {
        throw new Error(
            `La búsqueda respondió HTTP ${respuesta.status}`
        );
    }

    const datos =
        await respuesta.json();

    if (!datos?.status) {
        throw new Error(
            datos?.message ||
            'La API de búsqueda rechazó la solicitud.'
        );
    }

    const resultados =
        Array.isArray(datos.result)
            ? datos.result
            : [];

    if (!resultados.length) {
        throw new Error(
            'No encontré resultados para esa búsqueda.'
        );
    }

    const primero =
        resultados.find(
            item => item?.videoUrl
        );

    if (!primero?.videoUrl) {
        throw new Error(
            'El resultado no contiene una URL de YouTube válida.'
        );
    }

    console.log(
        `[PLAY] Resultado: ${primero.title}`
    );

    console.log(
        `[PLAY] URL: ${primero.videoUrl}`
    );

    return {
        titulo:
            limpiarTexto(
                primero.title ||
                'Alex Bot'
            ),

        videoUrl:
            primero.videoUrl,

        thumbnail:
            primero.thumbnailUrl ||
            null,

        canal:
            limpiarTexto(
                primero.channelName ||
                'No disponible'
            ),

        canalUrl:
            primero.channelUrl ||
            null,

        duracion:
            limpiarTexto(
                primero.duration ||
                'No disponible'
            ),

        vistas:
            primero.views,

        publicado:
            limpiarTexto(
                primero.publishedAgo ||
                'No disponible'
            )
    };
}

// ============================================================
// OBTENER ENLACE MP3
// ============================================================

async function obtenerMP3(videoUrl) {
    const parametros =
        new URLSearchParams({
            url: videoUrl,
            format: 'mp3',
            apiKey: API_KEY
        });

    const endpoint =
        `${API_YOUTUBE}?${parametros.toString()}`;

    console.log(
        '[PLAY] Solicitando MP3...'
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'AlexBot/1.0'
                }
            },
            TIMEOUT_MP3
        );

    if (!respuesta.ok) {
        throw new Error(
            `La API de MP3 respondió HTTP ${respuesta.status}`
        );
    }

    const datos =
        await respuesta.json();

    if (!datos?.status) {
        throw new Error(
            datos?.message ||
            'La API no pudo generar el MP3.'
        );
    }

    const resultados =
        datos?.result?.results;

    if (
        !Array.isArray(resultados) ||
        !resultados.length
    ) {
        throw new Error(
            'La API no devolvió archivos MP3.'
        );
    }

    const audio =
        resultados.find(
            item =>
                item?.type === 'audio' &&
                item?.download
        );

    if (!audio?.download) {
        throw new Error(
            'No encontré el enlace de descarga del MP3.'
        );
    }

    console.log(
        `[PLAY] MP3 listo: ${
            audio.title ||
            datos?.result?.title ||
            'Audio'
        }`
    );

    return {
        download: audio.download,

        titulo:
            audio.title ||
            datos?.result?.title ||
            'Alex Bot',

        calidad:
            audio.quality ||
            'Audio'
    };
}

// ============================================================
// INFORMACIÓN
// ============================================================

function crearInformacion(resultado) {
    return (
        '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
        '┃\n' +
        `┃ 🎵 *${resultado.titulo}*\n` +
        '┃\n' +
        `┃ 👤 Canal: ${resultado.canal}\n` +
        `┃ 👁️ Vistas: ${formatearVistas(resultado.vistas)}\n` +
        `┃ ⏱️ Duración: ${resultado.duracion}\n` +
        `┃ 📅 Publicado: ${resultado.publicado}\n` +
        '┃\n' +
        '┃ 🔗 *YouTube:*\n' +
        `┃ ${resultado.videoUrl}\n` +
        '┃\n' +
        '┃ 🎧 *Preparando MP3...*\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'play',

    categoria: 'Descargas',

    alias: [
        'yt',
        'yta',
        'ytmp3',
        'mp3'
    ],

    descripcion:
        'Busca una canción y la envía como MP3.',

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
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre de una canción.\n' +
                '┃\n' +
                '┃ 📌 Ejemplos:\n' +
                '┃ › .play Bad Bunny\n' +
                '┃ › .play Hola Remix\n' +
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
            `[PLAY] Consulta: ${consulta}`
        );

        await reaccionar(
            sock,
            jid,
            msg.key,
            '⏳'
        );

        try {

            // ------------------------------------------------
            // 1. BUSCAR
            // ------------------------------------------------

            const resultado =
                await buscarYouTube(
                    consulta
                );

            // ------------------------------------------------
            // 2. MOSTRAR INFORMACIÓN
            // ------------------------------------------------

            await responder.texto(
                crearInformacion(
                    resultado
                )
            );

            // ------------------------------------------------
            // 3. OBTENER URL MP3
            // ------------------------------------------------

            const mp3 =
                await obtenerMP3(
                    resultado.videoUrl
                );

            // ------------------------------------------------
            // 4. PREPARAR NOMBRE
            // ------------------------------------------------

            const titulo =
                limpiarNombre(
                    mp3.titulo ||
                    resultado.titulo
                );

            console.log(
                `[PLAY] Enlace MP3 obtenido`
            );

            console.log(
                `[PLAY] Enviando audio directamente desde URL`
            );

            // ------------------------------------------------
            // 5. ENVIAR DIRECTAMENTE
            // ------------------------------------------------

            await sock.sendMessage(
                jid,
                {
                    audio: {
                        url: mp3.download
                    },

                    mimetype:
                        'audio/mpeg',

                    fileName:
                        `${titulo}.mp3`,

                    ptt: false
                },
                {
                    quoted: msg,

                    mediaUploadTimeoutMs:
                        180000
                }
            );

            // ------------------------------------------------
            // 6. ÉXITO
            // ------------------------------------------------

            await reaccionar(
                sock,
                jid,
                msg.key,
                '✅'
            );

            console.log(
                `[PLAY] Audio enviado correctamente: ${titulo}`
            );

        } catch (error) {

            console.error(
                '[PLAY] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await reaccionar(
                sock,
                jid,
                msg.key,
                '❌'
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude enviar el audio.\n' +
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
