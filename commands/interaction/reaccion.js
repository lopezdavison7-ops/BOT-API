// ============================================================
// BOT-API
// COMANDO: REACCION
// ============================================================
// Reacciones GIF usando database/anime.json.
//
// Ejemplos:
// .hug
// .hug @usuario
// .hug respondiendo un mensaje
// .kiss @usuario
// .pat @usuario
//
// Compatible con:
// - Nueva estructura recursiva de comandos
// - Baileys 7
// - Node.js moderno
// ============================================================

import fs from 'fs';
import path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const ANIME_FILE = path.join(
    process.cwd(),
    'database',
    'anime.json'
);

// ============================================================
// COMANDOS DISPONIBLES
// ============================================================

const REACCIONES = [
    'hug',
    'kiss',
    'pat',
    'slap',
    'poke',
    'cuddle',
    'wave',
    'smile',
    'dance',
    'cry',
    'happy',
    'angry',
    'love',
    'bite',
    'blush',
    'highfive',
    'handhold',
    'feed',
    'bonk',
    'yeet',
    'wink',
    'stare',
    'tickle',
    'punch',
    'kill'
];

// ============================================================
// OBTENER COMANDO REAL
// ============================================================

function obtenerTipo(msg) {
    const texto =
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        '';

    if (!texto) {
        return 'hug';
    }

    const partes =
        texto
            .trim()
            .split(/\s+/);

    const comando =
        partes[0]
            ?.replace(/^\./, '')
            .toLowerCase();

    return comando || 'hug';
}

// ============================================================
// OBTENER AUTOR
// ============================================================

function obtenerAutor(msg) {
    const key =
        msg?.key || {};

    const candidatos = [
        key.participant,
        key.senderPn,
        key.participantAlt,
        key.remoteJid
    ];

    for (const candidato of candidatos) {
        if (!candidato) {
            continue;
        }

        const jid =
            String(candidato);

        if (jid.endsWith('@g.us')) {
            continue;
        }

        return jid;
    }

    return null;
}

// ============================================================
// OBTENER MENCIÓN
// ============================================================

function obtenerMencion(msg) {
    const contexto =
        msg?.message
            ?.extendedTextMessage
            ?.contextInfo;

    const mencionados =
        contexto?.mentionedJid || [];

    if (
        Array.isArray(mencionados) &&
        mencionados.length > 0
    ) {
        return mencionados[0];
    }

    return null;
}

// ============================================================
// OBTENER USUARIO RESPONDIDO
// ============================================================

function obtenerPersonaRespondida(msg) {
    const contexto =
        msg?.message
            ?.extendedTextMessage
            ?.contextInfo;

    if (!contexto?.quotedMessage) {
        return null;
    }

    return (
        contexto.participant ||
        contexto.participantAlt ||
        null
    );
}

// ============================================================
// NORMALIZAR JID
// ============================================================

function normalizarJid(jid) {
    if (!jid) {
        return null;
    }

    const texto =
        String(jid).trim();

    if (!texto) {
        return null;
    }

    return texto;
}

// ============================================================
// CREAR TEXTO DE MENCIÓN
// ============================================================

function crearMencion(jid) {
    const normalizado =
        normalizarJid(jid);

    if (!normalizado) {
        return null;
    }

    const numero =
        normalizado
            .split('@')[0]
            .split(':')[0]
            .replace(/[^0-9]/g, '');

    if (!numero) {
        return null;
    }

    return `@${numero}`;
}

// ============================================================
// NOMBRE BONITO DE LA ACCIÓN
// ============================================================

function obtenerAccion(tipo) {
    const acciones = {

        hug:
            'abraza a',

        kiss:
            'besa a',

        pat:
            'acaricia a',

        slap:
            'da una bofetada a',

        poke:
            'molesta a',

        cuddle:
            'se acurruca con',

        wave:
            'saluda a',

        smile:
            'sonríe a',

        dance:
            'baila con',

        cry:
            'llora con',

        happy:
            'se alegra con',

        angry:
            'se enoja con',

        love:
            'ama a',

        bite:
            'muerde a',

        blush:
            'se sonroja con',

        highfive:
            'choca la mano con',

        handhold:
            'toma de la mano a',

        feed:
            'alimenta a',

        bonk:
            'golpea suavemente a',

        yeet:
            'lanza a',

        wink:
            'le guiña el ojo a',

        stare:
            'mira a',

        tickle:
            'hace cosquillas a',

        punch:
            'golpea a',

        kill:
            'patea a'
    };

    return (
        acciones[tipo] ||
        'interactúa con'
    );
}

// ============================================================
// TEXTO SIN OBJETIVO
// ============================================================

function textoSinObjetivo(
    tipo,
    autorTexto
) {
    const mensajes = {

        hug:
            `${autorTexto} quiere dar muchos abrazos 🤗`,

        kiss:
            `${autorTexto} quiere dar muchos besos 😘`,

        pat:
            `${autorTexto} quiere dar muchas caricias 🥰`,

        wave:
            `${autorTexto} quiere saludar a todos 👋`,

        dance:
            `${autorTexto} quiere bailar 💃`,

        smile:
            `${autorTexto} está sonriendo 😄`,

        love:
            `${autorTexto} está repartiendo amor ❤️`
    };

    return (
        mensajes[tipo] ||
        `${autorTexto} quiere hacer una reacción 🎭`
    );
}

// ============================================================
// CARGAR ANIME.JSON
// ============================================================

