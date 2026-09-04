// ============================================================
// BOT-API
// COMANDO: CHATGPT
// ============================================================

import { config } from '../../config.js';

const API_URL = 'https://api.lempi.lat/ai/chatgpt';

function obtenerTexto(msg) {
    return (
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        msg?.message?.documentMessage?.caption ||
        ''
    );
}

function limpiarPregunta(texto) {
    return texto
        .replace(/^[.!/#]chatgpt\b/i, '')
        .trim();
}

function extraerRespuesta(data) {
    if (!data) return null;

    if (typeof data === 'string') return data;

    return (
        data.result ||
        data.response ||
        data.answer ||
        data.message ||
        data.text ||
        data.data?.result ||
        data.data?.response ||
        data.data?.answer ||
        data.data?.message ||
        data.data?.text ||
        null
    );
}

export default {
    nombre: 'chatgpt',
    categoria: 'IA',

    alias: [
        'gpt',
        'ia',
        'ask',
        'chat'
    ],

    descripcion: 'Pregunta a ChatGPT mediante la API de Lempi.',

    async ejecutar({ sock, msg, prefijo }) {
        const remoteJid = msg?.key?.remoteJid;

        if (!remoteJid) return;

        const pregunta = limpiarPregunta(obtenerTexto(msg));

        if (!pregunta) {
            return await sock.sendMessage(
                remoteJid,
                {
                    text:
                        `╭〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━⬣\n` +
                        `┃\n` +
                        `┃ ❗ Escribe una pregunta.\n` +
                        `┃\n` +
                        `┃ 💡 Ejemplo:\n` +
                        `┃ ${prefijo || '.'}chatgpt Hola\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━⬣`
                },
                { quoted: msg }
            );
        }

        const apiKey = config?.LEMPI_APIKEY;

        if (!apiKey) {
            console.error('[CHATGPT] No existe LEMPI_APIKEY en config.');
            return await sock.sendMessage(
                remoteJid,
                {
                    text: '❌ La API de ChatGPT no está configurada.'
                },
                { quoted: msg }
            );
        }

        await sock.sendMessage(remoteJid, {
            react: {
                text: '🤔',
                key: msg.key
            }
        });

        try {
            const url =
                `${API_URL}?q=${encodeURIComponent(pregunta)}` +
                `&apikey=${encodeURIComponent(apiKey)}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            });

            const textoRespuesta = await response.text();

            let data;

            try {
                data = JSON.parse(textoRespuesta);
            } catch {
                throw new Error('La API devolvió una respuesta inválida.');
            }

            if (!response.ok) {
                throw new Error(
                    data?.message ||
                    data?.error ||
                    `HTTP ${response.status}`
                );
            }

            const respuesta = extraerRespuesta(data);

            if (!respuesta) {
                throw new Error('La API no devolvió ninguna respuesta.');
            }

            const texto =
                `╭〔 🤖 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━⬣\n` +
                `┃\n` +
                `┃ 🧠 𝐑𝐞𝐬𝐩𝐮𝐞𝐬𝐭𝐚:\n` +
                `┃\n` +
                `┃ ${String(respuesta).replace(/\n/g, '\n┃ ')}\n` +
                `┃\n` +
                `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━⬣`;

            await sock.sendMessage(
                remoteJid,
                { text: texto },
                { quoted: msg }
            );

            await sock.sendMessage(remoteJid, {
                react: {
                    text: '✅',
                    key: msg.key
                }
            });

        } catch (error) {
            console.error('[CHATGPT] Error:', error);

            await sock.sendMessage(remoteJid, {
                react: {
                    text: '❌',
                    key: msg.key
                }
            });

            await sock.sendMessage(
                remoteJid,
                {
                    text:
                        `╭〔 ❌ 𝐂𝐇𝐀𝐓𝐆𝐏𝐓 〕━⬣\n` +
                        `┃\n` +
                        `┃ Error al consultar la IA.\n` +
                        `┃\n` +
                        `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━⬣`
                },
                { quoted: msg }
            );
        }
    }
};