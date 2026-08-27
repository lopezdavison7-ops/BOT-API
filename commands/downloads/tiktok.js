// commands/downloads/tiktok.js

export default {
    nombre: 'tiktok',
    categoria: 'descargas',
    alias: ['tt'],
    descripcion: 'Descarga videos de TikTok sin marca de agua',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const jid = msg?.key?.remoteJid;
        const consulta = argumento?.trim();

        if (!consulta) {
            return await responder.texto('❌ Uso: .tiktok link_o_busqueda');
        }

        try {
            await responder.texto('⏳ Descargando video...');

            const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(consulta)}`;

            const res = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!res.ok) {
                throw new Error(`Error de API: ${res.status}`);
            }

            const json = await res.json();

            if (!json?.data?.play) {
                throw new Error('No se encontró el video de descarga');
            }

            const linkVideo = json.data.play;

            const videoRes = await fetch(linkVideo, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!videoRes.ok) {
                throw new Error(`Error al descargar el video: ${videoRes.status}`);
            }

            const buffer = Buffer.from(await videoRes.arrayBuffer());

            await sock.sendMessage(
                jid,
                {
                    video: buffer,
                    caption: '✅ TikTok sin marca'
                },
                {
                    quoted: msg
                }
            );

        } catch (error) {
            console.error('[TIKTOK] Error:', error);

            await responder.texto(
                `❌ Error: ${error?.message || 'No se pudo descargar el video'}`
            );
        }
    }
};