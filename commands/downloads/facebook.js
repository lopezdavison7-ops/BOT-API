// commands/descargas/facebook.js
// ============================================================
// BOT-API — FACEBOOK DOWNLOADER
// ============================================================
// .fb <url> - Descarga videos de Facebook
// ============================================================

export default {
    nombre: 'facebook',
    categoria: 'Descargas',
    alias: ['fb', 'fbdl', 'facebookdl'],
    descripcion: 'Descarga videos de Facebook',
    uso: '.fb <url del video>',
    ejecutar: async ({ argumento, responder }) => {
        const url = String(argumento || '').trim();

        if (!url) {
            return await responder.texto(
                '╭━━〔 📘 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la URL del video\n' +
                '┃\n' +
                '┃ 💡 Uso:\n' +
                '┃ .fb https://facebook.com/share/v/...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Validar que sea URL de Facebook
        if (!/facebook\.com|fb\.watch/i.test(url)) {
            return await responder.texto('❌ La URL debe ser de Facebook');
        }

        try {
            const apiUrl = `https://api.delirius.online/download/facebook?url=${encodeURIComponent(url)}`;
            const res = await fetch(apiUrl);

            if (!res.ok) {
                return await responder.texto('❌ Error al conectar con la API');
            }

            const json = await res.json();

            if (!json.status || !json.list || json.list.length === 0) {
                return await responder.texto('❌ No se pudo procesar el video. Verifica que la URL sea correcta.');
            }

            // Obtener la mejor calidad (primera disponible)
            const mejorCalidad = json.list[0];
            const videoUrl = mejorCalidad.url;
            const calidad = mejorCalidad.quality || 'Desconocida';

            // Enviar thumbnail con info
            if (json.thumb) {
                await responder.imagen(
                    { url: json.thumb },
                    `╭━━〔 📘 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐃𝐋 〕━━⬣\n` +
                    `┃\n` +
                    `┃ 🎬 *Video de Facebook*\n` +
                    `┃ 🎥 Calidad: ${calidad}\n` +
                    `┃\n` +
                    `┃ 📥 Enviando video...\n` +
                    `┃\n` +
                    `╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`
                );
            }

            // Intentar enviar el video
            try {
                await responder.video(
                    { url: videoUrl },
                    `📘 *Facebook Video*\n🎥 Calidad: ${calidad}`
                );
            } catch (e) {
                // Si el video es muy grande, enviar link
                await responder.texto(
                    '╭━━〔 📘 𝐅𝐀𝐂𝐄𝐁𝐎𝐎𝐊 𝐃𝐋 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 🎬 *Video de Facebook*\n' +
                    '┃ 🎥 Calidad: ' + calidad + '\n' +
                    '┃\n' +
                    '┃ ⚠️ Video muy grande para WhatsApp\n' +
                    '┃\n' +
                    '┃ 🔗 *Link de descarga:*\n' +
                    '┃ ' + videoUrl + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

        } catch (error) {
            console.error('[FB] Error:', error?.message || error);
            await responder.texto('❌ Error procesando el video: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};