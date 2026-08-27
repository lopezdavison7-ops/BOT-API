// commands/downloads/tiktoksearch.js

export default {
    nombre: 'tiktoksearch',
    categoria: 'descargas',
    alias: ['tts', 'ttsearch'],
    descripcion: 'Busca videos en TikTok',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const jid = msg?.key?.remoteJid;
        const consulta = argumento?.trim();

        if (!consulta) {
            return await responder.texto('❌ Uso: .tiktoksearch texto_a_buscar');
        }

        try {
            await responder.texto('🔎 Buscando en TikTok...');

            const apiUrl = `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(consulta)}&count=10`;

            const res = await fetch(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            if (!res.ok) {
                throw new Error(`Error de API: ${res.status}`);
            }

            const json = await res.json();

            if (!json?.data?.videos?.length) {
                throw new Error('No se encontraron resultados');
            }

            const videos = json.data.videos;

            let texto = `╭━━〔 🔎 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐄𝐀𝐑𝐂𝐇 〕━━⬣\n┃\n`;

            videos.slice(0, 10).forEach((video, index) => {
                texto += `┃ ${index + 1}. ${video.title || 'Sin título'}\n`;
                texto += `┃ 👤 @${video.author?.unique_id || 'desconocido'}\n`;
                texto += `┃ 🔗 https://www.tiktok.com/@${video.author?.unique_id || 'user'}/video/${video.video_id || ''}\n┃\n`;
            });

            texto += '╰━━━━━━━━━━━━━━━━⬣';

            await responder.texto(texto);

        } catch (error) {
            console.error('[TIKTOKSEARCH] Error:', error);

            await responder.texto(
                `❌ Error: ${error?.message || 'No se pudo realizar la búsqueda'}`
            );
        }
    }
};