// commands/utils/letra.js
// ============================================================
// COMANDO: LETRA
// BOT-API
//
// Uso:
// .letra nombre de la canción
//
// Busca una canción mediante Lyrics Finder de YO SOY YO.
// Muestra título, artista y un fragmento corto.
// ============================================================

import axios from 'axios';
import config from '../../config.js';

const API_URL =
    'https://api-yosoyyo-api-ofc.onrender.com/api/lyrics?q=bohemian';

export default {
    nombre: 'letra',

    categoria: 'utilidades',

    alias: [
        'lyrics',
        'cancion'
    ],

    descripcion:
        'Busca una canción y muestra información de ella.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        // --------------------------------------------------------
        // OBTENER CONSULTA
        // --------------------------------------------------------

        const texto =
            msg?.body?.trim() ||
            msg?.message?.conversation?.trim() ||
            msg?.message?.extendedTextMessage?.text?.trim() ||
            '';

        const consulta =
            texto
                .replace(/^\.letra\b/i, '')
                .trim();

        // --------------------------------------------------------
        // SIN CONSULTA
        // --------------------------------------------------------

        if (!consulta) {

            await responder.texto(
                `╭〔 🎵 𝐋𝐘𝐑𝐈𝐂𝐒 𝐅𝐈𝐍𝐃𝐄𝐑 〕⬣
┃
┃ ❌ Escribe el nombre de una canción.
┃
┃ 💡 Ejemplo:
┃ *.letra Bohemian Rhapsody*
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

            return;
        }

        // --------------------------------------------------------
        // API KEY
        // --------------------------------------------------------

        const apiKey =
            config.YOSOYYO_API_KEY ||
            process.env.YOSOYYO_API_KEY;

        if (!apiKey) {

            console.error(
                '[LETRA] YOSOYYO_API_KEY no configurada'
            );

            await responder.texto(
                '❌ La API de Lyrics no está configurada.'
            );

            return;
        }

        try {

            // ----------------------------------------------------
            // CONSULTAR API
            // ----------------------------------------------------

            const respuesta =
                await axios.get(
                    API_URL,
                    {
                        params: {
                            q: consulta,
                            apiKey
                        },
                        timeout: 60000
                    }
                );

            const datos =
                respuesta.data;

            const resultado =
                datos?.result;

            // ----------------------------------------------------
            // COMPROBAR RESULTADO
            // ----------------------------------------------------

            if (
                datos?.status !== true ||
                !resultado
            ) {

                await responder.texto(
                    `╭〔 🎵 𝐋𝐘𝐑𝐈𝐂𝐒 𝐅𝐈𝐍𝐃𝐄𝐑 〕⬣
┃
┃ ❌ No encontré esa canción.
┃
┃ 🔎 Búsqueda › ${consulta}
┃
╰━━━━━━━━━━━━━━━━⬣`
                );

                return;
            }

            // ----------------------------------------------------
            // DATOS
            // ----------------------------------------------------

            const titulo =
                resultado.title ||
                consulta;

            const artista =
                resultado.artist ||
                'Desconocido';

            let lyrics =
                String(
                    resultado.lyrics ||
                    ''
                ).trim();

            // ----------------------------------------------------
            // FRAGMENTO CORTO
            // ----------------------------------------------------

            if (lyrics) {

                const lineas =
                    lyrics
                        .split('\n')
                        .map(linea => linea.trim())
                        .filter(Boolean);

                const maxLineas = 8;

                if (lineas.length > maxLineas) {

                    lyrics =
                        lineas
                            .slice(0, maxLineas)
                            .join('\n') +
                        '\n…';
                } else {

                    lyrics =
                        lineas.join('\n');
                }

            } else {

                lyrics =
                    'No se encontró un fragmento disponible.';
            }

            // ----------------------------------------------------
            // RESPUESTA BONITA
            // ----------------------------------------------------

            const mensaje =
                `╭〔 🎵 𝐋𝐘𝐑𝐈𝐂𝐒 𝐅𝐈𝐍𝐃𝐄𝐑 〕⬣
┃
┃ 🎶 𝐓𝐈́𝐓𝐔𝐋𝐎
┃ › ${titulo}
┃
┃ 👤 𝐀𝐑𝐓𝐈𝐒𝐓𝐀
┃ › ${artista}
┃
╰━━━━━━━━━━━━━━━━⬣

📝 *Fragmento:*

${lyrics}

╭〔 ℹ️ 𝐈𝐍𝐅𝐎 〕⬣
┃ 🎵 Canción encontrada
┃ 🔎 Consulta › ${consulta}
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

            await responder.texto(mensaje);

        } catch (error) {

            console.error(
                '[LETRA] Error:',
                error?.response?.data ||
                error?.message ||
                error
            );

            await responder.texto(
                `╭〔 ❌ 𝐋𝐘𝐑𝐈𝐂𝐒 𝐅𝐈𝐍𝐃𝐄𝐑 〕⬣
┃
┃ No pude consultar la canción.
┃
┃ 🔄 Inténtalo nuevamente.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }
    }
};