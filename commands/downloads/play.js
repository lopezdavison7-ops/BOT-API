// commands/downloads/play.js
// ============================================================
// BOT-API
// COMANDO: PLAY
// ============================================================
// YouTube → búsqueda → thumbnail → MP3
//
// Optimizado para:
// - Menos peticiones
// - Descarga mediante stream
// - Audios largos
// - Thumbnail de la API
// - Menos mensajes intermedios
// - Mayor tolerancia a errores de subida
// ============================================================

// Se carga aquí directamente (y no solo en index.js) para que
// este comando SIEMPRE tenga su API key sin importar cómo se
// arranque el proceso (node index.js, panel de hosting, pm2,
// etc.) ni el orden en que se importen los demás comandos.
import 'dotenv/config';
import config from '../../config.js';

const API_BASE =
    'https://apiyosoyyo-ofc.onrender.com';

const API_KEY =
    config.YT_API_KEY ||
    process.env.YT_API_KEY;

const API_SEARCH =
    `${API_BASE}/api/ytsearch`;

const API_YOUTUBE =
    `${API_BASE}/api/youtube/v2`;

const TIMEOUT_BUSQUEDA = 30000;
const TIMEOUT_API = 45000;

const MEDIA_TIMEOUT = 300000;

// ============================================================
// FETCH CON TIMEOUT
// ============================================================

