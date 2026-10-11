

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

        if (!/facebook\.com|fb\.watch/i.test(url)) {
            return await responder.texto('❌ La URL debe ser de Facebook');
        }

        if (/facebook\.com\/share\/v\/?$/i.test(url) || /facebook\.com\/share\/r\/?$/i.test(url)) {
            return await responder.texto(
                '❌ El enlace está incompleto.\n' +
                '👉 Copia el enlace completo desde la app.\n' +
                'Ej: https://www.facebook.com/share/v/XXXXXXXX/'
            );
        }

        try {
            const apiUrl = `https://api.delirius.online/download/facebook?url=${encodeURIComponent(url)}`;
            const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20000) });

            let json = null;
            try {
                json = await res.json();
            } catch {}

            if (!json || json.status === false || !Array.isArray(json.list) || json.list.length === 0) {
                const detalle = json?.msg || json?.message;
                if (detalle && /status code 500/i.test(detalle)) {
                    return await responder.texto('❌ El enlace no es válido o el video ya no está disponible.');
                }
                if (detalle) {
                    return await responder.texto('❌ No se pudo procesar el video: ' + detalle);
                }
                return await responder.texto('❌ Error al conectar con la API (' + res.status + ')');
            }

            const mejorCalidad = json.list[0];
            const videoUrl = mejorCalidad.url;
            const calidad = mejorCalidad.quality || 'Desconocida';

            if (json.thumb) {
                try {
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
                    ).catch(() => {});
                } catch {}
            }

            try {
                await responder.video(
                    { url: videoUrl },
                    `📘 *Facebook Video*\n🎥 Calidad: ${calidad}`
                ).catch(async () => {
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
                    ).catch(() => {});
                });
            } catch (e) {}
        } catch (error) {
            console.error('[FB] Error:', error?.message || error);
            await responder.texto('❌ Error procesando el video: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};