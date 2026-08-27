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
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!res.ok) {
                throw new Error(`Error de API: ${res.status}`);
            }

            const contentType = res.headers.get('content-type') || '';

            // Si la API devuelve directamente el audio
            if (contentType.includes('audio')) {
                const buffer = Buffer.from(await res.arrayBuffer());

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

            // Si la API devuelve JSON
            const json = await res.json();

            if (json?.status && json.status !== 200) {
                throw new Error(
                    json?.message ||
                    json?.error ||
                    'La API rechazó la solicitud'
                );
            }

            // Algunas versiones de la API pueden devolver una URL
            const audioUrl =
                json?.data?.audio_url ||
                json?.audio_url ||
                json?.url;

            if (!audioUrl || audioUrl === 'STREAMING_BYTES_LOCAL') {
                throw new Error('La API no devolvió un archivo de audio utilizable');
            }

            const audioRes = await fetch(audioUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!audioRes.ok) {
                throw new Error(`Error descargando el audio: ${audioRes.status}`);
            }

            const buffer = Buffer.from(await audioRes.arrayBuffer());

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

            await responder.texto(
                `❌ Error: ${error?.message || 'No se pudo generar el audio'}`
            );
        }
    }
};