function cargarAnime() {

    if (!fs.existsSync(ANIME_FILE)) {
        throw new Error(
            'El archivo database/anime.json no existe.'
        );
    }

    const contenido =
        fs.readFileSync(
            ANIME_FILE,
            'utf8'
        );

    if (!contenido.trim()) {
        throw new Error(
            'database/anime.json está vacío.'
        );
    }

    try {

        return JSON.parse(
            contenido
        );

    } catch {
        throw new Error(
            'database/anime.json contiene JSON inválido.'
        );
    }
}

// ============================================================
// OBTENER URL ALEATORIA
// ============================================================

function obtenerUrl(tipo) {

    const datos =
        cargarAnime();

    const reaccion =
        datos?.[tipo];

    if (
        !reaccion ||
        !Array.isArray(
            reaccion.videos
        ) ||
        reaccion.videos.length === 0
    ) {
        return null;
    }

    const videos =
        reaccion.videos.filter(
            url =>
                typeof url === 'string' &&
                url.startsWith('http')
        );

    if (!videos.length) {
        return null;
    }

    return (
        videos[
            Math.floor(
                Math.random() *
                videos.length
            )
        ]
    );
}

// ============================================================
// DESCARGAR GIF / VIDEO
// ============================================================

async function descargarGif(url) {

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            30000
        );

    try {

        const respuesta =
            await fetch(
                url,
                {
                    signal:
                        controller.signal,

                    headers: {
                        'User-Agent':
                            'BOT-API/1.0'
                    }
                }
            );

        if (!respuesta.ok) {
            throw new Error(
                `HTTP ${respuesta.status}`
            );
        }

        const arrayBuffer =
            await respuesta.arrayBuffer();

        return Buffer.from(
            arrayBuffer
        );

    } finally {

        clearTimeout(
            timeout
        );
    }
}

// ============================================================
// VALIDAR REACCIÓN
// ============================================================

function reaccionValida(tipo) {
    return REACCIONES.includes(
        tipo
    );
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'reaccion',

    categoria: 'Interacción',

    alias: REACCIONES,

    descripcion:
        'Reacciones GIF. Ejemplo: .hug, .kiss, .pat, etc.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const tipo =
            obtenerTipo(msg);

        // ----------------------------------------------------
        // VALIDAR COMANDO
        // ----------------------------------------------------

        if (!reaccionValida(tipo)) {

            await responder.texto(
                '❌ Reacción no disponible.\n\n' +
                '🎭 Reacciones disponibles:\n' +
                REACCIONES
                    .map(
                        reaccion =>
                            `› .${reaccion}`
                    )
                    .join('\n')
            );

            return;
        }

        try {

            console.log(
                `[REACCION] Ejecutando: .${tipo}`
            );

            // ------------------------------------------------
            // OBTENER URL
            // ------------------------------------------------

            const url =
                obtenerUrl(tipo);

            if (!url) {

                await responder.texto(
                    `❌ No encontré un GIF para la reacción *${tipo}*.`
                );

                return;
            }

            console.log(
                `[REACCION] URL: ${url}`
            );

            // ------------------------------------------------
            // DESCARGAR GIF
            // ------------------------------------------------

            const buffer =
                await descargarGif(
                    url
                );

            if (
                !buffer ||
                !buffer.length
            ) {
                throw new Error(
                    'El GIF descargado está vacío.'
                );
            }

            console.log(
                `[REACCION] Archivo descargado: ${buffer.length} bytes`
            );

            // ------------------------------------------------
            // OBTENER USUARIOS
            // ------------------------------------------------

            const autor =
                obtenerAutor(
                    msg
                );

            const mencionado =
                obtenerMencion(
                    msg
                );

            const respondido =
                obtenerPersonaRespondida(
                    msg
                );

            const objetivo =
                mencionado ||
                respondido ||
                null;

            // ------------------------------------------------
            // CREAR MENCIÓN DEL AUTOR
            // ------------------------------------------------

            const textoAutor =
                crearMencion(
                    autor
                ) ||
                '@usuario';

            // ------------------------------------------------
            // ARRAY DE MENCIONES
            // ------------------------------------------------

            const menciones = [];

            if (autor) {
                menciones.push(
                    autor
                );
            }

            if (
                objetivo &&
                !menciones.includes(
                    objetivo
                )
            ) {
                menciones.push(
                    objetivo
                );
            }

            // ------------------------------------------------
            // CREAR CAPTION
            // ------------------------------------------------

            let caption =
                `🎭 *${tipo.toUpperCase()}*\n\n`;

            if (objetivo) {

                const textoObjetivo =
                    crearMencion(
                        objetivo
                    );

                const accion =
                    obtenerAccion(
                        tipo
                    );

                if (
                    textoObjetivo
                ) {

                    caption +=
                        `💫 ${textoAutor} ${accion} ${textoObjetivo}`;

                } else {

                    caption +=
                        `💫 ${textoSinObjetivo(
                            tipo,
                            textoAutor
                        )}`;
                }

            } else {

                caption +=
                    `💫 ${textoSinObjetivo(
                        tipo,
                        textoAutor
                    )}`;
            }

            // ------------------------------------------------
            // ENVIAR GIF
            // ------------------------------------------------

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    video: buffer,

                    gifPlayback:
                        true,

                    caption,

                    mentions:
                        menciones
                },
                {
                    quoted:
                        msg
                }
            );

            // ------------------------------------------------
            // LOG
            // ------------------------------------------------

            console.log(
                `[REACCION] .${tipo} enviado correctamente.`
            );

        } catch (error) {

            console.error(
                '[REACCION] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                '╭━━〔 ❌ 𝐑𝐄𝐀𝐂𝐂𝐈Ó𝐍 〕━━⬣\n' +
                '┃\n' +
                `┃ No pude enviar *${tipo}*.\n` +
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