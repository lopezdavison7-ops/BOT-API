// ============================================================
// COMANDO: REACCIONES
// ALEX BOT
//
// Ejemplos:
//
// .hug @usuario
// .kiss @usuario
// Responder mensaje + .hug
// Responder mensaje + .kiss
//
// Resultado:
//
// 💫 @Luis abraza @Alex
//
// Si no hay objetivo:
//
// 💫 @Luis quiere dar muchos abrazos 🤗
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
// CARGAR ANIME.JSON
// ============================================================

function cargarAnime() {

    try {

        if (!fs.existsSync(ANIME_FILE)) {
            throw new Error(
                `No existe el archivo: ${ANIME_FILE}`
            );
        }

        const contenido =
            fs.readFileSync(
                ANIME_FILE,
                'utf8'
            );

        return JSON.parse(contenido);

    } catch (error) {

        console.error(
            '[REACCION] Error cargando anime.json:',
            error
        );

        throw new Error(
            'No se pudo cargar la base de datos de reacciones.'
        );
    }
}

// ============================================================
// OBTENER EL COMANDO REAL
//
// Permite:
//
// .hug
// .kiss
// .pat
// .slap
//
// aunque todos utilicen este mismo archivo.
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
// OBTENER USUARIO QUE EJECUTÓ EL COMANDO
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

        if (
            String(candidato).endsWith('@g.us')
        ) {
            continue;
        }

        return candidato;
    }

    return null;
}

// ============================================================
// OBTENER USUARIO MENCIONADO
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
// OBTENER PERSONA DEL MENSAJE RESPONDIDO
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
// CREAR TEXTO @NUMERO
// ============================================================

function crearMencion(jid) {

    if (!jid) {
        return null;
    }

    const numero =
        String(jid)
            .split('@')[0]
            .split(':')[0];

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

        hug: 'abraza',

        kiss: 'besa',

        pat: 'acaricia',

        slap: 'da una bofetada a',

        poke: 'molesta a',

        cuddle: 'se acurruca con',

        wave: 'saluda a',

        smile: 'sonríe a',

        dance: 'baila con',

        cry: 'llora con',

        happy: 'se alegra con',

        angry: 'se enoja con',

        love: 'ama a',

        bite: 'muerde a',

        blush: 'se sonroja con',

        highfive: 'choca la mano con',

        handhold: 'toma de la mano a',

        feed: 'alimenta a',

        bonk: 'golpea suavemente a',

        yeet: 'lanza a',

        wink: 'le guiña el ojo a',

        stare: 'mira a',

        tickle: 'hace cosquillas a',

        punch: 'golpea a',

        kick: 'patea a'

    };

    return acciones[tipo] || tipo;
}

// ============================================================
// TEXTO CUANDO NO HAY OBJETIVO
// ============================================================

function textoSinObjetivo(tipo, autorTexto) {

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
        `${autorTexto} quiere hacer muchas reacciones 🎭`
    );
}

// ============================================================
//// ============================================================
// OBTENER TODAS LAS REACCIONES COMO ALIAS
//
// Esto permite usar:
//
// .hug
// .kiss
// .pat
// .slap
// .poke
// etc.
//
// sin tener que escribir:
//
// .reaccion hug
// ============================================================

function obtenerAliasReacciones() {

    try {

        const anime =
            cargarAnime();

        return Object.keys(anime)
            .map(tipo =>
                String(tipo)
                    .trim()
                    .toLowerCase()
            )
            .filter(Boolean);

    } catch (error) {

        console.error(
            '[REACCION] No se pudieron cargar los alias:',
            error.message
        );

        return [];
    }
}

// ============================================================
// DESCARGAR VIDEO
// ============================================================

async function descargarVideo(url) {

    const controlador =
        new AbortController();

    const temporizador =
        setTimeout(
            () => controlador.abort(),
            60000
        );

    try {

        const response =
            await fetch(
                url,
                {
                    headers: {
                        'User-Agent': 'AlexBot/1.0',
                        'Accept': 'video/mp4,video/*,*/*'
                    },
                    signal: controlador.signal
                }
            );

        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const arrayBuffer =
            await response.arrayBuffer();

        const buffer =
            Buffer.from(arrayBuffer);

        if (
            !buffer.length
        ) {

            throw new Error(
                'El video descargado está vacío.'
            );
        }

        return buffer;

    } catch (error) {

        if (
            error?.name === 'AbortError'
        ) {

            throw new Error(
                'La descarga tardó demasiado.'
            );
        }

        throw error;

    } finally {

        clearTimeout(
            temporizador
        );
    }
}

