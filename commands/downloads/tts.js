// commands/downloads/tts.js

export default {
    nombre: 'tts',
    categoria: 'descargas',
    alias: ['voz', 'texttospeech'],
    descripcion: 'Convierte texto a voz usando YO SOY YO API',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const jid = msg?.key?.remoteJid;
        const consulta = argumento?.trim();

        if (!consulta) {
            return await responder.texto(
                '❌ Uso: .tts texto\n\n' +
                '📝 Ejemplo:\n' +
                '.tts Hola, ¿cómo estás?'
            );
        }

        try {
            await responder.texto('🎙️ Generando audio...');

            const apiUrl =
                `https://apiyosoyyo-ofc.onrender.com/api/tts?text=${encodeURIComponent(consulta)}&apiKey=yosoyyo_sk_gincmnk3`;

            const res = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    Accept: 'audio/wav, audio/*, application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!res.ok) {
                throw new Error(`API respondió con HTTP ${res.status}`);
            }

            const contentType = (
                res.headers.get('content-type') || ''
            ).toLowerCase();

            /*
             * La API puede responder:
             * 1. Audio WAV directamente.
             * 2. JSON con información de la generación.
             */

            if (contentType.includes('audio')) {
                const buffer = Buffer.from(await res.arrayBuffer());

                if (!buffer.length) {
                    throw new Error('La API devolvió un audio vacío');
                }

                await sock.sendMessage(
                    jid,
                    {
                        audio: buffer,
                        mimetype: 'audio/wav',
                        ptt: true
                    },
                    {
                        quoted: msg
                    }
                );

                return;
            }

            const json = await res.json();

            if (json?.status && Number(json.status) !== 200) {
                throw new Error(
                    json?.message ||
                    json?.error ||
                    `La API respondió con estado ${json.status}`
                );
            }

            /*
             * Buscar posibles campos donde la API pueda
             * entregar la URL o los bytes del audio.
             */
            const audioUrl =
                json?.data?.audio_url ||
                json?.data?.audioUrl ||
                json?.data?.url ||
                json?.audio_url ||
                json?.audioUrl ||
                json?.url;

            /*
             * STREAMING_BYTES_LOCAL significa que el servidor
             * no está entregando una URL pública en ese campo.
             *
             * En ese caso no intentamos hacer fetch() sobre
             * esa cadena porque produciría otro error.
             */
            if (
                !audioUrl ||
                audioUrl === 'STREAMING_BYTES_LOCAL'
            ) {
                throw new Error(
                    'La API no entregó el audio directamente ni una URL pública de descarga'
                );
            }

            const audioRes = await fetch(audioUrl, {
                headers: {
                    Accept: 'audio/wav, audio/*',
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!audioRes.ok) {
                throw new Error(
                    `No se pudo descargar el audio: HTTP ${audioRes.status}`
                );
            }

            const buffer = Buffer.from(
                await audioRes.arrayBuffer()
            );

            if (!buffer.length) {
                throw new Error('El archivo de audio está vacío');
            }

            await sock.sendMessage(
                jid,
                {
                    audio: buffer,
                    mimetype: 'audio/wav',
                    ptt: true
                },
                {
                    quoted: msg
                }
            );

        } catch (error) {
            console.error('[TTS] Error:', error);

            return await responder.texto(
                `❌ Error TTS: ${error?.message || 'No se pudo generar el audio'}`
            );
        }
    }
};
```0