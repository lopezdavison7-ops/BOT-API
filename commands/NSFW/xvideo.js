

const API_BUSCAR = 'https://api.delirius.online/search/xvideos?query=';

async function descargarVideo(video, responder) {
    await responder.texto('⏳ Procesando video...');

    const endpoints = [
        'https://api.delirius.online/download/xvideos?url=',
        'https://api.delirius.online/tools/xvideosdl?url=',
        'https://api.delirius.online/api/xvideos/download?url='
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await fetch(endpoint + encodeURIComponent(video.url));

            if (res.status === 404) continue;

            const texto = await res.text();
            let json;
            try { json = JSON.parse(texto); } catch (e) { continue; }

            const d = json.data || json.datos;
            if (!d) continue;

            const link = d.descargar || d.descarga || d.download || d.url_mp4 || d.video || null;
            const thumb = d.imagen || d.image || d.thumbnail || video.image || null;
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

        if (/^\d+$/.test(q)) {
            const mapa = global.xvMap?.[jid];
            const video = mapa?.[Number(q)];
            if (!video) {
                return await responder.texto('❌ Ese número no existe. Busca primero: `.xvideos <texto>`');
            }
            return await descargarVideo(video, responder);
        }

        if (/^https?:\/\//i.test(q)) {
            return await descargarVideo({ url: q, title: 'Video' }, responder);
        }

        try {
            const url = API_BUSCAR + encodeURIComponent(q);
            const res = await fetch(url);

            if (res.status === 404) {
                return await responder.texto('❌ Endpoint no disponible (404)');
            }

            const texto = await res.text();
            let json;
            try {
                json = JSON.parse(texto);
            } catch (e) {
                return await responder.texto(
                    '❌ Error parseando respuesta\n' +
                    'Status: ' + res.status + '\n' +
                    'Respuesta: ' + texto.substring(0, 200)
                );
            }

            if (!json.status || !Array.isArray(json.data) || json.data.length === 0) {
                return await responder.texto('❌ Sin resultados para: *' + q + '*');
            }

            const lista = json.data.slice(0, 10);

            global.xvMap = global.xvMap || {};
            global.xvMap[jid] = {};

            let txt = '╭━━〔 🔞 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒: ' + q.toUpperCase() + ' 〕━━⬣\n┃\n';

            lista.forEach((v, i) => {
                global.xvMap[jid][i + 1] = v;
                txt += '┃ *' + (i + 1) + '.* ' + String(v.title || v.titulo || 'Video').slice(0, 50) + '\n';
                txt += '┃    ⏱ ' + (v.duration || v.duración || '?') + ' · 🎥 ' + (v.quality || v.calidad || '?') + '\n┃\n';
            });

            txt += '┃ 📥 Elige: `.xvideos <número>`\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const primerVideo = lista[0];
            const thumb = primerVideo?.image || primerVideo?.imagen || primerVideo?.thumbnail;

            if (thumb) {
                await responder.imagen({ url: thumb }, txt);
            } else {
                await responder.texto(txt);
            }

        } catch (error) {
            await responder.texto('❌ Error: ' + (error?.message || String(error)));
        }
    }
};