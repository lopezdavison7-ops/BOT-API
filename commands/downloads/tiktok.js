// commands/downloads/tiktok.js
import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'tiktok',
    categoria: 'descargas',
    alias: ['tt'],
    descripcion: 'Descarga video de TikTok (con prioridad HD). Uso: .tiktok <link>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) {
            return responder.texto(
                `❌ *TIKTOK*\n\n` +
                `Manda un link de TikTok.\n\n` +
                `📌 Ejemplo:\n` +
                `*.tiktok https://vm.tiktok.com/xxxx*`
            );
        }

        // Intentar descargar hasta 3 veces si falla
        let intentos = 0;
        let data = null;
        let fallo = '';

        while (intentos < 3) {
            try {
                data = await llamarApi('/api/v1/download/tiktok', { url: argumento });
                if (data?.status) break;
                fallo = data?.message || 'Error desconocido';
            } catch {
                fallo = 'Error de conexión con la API';
            }
            intentos++;
            if (intentos < 3) await new Promise(r => setTimeout(r, 1500)); // esperar antes de reintentar
        }

        if (!data?.status) {
            return responder.texto(
                `╭━━〔 ❌ 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n` +
                `┃\n` +
                `┃ No se pudo descargar el video.\n` +
                `┃\n` +
                `┃ ⚠️ ${fallo}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        // Prioridad: HD > SD > cualquier otro
        const videoUrl = data.result.hdplay || data.result.play || data.result.download || null;

        if (!videoUrl) {
            return responder.texto(
                `╭━━〔 ❌ 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n` +
                `┃\n` +
                `┃ La API no devolvió un enlace de video válido.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        const titulo = data.result.title || '🎥 TikTok';

        const caption = `
╭〔 🎥 𝐓𝐈𝐊𝐓𝐎𝐊 〕⬣
┃
┃ 📌 ${titulo}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

        await responder.video(videoUrl, caption);
    }
};