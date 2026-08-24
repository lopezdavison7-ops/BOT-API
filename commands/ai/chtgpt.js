// commands/ai/chtgpt.js
// ============================================================
// COMANDO: CHTGPT
// BOT-API
//
// Uso:
// .chtgpt Q es agua
//
// Consulta la API de YO SOY YO y devuelve la respuesta.
// ============================================================

import axios from 'axios';
import config from '../../config.js';

const API_URL =
    'https://apiyosoyyo-ofc.onrender.com/api/deepseek';

export default {
    nombre: 'chtgpt',

    categoria: 'IA',

    alias: [
        'chatgpt',
        'ia',
        'deepseek'
    ],

    descripcion:
        'Pregunta a la inteligencia artificial.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        // --------------------------------------------------------
        // OBTENER TEXTO DEL COMANDO
        // --------------------------------------------------------

        const texto =
            msg?.body?.trim() ||
            msg?.message?.conversation?.trim() ||
            msg?.message?.extendedTextMessage?.text?.trim() ||
            '';

        const prompt =
            texto
                .replace(
                    /^\.chtgpt\b/i,
                    ''
                )
                .trim();

        // --------------------------------------------------------
        // COMPROBAR PREGUNTA
        // --------------------------------------------------------

        if (!prompt) {

            await responder.texto(
                `╭〔 🤖 𝐂𝐇𝐓𝐆𝐏𝐓 〕⬣\n` +
                `┃\n` +
                `┃ ❓ Escribe una pregunta.\n` +
                `┃\n` +
                `┃ Ejemplo:\n` +
                `┃ *.chtgpt Q es agua*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
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
                '[COMANDO chtgpt] Falta YOSOYYO_API_KEY'
            );

            await responder.texto(
                '❌ La API de IA no está configurada.'
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
                            prompt,
                            apiKey
                        },
                        timeout: 60000
                    }
                );

            const datos =
                respuesta.data;

            // ----------------------------------------------------
            // OBTENER RESPUESTA
            // ----------------------------------------------------

            const answer =
                datos?.result?.answer;

            if (
                !datos?.status ||
                !answer
            ) {

                console.error(
                    '[COMANDO chtgpt] Respuesta inesperada:',
                    datos
                );

                await responder.texto(
                    '❌ La IA no devolvió una respuesta válida.'
                );

                return;
            }

            // ----------------------------------------------------
            // ENVIAR RESPUESTA
            // ----------------------------------------------------

            await responder.texto(
                `╭〔 🤖 𝐂𝐇𝐓𝐆𝐏𝐓 〕⬣\n` +
                `┃\n` +
                `┃ ❓ *${prompt}*\n` +
                `┃\n` +
                `┃ ${answer}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

        } catch (error) {

            console.error(
                '[COMANDO chtgpt] Error:',
                error?.response?.data ||
                error.message ||
                error
            );

            await responder.texto(
                `❌ *Error al consultar la IA.*\n\n` +
                `Inténtalo nuevamente en unos segundos.`
            );
        }
    }
};