

import fetch from 'node-fetch';
import config from '../../config.js';

const API_URL = 'https://api.lempi.lat/ai/chatgpt';

function obtenerApiKey() {
    return (
        config?.LEMPI_APIKEY ||
        config?.LEMPI_API_KEY ||
        config?.LEMPI_KEY ||
        ''
    );
}

function buscarTexto(data, profundidad = 0) {

    if (profundidad > 8 || data == null) {
        return null;
    }

    if (typeof data === 'string') {

        const texto = data.trim();

        if (!texto) {
            return null;
        }

        return texto;
    }

    if (
        typeof data === 'number' ||
        typeof data === 'boolean'
    ) {
        return null;
    }

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

    if (typeof data === 'object') {

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

        for (const [clave, valor] of Object.entries(data)) {

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

function limpiarRespuesta(texto) {

    if (!texto) {
        return null;
    }

    let resultado = String(texto).trim();

    if (
        resultado === '[object Object]' ||
        resultado === '[object object]'
    ) {
        return null;
    }

    return resultado;
}

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

            try {
                await responder.reaccion('🤖');
            } catch {}

            const url =
                `${API_URL}` +
                `?q=${encodeURIComponent(pregunta)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;

            console.log(
                `[CHTGPT] 🤖 Pregunta: ${pregunta}`
            );

            const response = await fetch(url, {
                method: 'GET',

                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            const textoCrudo =
                await response.text();

            let data;

            try {

                data = JSON.parse(textoCrudo);

            } catch {

                data = textoCrudo;
            }

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

            let respuesta =
                buscarTexto(data);

            respuesta =
                limpiarRespuesta(respuesta);

            if (!respuesta) {

                console.error(
                    '[CHTGPT] ⚠️ Respuesta desconocida:',
                    textoCrudo
                );

                throw new Error(
                    'La API no devolvió un texto válido.'
                );
            }

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