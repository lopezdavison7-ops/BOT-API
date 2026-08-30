// commands/downloads/hablar.js
// ============================================================
// COMANDO: HABLAR (texto a voz, con speaker seleccionable)
// Usa /s/ttsmp3 de la API de Lempi. Ya existe un .tts con otra
// API (YO SOY YO) sin selección de voz, así que este es aparte
// para no pisarlo.
//
// Uso: .hablar <texto>
// Uso con otra voz: .hablar <texto> | <speaker>
// Ejemplo: .hablar Hola amiguita, qué tal
// Ejemplo: .hablar Hola que tal | Diego (Mexican)
// ============================================================

import axios from 'axios';
import config from '../../config.js';

const API_URL = 'https://api.lempi.lat/s/ttsmp3';

const SPEAKER_DEFECTO = 'Jorge (Castilian)';

export default {
    nombre: 'hablar',

    categoria: 'Descargas',

    alias: [
        'ttsmp3'
    ],

    descripcion:
        'Convierte texto a voz (con voz seleccionable). Uso: .hablar <texto> | <speaker opcional>',

    ejecutar: async ({
        sock,
        msg,
        jid,
        responder,
        argumento
    }) => {

        const entrada = argumento?.trim();

        if (!entrada) {
            await responder.texto(
                '╭〔 🗣️ 𝐇𝐀𝐁𝐋𝐀𝐑 〕⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe un texto.\n' +
                '┃\n' +
                '┃ 📌 Uso: .hablar <texto>\n' +
                '┃ 📌 Con otra voz:\n' +
                '┃     .hablar <texto> | <speaker>\n' +
                '┃\n' +
                `┃ 🎙️ Voz por defecto: ${SPEAKER_DEFECTO}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        // Se puede pasar "texto | speaker" para elegir voz.
        const [textoCrudo, speakerCrudo] = entrada.split('|');
        const texto = textoCrudo?.trim();
        const speaker = speakerCrudo?.trim() || SPEAKER_DEFECTO;

        if (!texto) {
            await responder.texto('❌ Falta el texto antes del "|".');
            return;
        }

        const apiKey = config.LEMPI_API_KEY?.trim();

        if (!apiKey) {
            console.error('[HABLAR] ❌ No se encontró LEMPI_API_KEY en config.js');
            await responder.texto(
                '❌ *Error de configuración*\n\n' +
                'No se encontró `LEMPI_API_KEY` en `config.js`.'
            );
            return;
        }

        const chatJid = jid || msg.key.remoteJid;

        try {
            const response = await axios.get(API_URL, {
                params: {
                    text: texto,
                    speaker,
                    apikey: apiKey
                },
                timeout: 30000,
                validateStatus: () => true
            });

            const data = response.data;

            if (response.status < 200 || response.status >= 300 || !data?.status || !data?.datos?.audioUrl) {
                console.error('[HABLAR] Error API:', response.status, data?.message || data);
                await responder.texto(
                    `❌ No se pudo generar el audio.\n\n📡 ${data?.message || `HTTP ${response.status}`}`
                );
                return;
            }

            const audioUrl = data.datos.audioUrl;

            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                validateStatus: () => true
            });

            if (audioResponse.status < 200 || audioResponse.status >= 300) {
                await responder.texto(`❌ No se pudo descargar el audio (HTTP ${audioResponse.status}).`);
                return;
            }

            const buffer = Buffer.from(audioResponse.data);

            if (!buffer.length) {
                await responder.texto('❌ El audio llegó vacío.');
                return;
            }

            await sock.sendMessage(
                chatJid,
                {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    ptt: true
                },
                { quoted: msg }
            );

        } catch (error) {
            console.error('[HABLAR] Error:', error?.response?.status || '', error?.message || error);

            if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
                await responder.texto('⏱️ La API tardó demasiado en responder. Intenta de nuevo.');
                return;
            }

            await responder.texto('❌ No se pudo generar el audio. Intenta más tarde.');
        }
    }
};
