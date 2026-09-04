// ============================================================
// BOT-API
// COMANDO: CHTGPT
// ChatGPT mediante API LEMPI
// La API Key se lee desde config.js
// ============================================================

import fetch from 'node-fetch';
import config from '../../config.js';

const API_URL = 'https://api.lempi.lat/ai/chatgpt';

// ------------------------------------------------------------
// Obtener API Key desde config.js
// ------------------------------------------------------------
function obtenerApiKey() {
    return (
        config?.LEMPI_APIKEY ||
        config?.LEMPI_API_KEY ||
        config?.LEMPI_KEY ||
        ''
    );
}

// ------------------------------------------------------------
// Extraer respuesta de diferentes formatos JSON
// ------------------------------------------------------------
function extraerRespuesta(data) {
    if (!data) return null;

    if (typeof data === 'string') {
        return data.trim();
    }

    return (
        data.resultado ||
        data.respuesta ||
        data.response ||
        data.answer ||
        data.text ||
        data.message ||
        data.data?.resultado ||
        data.data?.respuesta ||
        data.data?.response ||
        data.data?.answer ||
        data.data?.text ||
        data.data?.message ||
        null
    );
}

// ------------------------------------------------------------
// Comando
// ------------------------------------------------------------
export default {
    nombre: 'chtgpt',

    categoria: 'IA',

    alias: [
        'chatgpt',
        'gpt',
        'ia',
        'ask',
        'chat'
    ],

    descripcion: 'Habla con ChatGPT mediante la API de LEMPI.',

    ejecutar: async ({
        msg,
        argumento,
        responder
    }) => {

        try {

            const pregunta = String(argumento || '').trim();

            // ------------------------------------------------
            // Validar pregunta
            // ------------------------------------------------
            if (!pregunta) {

                await responder.texto(
                    '╭━━〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Escribe algo para preguntarle a la IA.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplo:\n' +
                    '┃ *.chtgpt Hola, ¿cómo estás?*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // Obtener API Key
            // ------------------------------------------------
            const apiKey = obtenerApiKey();

            if (!apiKey) {

                console.error(
                    '[CHTGPT] ❌ No se encontró LEMPI_APIKEY en config.js'
                );

                await responder.texto(
                    '╭━━〔 ❌ 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No está configurada la API Key.\n' +
                    '┃\n' +
                    '┃ Configura LEMPI_APIKEY en config.js\n' +
                    '┃ y reinicia el bot.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ------------------------------------------------
            // Reacción de espera
            // ------------------------------------------------
            try {
                await responder.reaccion('🤖');
            } catch {}

            // ------------------------------------------------
            // Construir URL
            // ------------------------------------------------
            const url =
                `${API_URL}?q=${encodeURIComponent(pregunta)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;

            console.log(
                `[CHTGPT] Procesando pregunta: ${pregunta}`
            );

            // ------------------------------------------------
            // Petición a la API
            // ------------------------------------------------
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const textoRespuesta = await response.text();

            let data;

            try {
                data = JSON.parse(textoRespuesta);
            } catch {
                data = textoRespuesta;
            }

            // ------------------------------------------------
            // Error HTTP
            // ------------------------------------------------
            if (!response.ok) {

                console.error(
                    '[CHTGPT] API ERROR:',
                    response.status,
                    textoRespuesta
                );

                throw new Error(
                    `La API respondió con HTTP ${response.status}`
                );
            }

            // ------------------------------------------------
            // Obtener respuesta
            // ------------------------------------------------
            const respuesta = extraerRespuesta(data);

            if (!respuesta) {

                console.error(
                    '[CHTGPT] Respuesta inesperada:',
                    data
                );

                throw new Error(
                    'La API no devolvió una respuesta válida.'
                );
            }

            // ------------------------------------------------
            // Enviar respuesta
            // ------------------------------------------------
            await responder.texto(
                '╭━━〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                '┃\n' +
                `┃ ${respuesta}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            try {
                await responder.reaccion('✅');
            } catch {}

        } catch (error) {

            console.error(
                '[CHTGPT] ❌ Error:',
                error?.stack || error?.message || error
            );

            try {
                await responder.reaccion('❌');
            } catch {}

            try {
                await responder.texto(
                    '╭━━〔 ❌ 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No pude obtener una respuesta de la IA.\n' +
                    '┃\n' +
                    `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            } catch {}
        }
    }
};