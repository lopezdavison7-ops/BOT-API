// commands/ai/claude.js
// ============================================================
// COMANDO: CLAUDE
// Consulta /ai/claude de la API de Lempi.
// Uso: .claude <pregunta>
// ============================================================

import axios from 'axios';
import config from '../../config.js';

const API_URL = 'https://api.lempi.lat/ai/claude';

export default {
    nombre: 'claude',

    categoria: 'IA',

    alias: [
        'ai'
    ],

    descripcion:
        'Pregunta a Claude (IA). Uso: .claude <pregunta>',

    ejecutar: async ({
        responder,
        argumento
    }) => {

        const pregunta = argumento?.trim();

        if (!pregunta) {
            await responder.texto(
                '╭〔 🤖 𝐂𝐋𝐀𝐔𝐃𝐄 〕⬣\n' +
                '┃\n' +
                '┃ ❓ Escribe una pregunta.\n' +
                '┃\n' +
                '┃ 📌 Ejemplo: .claude qué es el agua\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const apiKey = config.LEMPI_API_KEY?.trim();

        if (!apiKey) {
            console.error('[CLAUDE] ❌ No se encontró LEMPI_API_KEY en config.js');
            await responder.texto(
                '❌ *Error de configuración*\n\n' +
                'No se encontró `LEMPI_API_KEY` en `config.js`.'
            );
            return;
        }

        try {
            const response = await axios.get(API_URL, {
                params: {
                    q: pregunta,
                    apikey: apiKey
                },
                timeout: 60000,
                validateStatus: () => true
            });

            const data = response.data;

            if (response.status < 200 || response.status >= 300 || !data?.status || !data?.resultado) {
                console.error('[CLAUDE] Error API:', response.status, data?.message || data);
                await responder.texto(
                    `❌ La IA no pudo responder.\n\n📡 ${data?.message || `HTTP ${response.status}`}`
                );
                return;
            }

            await responder.texto(
                '╭〔 🤖 𝐂𝐋𝐀𝐔𝐃𝐄 〕⬣\n' +
                '┃\n' +
                `┃ ❓ *${pregunta}*\n` +
                '┃\n' +
                `┃ ${data.resultado}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        } catch (error) {
            console.error('[CLAUDE] Error:', error?.response?.status || '', error?.message || error);

            if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
                await responder.texto('⏱️ La IA tardó demasiado en responder. Intenta de nuevo.');
                return;
            }

            await responder.texto('❌ No se pudo consultar a la IA. Intenta más tarde.');
        }
    }
};