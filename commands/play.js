// ============================================================
// PLAY - Descarga audio de YouTube mediante API Lempi
// Uso: .play https://youtube.com/watch?v=XXXXXXXXXXX
// ============================================================

import axios from 'axios';

const API_KEY = process.env.LEMPI_API_KEY || 'lem916';
const API_URL = 'https://api.lempi.lat/dl/yta';

export default {
    nombre: 'play',
    categoria: 'descargas',
    alias: ['ytplay', 'audio'],

    descripcion:
        'Descarga el audio de un video de YouTube.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {
        const chatId = msg.key.remoteJid;
        const urlYouTube = (argumento || '').trim();

        if (!urlYouTube) {
            return responder.texto(
                '🎵 *PLAY*\n\n' +
                'Usa:\n' +
                '*.play https://youtube.com/watch?v=xxxxx*'
            );
        }

        // ----------------------------------------------------
        // Validar URL de YouTube
        // ----------------------------------------------------

        let youtube;

        try {
            youtube = new URL(urlYouTube);
        } catch {
            return responder.texto(
                '❌ El enlace no es válido.'
            );
        }

        const dominios = [
            'youtube.com',
            'www.youtube.com',
            'm.youtube.com',
            'youtu.be',
            'www.youtu.be'
        ];

        if (!dominios.includes(
            youtube.hostname.toLowerCase()
        )) {
            return responder.texto(
                '❌ Debes enviar un enlace de YouTube.'
            );
        }

        try {
            await responder.texto(
                '🎵 *Procesando audio...*\n\n' +
                '⏳ Espera un momento.'
            );

            // ------------------------------------------------
            // CONSULTAR API LEMPI
            // ------------------------------------------------

            const response = await axios.get(
                API_URL,
                {
                    params: {
                        apikey: API_KEY,
                        url: urlYouTube
                    },

                    timeout: 60000,

                    headers: {
                        'User-Agent':
                            'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36',
                        'Accept':
                            'application/json'
                    }
                }
            );

            const data = response.data;

            console.log(
                '[PLAY] API:',
                JSON.stringify(data, null, 2)
            );

            if (!data?.status) {
                return responder.texto(
                    `❌ ${data?.mensaje || 'La API no pudo procesar el video.'}`
                );
            }

            const audioUrl = data?.datos?.url;

            if (!audioUrl) {
                return responder.texto(
                    '❌ La API no devolvió el enlace del audio.'
                );
            }

            const titulo =
                data?.titulo || 'Audio';

            const archivo =
                data?.datos?.archivo || 'audio.mp3';

            const calidad =
                data?.datos?.calidad || '320kbps';

            const tamaño =
                data?.datos?.tamaño || 'Desconocido';

            const duracion =
                data?.duracion || 'Desconocida';

            const canal =
                data?.canal || 'YouTube';

            // ------------------------------------------------
            // INFORMACIÓN
            // ------------------------------------------------

            const texto =
                `🎵 *${titulo}*\n\n` +
                `📺 Canal: ${canal}\n` +
                `⏱️ Duración: ${duracion}\n` +
                `🎧 Calidad: ${calidad}\n` +
                `📦 Tamaño: ${tamaño}\n\n` +
                `⬇️ Descargando audio...`;

            if (data?.miniatura) {
                try {
                    await sock.sendMessage(
                        chatId,
                        {
                            image: {
                                url: data.miniatura
                            },
                            caption: texto
                        },
                        {
                            quoted: msg
                        }
                    );
                } catch (error) {
                    console.log(
                        '[PLAY] Error enviando miniatura:',
                        error.message
                    );

                    await responder.texto(texto);
                }
            } else {
                await responder.texto(texto);
            }

            // ------------------------------------------------
            // DESCARGAR MP3 COMO BUFFER
            // ------------------------------------------------

            console.log(
                '[PLAY] Descargando:',
                audioUrl
            );

            const audioResponse = await axios.get(
                audioUrl,
                {
                    responseType: 'arraybuffer',
                    timeout: 120000,

                    headers: {
                        'User-Agent':
                            'Mozilla/5.0'
                    }
                }
            );

            const audioBuffer =
                Buffer.from(
                    audioResponse.data
                );

            if (!audioBuffer.length) {
                throw new Error(
                    'El audio descargado está vacío.'
                );
            }

            console.log(
                `[PLAY] Buffer recibido: ${audioBuffer.length} bytes`
            );

            // ------------------------------------------------
            // ENVIAR AUDIO
            // ------------------------------------------------

            await sock.sendMessage(
                chatId,
                {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: archivo,
                    ptt: false
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `✅ [PLAY] Audio enviado: ${archivo}`
            );

        } catch (error) {
            console.error(
                '[PLAY ERROR]',
                error?.stack ||
                error?.message ||
                error
            );

            if (error?.response?.status) {
                console.error(
                    '[PLAY HTTP]',
                    error.response.status
                );
            }

            await responder.texto(
                '❌ No pude enviar el audio.\n\n' +
                '⚠️ Ocurrió un error al descargarlo o enviarlo.'
            );
        }
    }
};
