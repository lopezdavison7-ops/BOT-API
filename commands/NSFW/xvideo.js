// commands/descargas/xvideos.js
// ============================================================
// BOT-API — XVIDEOS (prueba múltiples endpoints)
// ============================================================

const ENDPOINTS = [
    'https://api.delirius.online/tools/xvideos?query=',
    'https://api.delirius.online/api/xvideos/search?q=',
    'https://api.delirius.online/search/xvideos?q=',
    'https://api.delirius.online/xvideos/search?q=',
    'https://api.delirius.online/nsfw/xvideos?query=',
    'https://api.delirius.online/tools/xvideos-search?query=',
    'https://api.delirius.online/search?query=xvideos&text='
];

const ENDPOINTS_DL = [
    'https://api.delirius.online/tools/xvideosdl?url=',
    'https://api.delirius.online/api/xvideos/download?url=',
    'https://api.delirius.online/download/xvideos?url=',
    'https://api.delirius.online/xvideos/download?url='
];

async function buscarVideos(query, responder) {
    let ultimoError = '';
    
    for (const endpoint of ENDPOINTS) {
        try {
            const url = endpoint + encodeURIComponent(query);
            const res = await fetch(url);
            
            if (res.status === 404) continue; // Endpoint no existe, probar siguiente
            
            const texto = await res.text();
            
            let json;
            try {
                json = JSON.parse(texto);
            } catch (e) {
                ultimoError = `Status ${res.status}: No es JSON`;
                continue;
            }

            // Buscar datos en diferentes formatos
            const datos = json.data || json.results || json.videos || json.datos;
            
            if (!datos || !Array.isArray(datos) || datos.length === 0) {
                ultimoError = 'Sin resultados';
                continue;
            }

            return { endpoint, datos, json };
            
        } catch (error) {
            ultimoError = error?.message || 'Error desconocido';
        }
    }
    
    return { error: ultimoError || 'Ningún endpoint funcionó' };
}

async function descargarVideo(video, responder) {
    await responder.texto('⏳ Procesando video...');

    for (const endpoint of ENDPOINTS_DL) {
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
            const resultado = await buscarVideos(q, responder);

            if (resultado.error) {
                return await responder.texto(
                    '╭━━〔 🔴 𝐀𝐏𝐈 𝐍𝐎 𝐃𝐈𝐒𝐏𝐎𝐍𝐈𝐁𝐋𝐄 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ❌ ' + resultado.error + '\n' +
                    '┃\n' +
                    '┃ 📡 Se probaron ' + ENDPOINTS.length + ' endpoints\n' +
                    '┃\n' +
                    '┃ 💡 La API de Delirius no tiene\n' +
                    '┃    endpoint de xvideos disponible\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const lista = resultado.datos.slice(0, 10);

            global.xvMap = global.xvMap || {};
            global.xvMap[jid] = {};

            let txt = '╭━━〔 🔞 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n┃\n';

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