// ============================================================
// COMANDO: REACCION
// ALEX BOT
// Usa los videos definidos en database/anime.json
// No depende de NekosBest ni de una API de reacciones
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
// CARGAR DATABASE
// ============================================================

function cargarAnime() {
    try {
        if (!fs.existsSync(ANIME_FILE)) {
            throw new Error(
                `No existe el archivo: ${ANIME_FILE}`
            );
        }

        const contenido = fs.readFileSync(
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
// COMANDO
// ============================================================

export default {
    nombre: 'reaccion',

    categoria: 'Diversión',

    alias: [],

    descripcion:
        'GIF/video de reacción anime. Uso: .reaccion <tipo>',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const tipo =
            argumento?.trim().toLowerCase() || 'hug';

        try {

            console.log(
                `[REACCION] Buscando reacción: ${tipo}`
            );

            // ====================================================
            // CARGAR ANIME.JSON
            // ====================================================

            const anime = cargarAnime();

            const reaccion = anime[tipo];

            if (!reaccion) {

                const disponibles =
                    Object.keys(anime).join(', ');

                return responder.texto(
                    `❌ No encontré la reacción *${tipo}*.\n\n` +
                    `🎭 Reacciones disponibles:\n` +
                    `${disponibles}`
                );
            }

            // ====================================================
            // COMPROBAR VIDEOS
            // ====================================================

            if (
                !Array.isArray(reaccion.videos) ||
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

            const response = await fetch(videoUrl, {
                headers: {
                    'User-Agent': 'AlexBot/1.0',
                    'Accept': 'video/mp4,video/*,*/*'
                }
            });

            if (!response.ok) {
                throw new Error(
                    `No se pudo descargar el video. HTTP ${response.status}`
                );
            }

            const arrayBuffer =
                await response.arrayBuffer();

            const buffer =
                Buffer.from(arrayBuffer);

            if (!buffer.length) {
                throw new Error(
                    'El video descargado está vacío.'
                );
            }

            console.log(
                `[REACCION] Video descargado: ${buffer.length} bytes`
            );

            // ====================================================
            // TEXTO DE LA REACCIÓN
            // ====================================================

            const descripcion =
                reaccion.target || reaccion.self || tipo;

            const caption =
                `🎭 *REACCIÓN ANIME*\n\n` +
                `✨ Tipo: *${tipo}*\n` +
                `💫 ${descripcion}`;

            // ====================================================
            // ENVIAR VIDEO
            // ====================================================

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    video: buffer,
                    gifPlayback: true,
                    caption
                },
                {
                    quoted: msg,
                    mediaUploadTimeoutMs: 120000
                }
            );

            console.log(
                `[REACCION] ${tipo} enviado correctamente`
            );

        } catch (error) {

            console.error(
                '[REACCION]',
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
