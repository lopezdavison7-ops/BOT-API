// ============================================================
// BOT-API
// COMANDO: PLAY
// ============================================================
// YouTube → búsqueda → portada → MP3
//
// Optimizado para:
// - API propia /api/ytsearch
// - API propia /api/youtube/v2
// - Envío directo mediante URL
// - Portada de la canción
// - Sin guardar archivos en disco
// - Baileys 7
// ============================================================

const API_BASE =
    'https://apiyosoyyo-ofc.onrender.com';

const API_KEY =
    process.env.YT_API_KEY ||
    'yosoyyo_sk_gincmnk3';

const API_SEARCH =
    `${API_BASE}/api/ytsearch`;

const API_YOUTUBE =
    `${API_BASE}/api/youtube/v2`;

// ============================================================
// CONFIGURACIÓN
// ============================================================

const TIMEOUT_SEARCH = 15000;
const TIMEOUT_DOWNLOAD = 25000;
const TIMEOUT_IMAGE = 10000;

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchTimeout(
    url,
    options = {},
    timeout = 15000
) {
    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {
        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal
            }
        );
    } finally {
        clearTimeout(timer);
    }
}

// ============================================================
// LIMPIAR TEXTO
// ============================================================

function cleanText(text = '') {
    return String(text)
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================
// LIMPIAR NOMBRE
// ============================================================

function cleanFileName(
    name = 'Alex Bot'
) {
    return String(name)
        .replace(
            /[\\/:*?"<>|]/g,
            ''
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim()
        .slice(0, 80) ||
        'Alex Bot';
}

// ============================================================
// FORMATEAR VISTAS
// ============================================================

function formatViews(
    views
) {
    const number =
        Number(views);

    if (
        !Number.isFinite(number)
    ) {
        return 'No disponible';
    }

    if (
        number >= 1000000000
    ) {
        return (
            `${(
                number / 1000000000
            ).toFixed(1)}B`
        );
    }

    if (
        number >= 1000000
    ) {
        return (
            `${(
                number / 1000000
            ).toFixed(1)}M`
        );
    }

    if (
        number >= 1000
    ) {
        return (
            `${(
                number / 1000
            ).toFixed(1)}K`
        );
    }

    return number.toLocaleString(
        'es-ES'
    );
}

// ============================================================
// REACCIÓN
// ============================================================

async function react(
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
        // Una reacción nunca debe detener PLAY.
    }
}

// ============================================================
// BUSCAR YOUTUBE
// ============================================================

async function searchYouTube(
    query
) {
    const params =
        new URLSearchParams({
            q: query,
            apiKey: API_KEY
        });

    const url =
        `${API_SEARCH}?${params}`;

    console.log(
        `[PLAY] 🔎 Buscando: ${query}`
    );

    const response =
        await fetchTimeout(
            url,
            {
                headers: {
                    Accept:
                        'application/json',
                    'User-Agent':
                        'BOT-API/2.0'
                }
            },
            TIMEOUT_SEARCH
        );

    if (!response.ok) {
        throw new Error(
            `Búsqueda HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    if (!data?.status) {
        throw new Error(
            data?.message ||
            'La API rechazó la búsqueda.'
        );
    }

    const results =
        Array.isArray(
            data.result
        )
            ? data.result
            : [];

    if (
        !results.length
    ) {
        throw new Error(
            'No encontré resultados.'
        );
    }

    const video =
        results.find(
            item =>
                item?.videoUrl
        );

    if (!video?.videoUrl) {
        throw new Error(
            'El resultado no contiene una URL válida.'
        );
    }

    console.log(
        `[PLAY] 🎵 ${video.title}`
    );

    return {
        title:
            cleanText(
                video.title ||
                'Alex Bot'
            ),

        videoUrl:
            video.videoUrl,

        thumbnail:
            video.thumbnailUrl ||
            video.thumbnail ||
            null,

        channel:
            cleanText(
                video.channelName ||
                'No disponible'
            ),

        duration:
            cleanText(
                video.duration ||
                'No disponible'
            ),

        views:
            video.views,

        published:
            cleanText(
                video.publishedAgo ||
                'No disponible'
            )
    };
}

// ============================================================
// OBTENER MP3
// ============================================================

async function getMP3(
    videoUrl
) {
    const params =
        new URLSearchParams({
            url: videoUrl,
            format: 'mp3',
            apiKey: API_KEY
        });

    const url =
        `${API_YOUTUBE}?${params}`;

    console.log(
        '[PLAY] ⚡ Solicitando MP3...'
    );

    const response =
        await fetchTimeout(
            url,
            {
                headers: {
                    Accept:
                        'application/json',
                    'User-Agent':
                        'BOT-API/2.0'
                }
            },
            TIMEOUT_DOWNLOAD
        );

    if (!response.ok) {
        throw new Error(
            `Descarga HTTP ${response.status}`
        );
    }

    const data =
        await response.json();

    if (!data?.status) {
        throw new Error(
            data?.message ||
            'La API no pudo generar el MP3.'
        );
    }

    const results =
        data?.result?.results;

    if (
        !Array.isArray(results) ||
        !results.length
    ) {
        throw new Error(
            'La API no devolvió formatos.'
        );
    }

    // --------------------------------------------------------
    // BUSCAR AUDIO
    // --------------------------------------------------------

    const audio =
        results.find(
            item =>
                item?.status !== false &&
                item?.type === 'audio' &&
                item?.extension === 'mp3' &&
                item?.download
        );

    if (!audio?.download) {
        throw new Error(
            'No encontré un MP3 disponible.'
        );
    }

    console.log(
        `[PLAY] ✅ MP3: ${audio.quality || 'Audio'}`
    );

    return {
        download:
            audio.download,

        title:
            cleanText(
                audio.title ||
                data?.result?.title ||
                'Alex Bot'
            ),

        quality:
            audio.quality ||
            'Audio',

        thumbnail:
            audio.thumbnail ||
            data?.result?.thumbnail ||
            null
    };
}

// ============================================================
// ENVIAR PORTADA
// ============================================================

async function sendThumbnail(
    sock,
    jid,
    thumbnail,
    title,
    msg
) {
    if (!thumbnail) {
        return false;
    }

    try {
        console.log(
            '[PLAY] 🖼️ Enviando portada...'
        );

        await sock.sendMessage(
            jid,
            {
                image: {
                    url: thumbnail
                },

                caption:
                    `🎵 *${title}*\n` +
                    `⚡ Calidad: MP3`
            },
            {
                quoted: msg
            }
        );

        return true;

    } catch (error) {

        console.warn(
            '[PLAY] ⚠️ No se pudo enviar la portada:',
            error?.message ||
            error
        );

        return false;
    }
}

// ============================================================
// INFORMACIÓN
// ============================================================

function createInfo(
    result
) {
    return (
        '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
        '┃\n' +
        `┃ 🎵 *${result.title}*\n` +
        '┃\n' +
        `┃ 👤 ${result.channel}\n` +
        `┃ 👁️ ${formatViews(result.views)} vistas\n` +
        `┃ ⏱️ ${result.duration}\n` +
        `┃ 📅 ${result.published}\n` +
        '┃\n' +
        '┃ ⚡ *Preparando audio...*\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// COMANDO PLAY
// ============================================================

export default {

    nombre:
        'play',

    categoria:
        'Descargas',

    alias: [
        'yt',
        'yta',
        'ytmp3',
        'mp3'
    ],

    descripcion:
        'Busca una canción, muestra su portada y la envía como MP3.',

    ejecutar:
        async ({
            sock,
            msg,
            responder,
            argumento
        }) => {

            const query =
                argumento?.trim();

            // ------------------------------------------------
            // SIN CONSULTA
            // ------------------------------------------------

            if (!query) {

                await responder.texto(
                    '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Escribe una canción.\n' +
                    '┃\n' +
                    '┃ 💿 Ejemplo:\n' +
                    '┃ › .play Hola Remix\n' +
                    '┃ › .play Bad Bunny\n' +
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
                `[PLAY] 🚀 Consulta: ${query}`
            );

            const start =
                Date.now();

            await react(
                sock,
                jid,
                msg.key,
                '⏳'
            );

            try {

                // =================================================
                // 1. BUSCAR
                // =================================================

                const youtube =
                    await searchYouTube(
                        query
                    );

                // =================================================
                // 2. OBTENER MP3
                // =================================================

                const mp3 =
                    await getMP3(
                        youtube.videoUrl
                    );

                // =================================================
                // 3. INFORMACIÓN
                // =================================================

                await responder.texto(
                    createInfo(
                        youtube
                    )
                );

                // =================================================
                // 4. PORTADA
                // =================================================

                const thumbnail =
                    mp3.thumbnail ||
                    youtube.thumbnail;

                await sendThumbnail(
                    sock,
                    jid,
                    thumbnail,
                    mp3.title ||
                    youtube.title,
                    msg
                );

                // =================================================
                // 5. NOMBRE
                // =================================================

                const filename =
                    cleanFileName(
                        mp3.title ||
                        youtube.title
                    );

                // =================================================
                // 6. AUDIO DIRECTO
                // =================================================

                console.log(
                    '[PLAY] ⚡ Enviando MP3 directamente desde URL...'
                );

                await sock.sendMessage(
                    jid,
                    {
                        audio: {
                            url:
                                mp3.download
                        },

                        mimetype:
                            'audio/mpeg',

                        fileName:
                            `${filename}.mp3`,

                        ptt: false
                    },
                    {
                        quoted:
                            msg,

                        mediaUploadTimeoutMs:
                            180000
                    }
                );

                // =================================================
                // 7. ÉXITO
                // =================================================

                const elapsed =
                    (
                        Date.now() -
                        start
                    ) / 1000;

                await react(
                    sock,
                    jid,
                    msg.key,
                    '✅'
                );

                console.log(
                    `[PLAY] ✅ Completado en ${elapsed.toFixed(2)}s`
                );

                console.log(
                    `[PLAY] 🎵 ${filename}`
                );

                console.log(
                    `[PLAY] 🔗 ${mp3.download}`
                );

                console.log(
                    '================================================'
                );

            } catch (error) {

                console.error(
                    '[PLAY] ❌ Error:',
                    error?.stack ||
                    error?.message ||
                    error
                );

                await react(
                    sock,
                    jid,
                    msg.key,
                    '❌'
                );

                await responder.texto(
                    '╭━━〔 ❌ 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No pude obtener el audio.\n' +
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