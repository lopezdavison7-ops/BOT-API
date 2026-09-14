// commands/descargas/xvideos.js
// ============================================================
// BOT-API — XVIDEOS (búsqueda + descarga en 2 pasos)
// ============================================================

const API_BUSCAR = 'https://api.delirius.online/tools/xvideos?query=';

async function descargarVideo(video, responder) {
    await responder.texto('⏳ Procesando video...');

    const endpoints = [
        'https://api.delirius.online/tools/xvideosdl?url=',
        'https://api.delirius.online/download/xvideos?url=',
        'https://api.delirius.online/tools/xvideosdl?link='
    ];

    for (const base of endpoints) {
        try {
            const res = await fetch(base + encodeURIComponent(video.url));
            
            let json;
            try {
                json = await res.json();
            } catch (e) {
                continue; // No es JSON, probar siguiente endpoint
            }

            const d = json.data || json.datos;
            if (!d) continue;

            const link = d.descargar || d.descarga || d.download || d.url_mp4 || null;
            const thumb = d.imagen || d.image || video.image || null;
            const titulo = d.title || d.titulo || video.title || 'Video';

            if (!link) continue;

            const info =
                '╭━━〔 🔞 𝐕𝐈𝐃𝐄𝐎 〕━━\n' +
                '┃\n' +
                '┃ 🎬 *' + titulo + '*\n' +
                (d.duración || d.duration ? '┃ ⏱️ ' + (d.duración || d.duration) + '\n' : '') +
                (d.vistas || d.views ? '┃ 👁️ ' + (d.vistas || d.views) + '\n' : '') +
                (d.quality ? '┃ 🎥 ' + d.quality + '\n' : '') +
                '┃\n' +
                '┃ 📥 Enviando...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━';

            if (thumb) {
                try { await responder.imagen({ url: thumb }, info); } catch (e) {}
            }

            try {
                await responder.video({ url: link }, '🔞 *' + titulo + '*');
            } catch (e) {
                await responder.texto('🔗 *Link de descarga:*\n' + link);
            }
            return true;
        } catch (e) {
            continue;
        }
    }

    // Fallback: mostrar thumb + link de la página
    if (video.image) {
        await responder.imagen(
            { url: video.image },
            '╭━━〔 🔞 𝐗𝐕𝐈𝐃𝐄𝐎𝐒 〕━━⬣\n' +
            '┃\n' +
            '┃ 🎬 *' + (video.title || 'Video') + '*\n' +
            (video.duration ? '┃ ⏱️ ' + video.duration + '\n' : '') +
            (video.quality ? '┃ 🎥 ' + video.quality + '\n' : '') +
            (video.author ? '┃ 👤 ' + video.author + '\n' : '') +
            '┃\n' +
            '┃ ❌ No se pudo descargar directo\n' +
            '┃ 🔗 Ver aquí:\n┃ ' + video.url + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    } else {
        await responder.texto('❌ No se pudo descargar. Link:\n' + video.url);
    }
    return false;
}

export default {
    nombre: 'xvideos',
    categoria: 'Descargas',
    alias: ['xv', 'xvsearch', 'xvdl'],
    descripcion: 'Busca y descarga videos de Xvideos',
    uso: '.xvideos <búsqueda> · .xvideos <número> · .xvideos <url>',
    ejecutar: async ({ msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🔞 𝐗𝐕𝐈𝐃𝐄𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 📋 Cómo usar:\n' +
                '┃\n' +
                '┃ 1️⃣ Busca: .xvideos mia khalifa\n' +
                '┃ 2️⃣ Elige: .xvideos 3\n' +
                '┃\n' +
                '┃ 💡 También por URL:\n' +
                '┃ .xvideos https://xvideos.com/...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // CASO 1: NÚMERO → descargar elegido
        // ============================================
        if (/^\d+$/.test(q)) {
            const mapa = global.xvMap?.[jid];
            const video = mapa?.[Number(q)];
            if (!video) {
                return await responder.texto('❌ Ese número no existe.\nPrimero busca: .xvideos <texto>');
            }
            return await descargarVideo(video, responder);
        }

        // ============================================
        // CASO 2: URL → descarga directa
        // ============================================
        if (/^https?:\/\//i.test(q)) {
            return await descargarVideo({ url: q, title: 'Video' }, responder);
        }

        // ============================================
        // CASO 3: BÚSQUEDA
        // ============================================
        try {
            const res = await fetch(API_BUSCAR + encodeURIComponent(q));
            
            let json;
            try {
                json = await res.json();
            } catch (e) {
                return await responder.texto('❌ Error parseando respuesta de la API.');
            }

            if (!json.status || !Array.isArray(json.data) || json.data.length === 0) {
                return await responder.texto('❌ Sin resultados para: *' + q + '*');
            }

            const lista = json.data.slice(0, 10);

            // Guardar mapa para elegir por número
            global.xvMap = global.xvMap || {};
            global.xvMap[jid] = {};

            let txt =
                '╭━━〔 🔞 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒: ' + q.toUpperCase() + ' 〕━━⬣\n' +
                '┃\n';

            lista.forEach((v, i) => {
                global.xvMap[jid][i + 1] = v;
                txt +=
                    '┃ *' + (i + 1) + '.* ' + String(v.title).slice(0, 60) + '\n' +
                    '┃      ' + (v.duration || '?') + ' · 🎥 ' + (v.quality || '?') + '\n' +
                    '┃\n';
            });

            txt +=
                '┃ 📥 Descarga: .xvideos <número>\n' +
                '┃    Ej: .xvideos 1\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (lista[0]?.image) {
                await responder.imagen({ url: lista[0].image }, txt);
            } else {
                await responder.texto(txt);
            }

        } catch (error) {
            console.error('[XVIDEOS] Error:', error?.message || error);
            await responder.texto('❌ Error buscando: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};