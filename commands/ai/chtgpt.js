// ============================================================
// BOT-API
// COMANDO: CHTGPT
// ChatGPT mediante API LEMPI
// API Key leída desde config.js
// ============================================================

import fetch from 'node-fetch';
import config from '../../config.js';

const API_URL = 'https://api.lempi.lat/ai/chatgpt';

// ============================================================
// OBTENER API KEY
// ============================================================

function obtenerApiKey() {
    return (
        config?.LEMPI_APIKEY ||
        config?.LEMPI_API_KEY ||
        config?.LEMPI_KEY ||
        ''
    );
}

// ============================================================
// BUSCAR TEXTO DENTRO DE LA RESPUESTA
// ============================================================

function buscarTexto(data, profundidad = 0) {

    if (profundidad > 8 || data == null) {
        return null;
    }

    // Si ya es texto
    if (typeof data === 'string') {

        const texto = data.trim();

        if (!texto) {
            return null;
        }

        return texto;
    }

    // Números / booleanos no son respuestas
    if (
        typeof data === 'number' ||
        typeof data === 'boolean'
    ) {
        return null;
    }

    // Arrays
    if (Array.isArray(data)) {

        for (const elemento of data) {

            const resultado = buscarTexto(
                elemento,
                profundidad + 1
            );

            if (resultado) {
                return resultado;
            }
        }

        return null;
    }

    // Objetos
    if (typeof data === 'object') {

        // Primero buscamos las propiedades que normalmente
        // contienen la respuesta de una IA.
        const propiedadesPrioritarias = [
            'answer',
            'respuesta',
            'response',
            'result',
            'resultado',
            'text',
            'message',
            'content',
            'reply',
            'output',
            'completion',
            'data'
        ];

        for (const propiedad of propiedadesPrioritarias) {

            if (
                Object.prototype.hasOwnProperty.call(
                    data,
                    propiedad
                )
            ) {

                const resultado = buscarTexto(
                    data[propiedad],
                    profundidad + 1
                );

                if (resultado) {
                    return resultado;
                }
            }
        }

        // Si no encontramos ninguna propiedad conocida,
        // buscamos dentro de todas las propiedades.
        for (const [clave, valor] of Object.entries(data)) {

            // Ignorar campos que normalmente no contienen
            // la respuesta de la IA.
            if (
                clave === 'status' ||
                clave === 'success' ||
                clave === 'ok' ||
                clave === 'code' ||
                clave === 'apikey' ||
                clave === 'apiKey' ||
                clave === 'messageId'
            ) {
                continue;
            }

            const resultado = buscarTexto(
                valor,
                profundidad + 1
            );

            if (resultado) {
                return resultado;
            }
        }
    }

    return null;
}

// ============================================================
// LIMPIAR RESPUESTA
// ============================================================

function limpiarRespuesta(texto) {

    if (!texto) {
        return null;
    }

    let resultado = String(texto).trim();

    // Evitar que llegue [object Object]
    if (
        resultado === '[object Object]' ||
        resultado === '[object object]'
    ) {
        return null;
    }

    return resultado;
}

// ============================================================
// COMANDO
// ============================================================

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

    descripcion:
        'Habla con ChatGPT mediante la API de LEMPI.',

    ejecutar: async ({
        msg,
        argumento,
        responder
    }) => {

        try {

            // ==================================================
            // PREGUNTA
            // ==================================================

            const pregunta =
                String(argumento || '').trim();

            if (!pregunta) {

                await responder.texto(
                    '╭━━〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ Escribe una pregunta.\n' +
                    '┃\n' +
                    '┃ 📌 Ejemplo:\n' +
                    '┃ *.chtgpt hola*\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ==================================================
            // API KEY
            // ==================================================

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
                    '┃ Agrega LEMPI_APIKEY en config.js\n' +
                    '┃ y reinicia el bot.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

                return;
            }

            // ==================================================
            // REACCIÓN
            // ==================================================

            try {
                await responder.reaccion('🤖');
            } catch {}

            // ==================================================
            // URL
            // ==================================================

            const url =
                `${API_URL}` +
                `?q=${encodeURIComponent(pregunta)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;

            console.log(
                `[CHTGPT] 🤖 Pregunta: ${pregunta}`
            );

            // ==================================================
            // REQUEST
            // ==================================================

            const response = await fetch(url, {
                method: 'GET',

                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const textoCrudo =
                await response.text();

            // ==================================================
            // PARSEAR RESPUESTA
            // ==================================================

            let data;

            try {

                data = JSON.parse(textoCrudo);

            } catch {

                data = textoCrudo;
            }

            // ==================================================
            // ERROR HTTP
            // ==================================================

            if (!response.ok) {

                console.error(
                    '[CHTGPT] ❌ HTTP:',
                    response.status,
                    textoCrudo
                );

                throw new Error(
                    `La API respondió con HTTP ${response.status}.`
                );
            }

            // ==================================================
            // EXTRAER RESPUESTA
            // ==================================================

            let respuesta =
                buscarTexto(data);

            respuesta =
                limpiarRespuesta(respuesta);

            // ==================================================
            // SI NO SE ENCONTRÓ
            // ==================================================

            if (!respuesta) {

                console.error(
                    '[CHTGPT] ⚠️ Respuesta desconocida:',
                    textoCrudo
                );

                throw new Error(
                    'La API no devolvió un texto válido.'
                );
            }

            // ==================================================
            // ENVIAR
            // ==================================================

            await responder.texto(
                '╭━━〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                '┃\n' +
                `┃ ${respuesta}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            // ==================================================
            // REACCIÓN FINAL
            // ==================================================

            try {
                await responder.reaccion('✅');
            } catch {}

        } catch (error) {

            console.error(
                '[CHTGPT] ❌ Error:',
                error?.stack ||
                error?.message ||
                error
            );

            try {
                await responder.reaccion('❌');
            } catch {}

            try {

                await responder.texto(
                    '╭━━〔 ❌ 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━━⬣\n' +
                    '┃\n' +
                    '┃ No pude obtener una respuesta.\n' +
                    '┃\n' +
                    `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );

            } catch {}
        }
    }
};