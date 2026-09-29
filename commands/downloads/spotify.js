import fetch from 'node-fetch';

const API_SEARCH = 'https://api.delirius.online/search/spotify?q=';
const API_DOWNLOAD = 'https://api.delirius.online/download/spotifydl?url=';

function pick(obj, keys) {
    if (!obj) return undefined;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
}

async function downloadAndSend(track, sock, jid, msg) {
    try {
        const res = await fetch(API_DOWNLOAD + encodeURIComponent(track.url), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });

        if (!res.ok) throw new Error('API de descarga falló (' + res.status + ')');

        const json = await res.json();
        const info = pick(json, ['datos', 'data', 'result']) || {};

        const downloadUrl = pick(info, ['descargar', 'download', 'url', 'dl', 'audio', 'mp3', 'link']);
        const titulo = pick(info, ['título', 'title', 'titulo', 'name']) || track.titulo;
        const autor = pick(info, ['autor', 'author', 'artist', 'artists', 'username']) || track.artista;
        const imagen = pick(info, ['imagen', 'image', 'thumbnail', 'cover', 'artwork']) || track.imagen;

        if (!downloadUrl) {
            throw new Error('La API no devolvió link de descarga');
        }

        const audioRes = await fetch(downloadUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(45000)
        });

        if (!audioRes.ok) throw new Error('Fallo al descargar buffer (' + audioRes.status + ')');

        const arrayBuffer = await audioRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 1000) throw new Error('Buffer vacío');

        const cleanTitle = String(titulo || 'track').replace(/[^\w\s.-]/g, '').trim().slice(0, 40);
        const cleanAuthor = String(autor || 'spotify').replace(/[^\w\s.-]/g, '').trim().slice(0, 20);
        const fileName = `${cleanTitle} - ${cleanAuthor}.mp3`;

        const caption =
            '╭━━〔  𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕━━⬣\n' +
            '┃\n' +
            '┃ 🎧 *' + titulo + '*\n' +
            '┃ 👤 ' + autor + '\n' +
            (track.album ? '┃ 💿 ' + track.album + '\n' : '') +
            (track.duracion ? '┃ ⏱️ ' + track.duracion + '\n' : '') +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        if (imagen) {
            try {
                await sock.sendMessage(jid, {
                    image: { url: imagen },
                    caption
                }, { quoted: msg });
            } catch {}
        }

        await sock.sendMessage(jid, {
            document: buffer,
            mimetype: 'audio/mpeg',
            fileName: fileName,
            caption
        }, { quoted: msg });

    } catch (error) {
        console.error('[SPOTIFY] Error descarga:', error.message);
        await sock.sendMessage(jid, {
            text: '❌ Error al descargar: ' + error.message
        }, { quoted: msg });
    }
}

export default {
    nombre: 'spotify',
    categoria: 'Descargas',
    alias: ['sp', 'spoti', 'spotifydl'],
    descripcion: 'Busca y descarga música de Spotify',
    uso: '.spotify <búsqueda> | .spotify <url>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué buscar\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .sp twice fancy\n' +
                '┃ ➪ .sp https://open.spotify.com/track/...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // URL directa de Spotify
        if (/open\.spotify\.com\/track\//i.test(q)) {
            await responder.texto('⏳ Descargando desde Spotify...');
            return await downloadAndSend({
                url: q,
                titulo: 'Spotify Track',
                artista: 'Spotify',
                album: null,
                duracion: null,
                imagen: null
            }, sock, jid, msg);
        }

        try {
            await responder.texto('🔍 Buscando en Spotify...');

            const res = await fetch(API_SEARCH + encodeURIComponent(q) + '&limit=10', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!res.ok) throw new Error('API respondió ' + res.status);

            const json = await res.json();
            const datosCrudos = pick(json, ['datos', 'data', 'result', 'results', 'items']);

            if (!Array.isArray(datosCrudos) || datosCrudos.length === 0) {
                return await responder.texto(
                    '❌ Sin resultados para: *' + q + '*\n\n' +
                    '💡 Intenta con otro nombre o artista.'
                );
            }

            const primero = datosCrudos[0];

            const track = {
                titulo: pick(primero, ['título', 'title', 'titulo', 'name']) || 'Sin título',
                artista: pick(primero, ['artista', 'artist', 'author', 'artists', 'username']) || 'Desconocido',
                album: pick(primero, ['álbum', 'album']) || null,
                duracion: pick(primero, ['duración', 'duration']) || null,
                imagen: pick(primero, ['imagen', 'image', 'thumbnail', 'cover', 'artwork']) || null,
                url: pick(primero, ['url', 'link', 'permalink']) || null
            };

            if (!track.url) {
                return await responder.texto('❌ El primer resultado no tiene link válido.');
            }

            await responder.texto(
                '⏳ Descargando:\n' +
                '🎧 *' + track.titulo + '*\n' +
                '👤 ' + track.artista
            );

            await downloadAndSend(track, sock, jid, msg);

        } catch (error) {
            console.error('[SPOTIFY] Error:', error.message);
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};