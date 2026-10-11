

const API_BUSCAR = 'https://api.delirius.online/search/applemusic?query=';
const API_DESCARGAR = 'https://api.delirius.online/download/applemusic?url=';
const API_YT_SEARCH = 'https://api.delirius.online/search/ytsearch?q=';
const API_YT_MP3 = 'https://api.delirius.online/download/ytmp3?url=';

const CABECERA = '╭━━〔 🎵 𝐀𝐏𝐏𝐋𝐄 𝐌𝐔𝐒𝐈𝐂 〕━━⬣\n';
const PIE = '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

function queryDesdeUrl(url) {
    const coincidencia = String(url || '').match(/\/album\/([^/]+)\//);
    if (!coincidencia) return '';
    try {
        return decodeURIComponent(coincidencia[1]).replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
        return coincidencia[1].replace(/-/g, ' ').trim();
    }
}

async function enviarAudio(sock, msg, jid, { buffer, link, titulo, artista, album, imagen, responder }) {
    const caption =
        CABECERA +
        '┃\n' +
        '┃ 🎶 *' + titulo + '*\n' +
        '┃ 🎤 ' + artista + '\n' +
        (album ? '┃ 💿 ' + album + '\n' : '') +
        '┃\n' +
        '┃ 📥 Enviando audio...\n' +
        '┃\n' +
        PIE;

    if (imagen) {
        await responder.imagen({ url: imagen }, caption).catch(() => {
            responder.texto(caption).catch(() => {});
        });
    } else {
        await responder.texto(caption).catch(() => {});
    }

    const nombreArchivo = (titulo + ' - ' + artista).slice(0, 120) + '.mp3';

    if (buffer) {
        return await sock.sendMessage(
            jid,
            { audio: buffer, mimetype: 'audio/mpeg', fileName: nombreArchivo, ptt: false },
            { quoted: msg }
        );
    }

    try {
        await sock.sendMessage(
            jid,
            { audio: { url: link }, mimetype: 'audio/mpeg', fileName: nombreArchivo, ptt: false },
            { quoted: msg }
        );
    } catch (errorAudio) {
        console.error('[APPLEMUSIC] Error por URL:', errorAudio?.message || errorAudio);

        const resAudio = await fetch(link, { signal: AbortSignal.timeout(60000) });
        if (!resAudio.ok) throw new Error('HTTP ' + resAudio.status + ' descargando audio');

        const buffer = Buffer.from(await resAudio.arrayBuffer());
        if (!buffer.length) throw new Error('El audio vino vacío');

        await sock.sendMessage(
            jid,
            { audio: buffer, mimetype: 'audio/mpeg', fileName: nombreArchivo, ptt: false },
            { quoted: msg }
        );
    }
}

async function descargarDesdeYouTube(sock, msg, jid, query, meta, responder) {
    const texto = String(query || '').trim();
    if (!texto) {
        return await responder.texto('❌ No se pudo obtener información de la canción.');
    }

    const bus = await fetch(API_YT_SEARCH + encodeURIComponent(texto), { signal: AbortSignal.timeout(15000) });
    const busJson = await bus.json();
    const resultados = busJson.data || busJson.datos;

    if (!busJson.status || !Array.isArray(resultados) || resultados.length === 0) {
        return await responder.texto('❌ No se pudo procesar la canción.\nVerifica que el enlace sea válido.');
    }

    const video = resultados.find(v => (v.type || v.tipo) === 'video' && !(v.isLive || v.enVivo)) || resultados[0];
    const videoUrl = video.url || (video.videoId ? 'https://www.youtube.com/watch?v=' + video.videoId : null);

    if (!videoUrl) {
        return await responder.texto('❌ No se pudo procesar la canción.\nVerifica que el enlace sea válido.');
    }

    const info = await fetch(API_YT_MP3 + encodeURIComponent(videoUrl), { signal: AbortSignal.timeout(20000) });
    const infoJson = await info.json();
    const d = infoJson.data || infoJson.datos;

    if (!infoJson.status || !d || !d.download) {
        return await responder.texto('❌ No se pudo procesar la canción.\nVerifica que el enlace sea válido.');
    }

    const descarga = await fetch(d.download, { signal: AbortSignal.timeout(90000) });
    if (!descarga.ok) {
        return await responder.texto('❌ No se pudo descargar el audio (HTTP ' + descarga.status + ').');
    }

    const buffer = Buffer.from(await descarga.arrayBuffer());
    if (!buffer.length) {
        return await responder.texto('❌ El audio vino vacío.');
    }

    return await enviarAudio(sock, msg, jid, {
        buffer,
        titulo: meta?.titulo || d.title || video.title || 'Sin título',
        artista: meta?.artista || d.author || video.author?.name || video.author || 'Desconocido',
        album: meta?.album || null,
        imagen: meta?.imagen || video.image || video.thumbnail || null,
        responder
    });
}

async function descargarYEnviar(sock, msg, jid, urlCancion, responder, meta) {
    try {
        const res = await fetch(API_DESCARGAR + encodeURIComponent(urlCancion), { signal: AbortSignal.timeout(15000) });
        const json = await res.json();
        const d = json.data || json.datos;

        if (json.status && d) {
            const link = d.download || d.descargar || null;

            if (link) {
                return await enviarAudio(sock, msg, jid, {
                    link,
                    titulo: d.title || d.título || meta?.titulo || 'Sin título',
                    artista: d.artist || d.artista || meta?.artista || 'Desconocido',
                    album: d.album || d.álbum || meta?.album || null,
                    imagen: d.image || d.imagen || meta?.imagen || null,
                    responder
                });
            }
        }
    } catch (error) {
        console.error('[APPLEMUSIC] Falló API Apple, usando respaldo:', error?.message || error);
    }

    const query = meta?.titulo
        ? (meta.artista ? meta.titulo + ' ' + meta.artista : meta.titulo)
        : queryDesdeUrl(urlCancion);

    return await descargarDesdeYouTube(sock, msg, jid, query, meta, responder);
}

export default {
    nombre: 'applemusic',
    categoria: 'descargas',
    alias: ['amusic', 'am', 'applemusicdl'],
    descripcion: 'Busca y descarga música de Apple Music',
    uso: '.applemusic <título> · .applemusic <número> · .applemusic <url>',
    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎵 𝐀𝐏𝐏𝐋 𝐌𝐔𝐒𝐈𝐂 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el título o la URL\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .applemusic twice (buscar)\n' +
                '┃ • .applemusic 3 (descargar de la lista)\n' +
                '┃ • .applemusic https://music.apple.com/... (directo)\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (/^\d+$/.test(q)) {
            const mapa = global.amMap?.[jid];
            const cancion = mapa?.[Number(q)];

            if (!cancion) {
                return await responder.texto('❌ Ese número no existe.\nPrimero busca: .applemusic <título>');
            }

            try {
                await descargarYEnviar(s, msg, chatJid, cancion.url, responder, cancion);
            } catch (error) {
                console.error('[APPLEMUSIC] Error:', error?.message || error);
                await responder.texto('❌ Error descargando: ' + (error?.message || 'Intenta de nuevo'));
            }
            return;
        }

        if (/music\.apple\.com/i.test(q)) {
            try {
                await descargarYEnviar(s, msg, chatJid, q, responder);
            } catch (error) {
                console.error('[APPLEMUSIC] Error:', error?.message || error);
                await responder.texto('❌ Error descargando: ' + (error?.message || 'Intenta de nuevo'));
            }
            return;
        }

        try {
            const res = await fetch(API_BUSCAR + encodeURIComponent(q), { signal: AbortSignal.timeout(15000) });
            const json = await res.json();

            const datos = json.data || json.datos;

            if (!json.status || !Array.isArray(datos) || datos.length === 0) {
                return await responder.texto('❌ No encontré canciones para: *' + q + '*');
            }

            const lista = datos.slice(0, 10);

            if (lista.length === 1) {
                const unica = lista[0];
                const urlUnica = unica.url || unica.enlace;
                if (urlUnica) {
                    return await descargarYEnviar(s, msg, chatJid, urlUnica, responder, {
                        titulo: unica.title || unica.título || null,
                        artista: unica.artist || unica.artista || null,
                        album: unica.album || null,
                        imagen: unica.image || unica.imagen || null
                    });
                }
            }

            global.amMap = global.amMap || {};
            global.amMap[jid] = {};

            let txt =
                '╭━━〔 🎵 𝐑𝐄𝐒𝐔𝐋𝐓𝐀𝐃𝐎𝐒: ' + q.toUpperCase() + ' 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎶 ' + lista.length + ' canción(es)\n' +
                '┃\n';

            lista.forEach((item, i) => {
                global.amMap[jid][i + 1] = {
                    titulo: item.title || item.título || 'Sin título',
                    artista: item.artist || item.artista || 'Desconocido',
                    album: item.album || null,
                    imagen: item.image || item.imagen || null,
                    url: item.url || item.enlace || null
                };

                txt += '┃ *' + (i + 1) + '.* ' + String(item.title || item.título || '?').slice(0, 40) + '\n';
                txt += '┃     🎤 ' + String(item.artist || item.artista || '?').slice(0, 30) + '\n┃\n';
            });

            txt += '┃ 📥 Descarga: .applemusic <número>\n┃    Ej: .applemusic 1\n┃\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const primeraImg = lista[0]?.image || lista[0]?.imagen;

            if (primeraImg) {
                try {
                    await responder.imagen({ url: primeraImg }, txt).catch(() => {
                        responder.texto(txt).catch(() => {});
                    });
                    return;
                } catch (e) {}
            }

            await responder.texto(txt);

        } catch (error) {
            console.error('[APPLEMUSIC] Error buscando:', error?.message || error);
            await responder.texto('❌ Error buscando: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};
