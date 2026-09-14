// commands/descargas/xvideos.js
// ============================================================
// BOT-API — XVIDEOS (debug directo en el mensaje)
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
            const texto = await res.text();
            
            let json;
            try { json = JSON.parse(texto); } catch (e) { continue; }

            const d = json.data || json.datos;
            if (!d) continue;

            const link = d.descargar || d.descarga || d.download || d.url_mp4 || null;
            const thumb = d.imagen || d.image || video.image || null;
            const titulo = d.title || d.titulo || video.title || 'Video';

            if (!link) continue;

            if (thumb) {
                try {
                    await responder.imagen(
                        { url: thumb },
                        '🎬 *' + titulo + '*\n📥 Enviando video...'
                    );
                } catch (e) {}
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

    // Fallback
    if (video.image) {
        await responder.imagen(
            { url: video.image },
            '🎬 *' + (video.title || 'Video') + '*\n\n' +
            '❌ No se pudo descargar directo\n' +
            '🔗 Ver aquí: ' + video.url
        );
    } else {
        await responder.texto('❌ No se pudo descargar.\n🔗 ' + video.url);
    }
    return false;
}

export default {
    nombre: 'xvideos',
    categoria: 'Descargas',
    alias: ['xv', 'xvsearch', 'xvdl'],
    descripcion: 'Busca y descarga videos de Xvideos',
    uso: '.xvideos <búsqueda>',
    ejecutar: async ({ msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto('❌ Escribe qué buscar: `.xvideos mia khalifa`');
        }

        // Número → descargar elegido
        if (/^\d+$/.test(q)) {
            const mapa = global.xvMap?.[jid];
            const video = mapa?.[Number(q)];
            if (!video) {
                return await responder.texto('❌ Ese número no existe. Busca primero: `.xvideos <texto>`');
            }
            return await descargarVideo(video, responder);
        }

        // URL directa
        if (/^https?:\/\//i.test(q)) {
            return await descargarVideo({ url: q, title: 'Video' }, responder);
        }

        // Búsqueda
        try {
            const url = API_BUSCAR + encodeURIComponent(q);

            const res = await fetch(url);
            const texto = await res.text();

            // Intentar parsear
            let json;
            try {
                json = JSON.parse(texto);
            } catch (e) {
                return await responder.texto(
                    '╭━━〔 🔴 𝐄𝐑𝐑𝐎𝐑 𝐃𝐄 𝐀𝐏𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ No devolvió JSON válido\n' +
                    '┃\n' +
                    '┃ 📡 Status: ' + res.status + '\n' +
                    '┃ 📄 Content-Type: ' + (res.headers.get('content-type') || 'N/A') + '\n' +
                    '┃\n' +
                    '┃ 📝 Respuesta:\n' +
                    '┃ ' + texto.substring(0, 300) + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            if (!json.status || !Array.isArray(json.data) || json.data.length === 0) {
                return await responder.texto(
                    '❌ Sin resultados para: *' + q + '*\n\n' +
                    '📡 Status: ' + res.status + '\n' +
                    '📦 JSON: ' + JSON.stringify(json).substring(0, 200)
                );
            }

            const lista = json.data.slice(0, 10);

            global.xvMap = global.xvMap || {};
            global.xvMap[jid] = {};

            let txt = '╭━━〔 🔞 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒: ' + q.toUpperCase() + ' 〕━━⬣\n┃\n';

            lista.forEach((v, i) => {
                global.xvMap[jid][i + 1] = v;
                txt += '┃ *' + (i + 1) + '.* ' + String(v.title).slice(0, 50) + '\n';
                txt += '┃    ⏱ ' + (v.duration || '?') + ' · 🎥 ' + (v.quality || '?') + '\n┃\n';
            });

            txt += '┃ 📥 Elige: `.xvideos <número>`\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (lista[0]?.image) {
                await responder.imagen({ url: lista[0].image }, txt);
            } else {
                await responder.texto(txt);
            }

        } catch (error) {
            await responder.texto(
                '╭━━〔 🔴 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ ' + (error?.message || String(error)) + '\n' +
                '┃\n' +
                '┃ 📡 Tipo: ' + (error?.name || 'Desconocido') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};