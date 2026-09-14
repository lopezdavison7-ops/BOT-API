// commands/descargas/xvideos.js
// ============================================================
// BOT-API — XVIDEOS DOWNLOADER
// ============================================================
// .xvideos <búsqueda> - Busca y muestra info de un video
// ============================================================

export default {
    nombre: 'xvideos',
    categoria: 'NSFW',
    alias: ['xv', 'xvdl', 'xvideosdl'],
    descripcion: 'Busca y descarga videos de Xvideos',
    uso: '.xvideos <búsqueda>',
    ejecutar: async ({ argumento, responder }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto(
                '╭━━〔 🔞 𝐗𝐕𝐈𝐃𝐄𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes indicar qué buscar\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .xvideos amateur\n' +
                '┃ .xvideos latina\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            const apiUrl = `https://api.delirius.online/tools/xvideosdl?url=${encodeURIComponent(query)}`;
            const res = await fetch(apiUrl);
            const json = await res.json();

            if (!json.estado || !json.datos) {
                return await responder.texto('❌ No se encontró ningún video para: *' + query + '*');
            }

            const d = json.datos;

            const mensaje =
                '╭━━〔 🔞 𝐗𝐕𝐈𝐃𝐄𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎬 *' + (d.title || 'Sin título') + '*\n' +
                '┃\n' +
                '┃ ⏱️ Duración: ' + (d.duración || 'N/A') + '\n' +
                '┃ 👁️ Vistas: ' + (d.vistas || 'N/A') + '\n' +
                '┃ 👍 Me gusta: ' + (d['Me gusta'] || 'N/A') + '\n' +
                '┃ 👎 No me gusta: ' + (d['no me gusta'] || 'N/A') + '\n' +
                '┃\n' +
                '┃ 🔗 *Enlace de descarga:*\n' +
                '┃ ' + (d.descargar || 'No disponible') + '\n' +
                '┃\n' +
                '┃ 👤 API: ' + (json.creador || 'Desconocido') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Enviar thumbnail con la info
            if (d.imagen) {
                await responder.imagen(
                    { url: d.imagen },
                    mensaje
                );
            } else {
                await responder.texto(mensaje);
            }

            // Enviar el video directamente si hay URL de descarga
            if (d.descargar) {
                try {
                    await responder.video(
                        { url: d.descargar },
                        '🔞 *' + (d.title || 'Video') + '*'
                    );
                } catch (e) {
                    console.error('[XVIDEOS] Error enviando video:', e?.message);
                    // Si falla, ya envió el link arriba
                }
            }

        } catch (error) {
            console.error('[XVIDEOS] Error:', error?.message || error);
            await responder.texto('❌ Error buscando video: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};