// ============================================================
// COMANDO PRINCIPAL
// ============================================================

export default {

    nombre: 'reaccion',

    categoria: 'Diversión',

    alias: obtenerAliasReacciones(),

    descripcion:
        'Reacciones GIF. Ejemplo: .hug, .kiss, .pat, etc.',

    async ejecutar({

        sock,
        msg,
        responder

    }) {

        const tipo =
            obtenerTipo(msg);

        try {

            console.log(
                `[REACCION] Ejecutando: ${tipo}`
            );

            // ====================================================
            // CARGAR BASE DE DATOS
            // ====================================================

            const anime =
                cargarAnime();

            const reaccion =
                anime[tipo];

            if (!reaccion) {

                const disponibles =
                    Object.keys(anime)
                        .join(', ');

                await responder.texto(
                    `❌ No encontré la reacción *${tipo}*.\n\n` +
                    `🎭 *Disponibles:*\n` +
                    `${disponibles}`
                );

                return;
            }

            // ====================================================
            // COMPROBAR VIDEOS
            // ====================================================

            if (
                !Array.isArray(
                    reaccion.videos
                ) ||
                reaccion.videos.length === 0
            ) {

                throw new Error(
                    `La reacción "${tipo}" no tiene videos configurados.`
                );
            }

            // ====================================================
            // ELEGIR VIDEO ALEATORIO
            // ====================================================

            const videoUrl =
                reaccion.videos[
                    Math.floor(
                        Math.random() *
                        reaccion.videos.length
                    )
                ];

            console.log(
                `[REACCION] Video seleccionado: ${videoUrl}`
            );

            // ====================================================
            // DESCARGAR VIDEO
            // ====================================================

            const buffer =
                await descargarVideo(
                    videoUrl
                );

            console.log(
                `[REACCION] Video descargado: ${buffer.length} bytes`
            );

            // ====================================================
            // OBTENER AUTOR
            // ====================================================

            const autor =
                obtenerAutor(msg);

            const autorMencion =
                crearMencion(autor);

            // ====================================================
            // BUSCAR OBJETIVO
            //
            // PRIORIDAD:
            //
            // 1. @mención
            // 2. mensaje respondido
            // 3. nadie
            // ====================================================

            const mencionado =
                obtenerMencion(msg);

            const respondido =
                obtenerPersonaRespondida(msg);

            const objetivo =
                mencionado ||
                respondido ||
                null;

            // ====================================================
            // CREAR MENCIÓN DEL AUTOR
            // ====================================================

            const textoAutor =
                autorMencion ||
                '@usuario';

            // ====================================================
            // CREAR TEXTO
            // ====================================================

            let caption = '';

            const menciones = [];

            if (objetivo) {

                const textoObjetivo =
                    crearMencion(
                        objetivo
                    );

                if (textoObjetivo) {

                    const accion =
                        obtenerAccion(
                            tipo
                        );

                    caption =
                        `🎭 *${tipo.toUpperCase()}*\n\n` +
                        `💫 ${textoAutor} ${accion} ${textoObjetivo}`;

                    // Autor
                    if (autor) {
                        menciones.push(
                            autor
                        );
                    }

                    // Objetivo
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

                } else {

                    caption =
                        `🎭 *${tipo.toUpperCase()}*\n\n` +
                        `💫 ${textoSinObjetivo(
                            tipo,
                            textoAutor
                        )}`;
                }

            } else {

                caption =
                    `🎭 *${tipo.toUpperCase()}*\n\n` +
                    `💫 ${textoSinObjetivo(
                        tipo,
                        textoAutor
                    )}`;

                if (autor) {
                    menciones.push(
                        autor
                    );
                }
            }

            // ====================================================
            // ENVIAR GIF
            // ====================================================

            await sock.sendMessage(

                msg.key.remoteJid,

                {
                    video: buffer,

                    gifPlayback: true,

                    caption,

                    mentions:
                        menciones
                },

                {
                    quoted: msg,

                    mediaUploadTimeoutMs:
                        180000
                }
            );

            console.log(
                `[REACCION] ${tipo} enviado correctamente.`
            );

        } catch (error) {

            console.error(
                '[REACCION] Error:',
                error?.stack ||
                error?.message ||
                error
            );

            await responder.texto(
                `❌ No pude enviar la reacción *${tipo}*.\n\n` +
                `⚠️ ${error?.message || 'Error desconocido.'}`
            );
        }
    }
};

// ============================================================
// FIN DEL COMANDO
// ============================================================