async function fetchConTimeout(
    url,
    opciones = {},
    timeout = 30000
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
                signal:
                    controller.signal
            }
        );
    } finally {
        clearTimeout(
            temporizador
        );
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

function limpiarNombre(
    nombre = 'Alex Bot'
) {
    return String(nombre)
        .replace(
            /[\\/:*?"<>|]/g,
            ''
        )
        .replace(
            /\s+/g,
            ' '
        )
        .trim()
        .slice(0, 80)
        || 'Alex Bot';
}

// ============================================================
// FORMATEAR VISTAS
// ============================================================

function formatearVistas(
    vistas
) {
    const numero =
        Number(vistas);

    if (
        !Number.isFinite(numero)
    ) {
        return 'No disponible';
    }

    if (
        numero >= 1000000000
    ) {
        return `${(
            numero / 1000000000
        ).toFixed(1)}B`;
    }

    if (
        numero >= 1000000
    ) {
        return `${(
            numero / 1000000
        ).toFixed(1)}M`;
    }

    if (
        numero >= 1000
    ) {
        return `${(
            numero / 1000
        ).toFixed(1)}K`;
    }

    return numero.toLocaleString(
        'es-ES'
    );
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
        // Las reacciones nunca deben romper PLAY.
    }
}

// ============================================================
// BUSCAR YOUTUBE
// ============================================================

async function buscarYouTube(
    consulta
) {
    if (!API_KEY) {
        throw new Error(
            'YT_API_KEY no está configurada en el servidor.'
        );
    }

    const parametros =
        new URLSearchParams({
            q: consulta,
            apiKey: API_KEY
        });

    const endpoint =
        `${API_SEARCH}?${parametros}`;

    console.log(
        `[PLAY] 🔎 Buscando: ${consulta}`
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    Accept:
                        'application/json',
                    'User-Agent':
                        'BOT-API/2.0'
                }
            },
            TIMEOUT_BUSQUEDA
        );

    if (!respuesta.ok) {
        throw new Error(
            `Búsqueda HTTP ${respuesta.status}`
        );
    }

    const datos =
        await respuesta.json();

    if (!datos?.status) {
        throw new Error(
            datos?.message ||
            'La búsqueda fue rechazada.'
        );
    }

    const resultados =
        Array.isArray(
            datos.result
        )
            ? datos.result
            : [];

    const primero =
        resultados.find(
            item =>
                item?.videoUrl
        );

    if (!primero) {
        throw new Error(
            'No encontré resultados.'
        );
    }

    return {
        titulo:
            limpiarTexto(
                primero.title ||
                'Audio'
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
// OBTENER MP3
// ============================================================

async function obtenerMP3(
    videoUrl
) {
    if (!API_KEY) {
        throw new Error(
            'YT_API_KEY no está configurada.'
        );
    }

    const parametros =
        new URLSearchParams({
            url: videoUrl,
            format: 'mp3',
            apiKey: API_KEY
        });

    const endpoint =
        `${API_YOUTUBE}?${parametros}`;

    console.log(
        '[PLAY] ⚡ Solicitando MP3...'
    );

    const respuesta =
        await fetchConTimeout(
            endpoint,
            {
                headers: {
                    Accept:
                        'application/json',
                    'User-Agent':
                        'BOT-API/2.0'
                }
            },
            TIMEOUT_API
        );

    if (!respuesta.ok) {
        throw new Error(
            `API YouTube HTTP ${respuesta.status}`
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
        !Array.isArray(resultados)
    ) {
        throw new Error(
            'La API no devolvió formatos.'
        );
    }

    // --------------------------------------------------------
    // PRIORIZAR 128KBPS
    // --------------------------------------------------------

    const audios =
        resultados.filter(
            item =>
                item?.type === 'audio' &&
                item?.download
        );

    if (!audios.length) {
        throw new Error(
            'La API no devolvió un MP3.'
        );
    }

    const audio =
        audios.find(
            item =>
                String(
                    item.quality
                ).toLowerCase()
                === '128kbps'
        ) ||
        audios[0];

    console.log(
        `[PLAY] 🎧 Audio: ${
            audio.quality ||
            'MP3'
        }`
    );

    return {
        download:
            audio.download,

        titulo:
            audio.title ||
            datos?.result?.title ||
            'Audio',

        calidad:
            audio.quality ||
            'MP3',

        thumbnail:
            audio.thumbnail ||
            datos?.result?.thumbnail ||
            null
    };
}

// ============================================================
// OBTENER STREAM DEL MP3
// ============================================================

async function obtenerStream(
    url
) {
    console.log(
        '[PLAY] 🚀 Abriendo stream del MP3...'
    );

    const respuesta =
        await fetchConTimeout(
            url,
            {
                headers: {
                    Accept:
                        'audio/mpeg,*/*',
                    'User-Agent':
                        'BOT-API/2.0'
                }
            },
            MEDIA_TIMEOUT
        );

    if (!respuesta.ok) {
        throw new Error(
            `Servidor MP3 HTTP ${respuesta.status}`
        );
    }

    if (!respuesta.body) {
        throw new Error(
            'El servidor MP3 no devolvió un stream.'
        );
    }

    return respuesta.body;
}

// ============================================================
// DESCARGAR THUMBNAIL
// ============================================================

async function obtenerThumbnail(
    url
) {
    if (!url) {
        return null;
    }

    try {
        const respuesta =
            await fetchConTimeout(
                url,
                {
                    headers: {
                        'User-Agent':
                            'BOT-API/2.0'
                    }
                },
                15000
            );

        if (!respuesta.ok) {
            return null;
        }

        const arrayBuffer =
            await respuesta.arrayBuffer();

        return Buffer.from(
            arrayBuffer
        );

    } catch {
        return null;
    }
}

// ============================================================
// INFORMACIÓN
// ============================================================

function crearInformacion(
    resultado
) {
    return (
        '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
        '┃\n' +
        `┃ 🎵 *${resultado.titulo}*\n` +
        '┃\n' +
        `┃ 👤 ${resultado.canal}\n` +
        `┃ 👁️ ${formatearVistas(resultado.vistas)} vistas\n` +
        `┃ ⏱️ ${resultado.duracion}\n` +
        `┃ 📅 ${resultado.publicado}\n` +
        '┃\n' +
        '┃ ⚡ *Enviando audio...*\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// COMANDO PLAY
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
                '┃ ❌ Escribe una canción.\n' +
                '┃\n' +
                '┃ Ejemplo:\n' +
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
            `[PLAY] 🎵 ${consulta}`
        );

        await reaccionar(
            sock,
            jid,
            msg.key,
            '⏳'
        );

        try {

            // =================================================
            // 1. BÚSQUEDA
            // =================================================

            const resultado =
                await buscarYouTube(
                    consulta
                );

            // =================================================
            // 2. PEDIR MP3 + THUMBNAIL EN PARALELO
            // =================================================
            // Ambas peticiones son independientes entre sí, así
            // que se lanzan al mismo tiempo en vez de una
            // detrás de la otra.
            // =================================================

            const promesaThumbnail =
                obtenerThumbnail(
                    resultado.thumbnail
                );

            const promesaMp3 =
                obtenerMP3(
                    resultado.videoUrl
                );

            // =================================================
            // 3. ENVIAR FOTO + TÍTULO + INFO (un solo mensaje)
            // =================================================
            // Se manda en cuanto el thumbnail está listo, sin
            // esperar al MP3 (que sigue trabajando en paralelo
            // por debajo).
            // =================================================

            let thumbnail =
                await promesaThumbnail;

            if (thumbnail) {

                await responder.imagen(
                    thumbnail,
                    crearInformacion(
                        resultado
                    )
                );

            } else {

                // Sin miniatura disponible: se manda solo texto
                // como respaldo, para no perder la información.
                await responder.texto(
                    crearInformacion(
                        resultado
                    )
                );

            }

            // =================================================
            // 4. ESPERAR EL MP3
            // =================================================
            // Como ya venía trabajando en paralelo desde el
            // paso 2, para cuando la foto terminó de enviarse
            // normalmente ya avanzó bastante o está listo.
            // =================================================

            const mp3 =
                await promesaMp3;

            // Si no había thumbnail en la búsqueda pero el
            // MP3 trae uno propio y distinto, se intenta ese
            // como último recurso (no bloquea el audio si falla).
            if (
                !thumbnail &&
                mp3.thumbnail &&
                mp3.thumbnail !== resultado.thumbnail
            ) {

                thumbnail =
                    await obtenerThumbnail(
                        mp3.thumbnail
                    );

            }

            // =================================================
            // 5. STREAM
            // =================================================

            const stream =
                await obtenerStream(
                    mp3.download
                );

            const titulo =
                limpiarNombre(
                    mp3.titulo ||
                    resultado.titulo
                );

            console.log(
                `[PLAY] 📤 Enviando: ${titulo}`
            );

            // =================================================
            // 6. ENVIAR AUDIO
            // =================================================

            const contenido = {

                audio: {
                    stream
                },

                mimetype:
                    'audio/mpeg',

                fileName:
                    `${titulo}.mp3`,

                ptt: false
            };

            // Thumbnail opcional
            // No bloqueamos el audio si falla.

            if (thumbnail) {
                contenido.jpegThumbnail =
                    thumbnail;
            }

            await sock.sendMessage(
                jid,
                contenido,
                {
                    quoted: msg,

                    mediaUploadTimeoutMs:
                        MEDIA_TIMEOUT,

                    waitForAck:
                        false
                }
            );

            // =================================================
            // 7. ÉXITO
            // =================================================

            await reaccionar(
                sock,
                jid,
                msg.key,
                '✅'
            );

            console.log(
                `[PLAY] ✅ Audio enviado: ${titulo}`
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

            await reaccionar(
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