

const API_BUSCAR = 'https://api.delirius.online/search/applemusic?query=';
const API_DESCARGAR = 'https://api.delirius.online/download/applemusic?url=';

async function descargarYEnviar(sock, msg, jid, urlCancion, responder) {
    const res = await fetch(API_DESCARGAR + encodeURIComponent(urlCancion));
    const json = await res.json();

    const d = json.data || json.datos;

    if (!json.status || !d) {
        return await responder.texto('❌ No se pudo procesar la canción.\nVerifica que el enlace sea válido.');
    }

    const titulo = d.title || d.título || 'Sin título';
    const artista = d.artist || d.artista || 'Desconocido';
    const album = d.album || d.álbum || null;
    const imagen = d.image || d.imagen || null;
    const link = d.download || d.descargar || null;

    if (!link) {
        return await responder.texto('❌ La API no devolvió link de descarga.');
    }

    const caption =
        '╭━━〔 🎵 𝐀𝐏𝐏𝐋𝐄 𝐌𝐔𝐒𝐈𝐂 〕━━⬣\n' +
        '┃\n' +
        '┃ 🎶 *' + titulo + '*\n' +
        '┃ 🎤 ' + artista + '\n' +
        (album ? '┃ 💿 ' + album + '\n' : '') +
        '┃\n' +
        '┃ 📥 Enviando audio...\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    if (imagen) {
        try {
            await responder.imagen({ url: imagen }, caption);
        } catch (e) {
            await responder.texto(caption);
        }
    } else {
        await responder.texto(caption);
    }

    try {
        await sock.sendMessage(
            jid,
            {
                audio: { url: link },
                mimetype: 'audio/mpeg',
                fileName: titulo + ' - ' + artista + '.mp3',
                ptt: false
            },
            { quoted: msg }
        );
    } catch (errorAudio) {
        console.error('[APPLEMUSIC] Error por URL:', errorAudio?.message || errorAudio);

        const resAudio = await fetch(link);
        if (!resAudio.ok) throw new Error('HTTP ' + resAudio.status + ' descargando audio');

        const buffer = Buffer.from(await resAudio.arrayBuffer());
        if (!buffer.length) throw new Error('El audio vino vacío');

        await sock.sendMessage(
            jid,
            {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: titulo + ' - ' + artista + '.mp3',
                ptt: false
            },
            { quoted: msg }
        );
    }
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
                await descargarYEnviar(s, msg, chatJid, cancion.url, responder);
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
            const res = await fetch(API_BUSCAR + encodeURIComponent(q));
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
                    return await descargarYEnviar(s, msg, chatJid, urlUnica, responder);
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
                    await responder.imagen({ url: primeraImg }, txt);
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