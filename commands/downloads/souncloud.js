import fetch from 'node-fetch';

const API_SEARCH = 'https://api.delirius.online/search/soundcloud?q=';
const API_DOWNLOAD = 'https://api.delirius.online/download/soundcloud?url=';

function pick(obj, keys) {
    if (!obj) return undefined;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
}

function formatDuration(ms) {
    if (!ms) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function downloadAndSend(track, sock, jid, msg) {
    try {
        const res = await fetch(API_DOWNLOAD + encodeURIComponent(track.link), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(20000)
        });

        if (!res.ok) throw new Error('API de descarga falló (' + res.status + ')');

        const data = await res.json();

        const info = pick(data, ['datos', 'data', 'result']) || {};
        const downloadUrl = pick(info, ['descargar', 'download', 'url', 'dl', 'audio', 'mp3']);

        if (!downloadUrl) {
            throw new Error('La API no devolvió link de descarga');
        }

        const audioRes = await fetch(downloadUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(30000)
        });

        if (!audioRes.ok) throw new Error('Fallo al descargar el buffer (' + audioRes.status + ')');

        const arrayBuffer = await audioRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length < 1000) throw new Error('Buffer vacío');

        const cleanTitle = String(track.titulo || 'track').replace(/[^\w\s.-]/g, '').trim().slice(0, 40);
        const cleanAuthor = String(track.artista || 'soundcloud').replace(/[^\w\s.-]/g, '').trim().slice(0, 20);
        const fileName = `${cleanTitle} - ${cleanAuthor}.mp3`;

        await sock.sendMessage(jid, {
            document: buffer,
            mimetype: 'audio/mpeg',
            fileName: fileName,
            caption:
                '╭━━〔  𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + track.titulo + '*\n' +
                '┃ 👤 ' + track.artista + '\n' +
                '┃ ⏱️ ' + formatDuration(track.duracion) + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });

    } catch (error) {
        console.error('[SC] Error descarga:', error.message);
        await sock.sendMessage(jid, {
            text: '❌ Error al descargar: ' + error.message
        }, { quoted: msg });
    }
}

export default {
    nombre: 'soundcloud',
    categoria: 'Descargas',
    alias: ['sc', 'sound'],
    descripcion: 'Busca y descarga música de SoundCloud',
    uso: '.soundcloud <búsqueda>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();

        if (!q) {
            return await responder.texto(
                '╭━━〔 🎵 𝐒𝐎𝐔𝐍𝐃𝐂𝐋𝐎𝐔𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe qué buscar\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .sc dalex hola\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            await responder.texto('🔍 Buscando en SoundCloud...');

            const res = await fetch(API_SEARCH + encodeURIComponent(q), {
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
                artista: pick(primero, ['artista', 'artist', 'author', 'username']) || 'Desconocido',
                duracion: Number(pick(primero, ['duración', 'duration', 'duration_ms', 'dur']) || 0),
                imagen: pick(primero, ['imagen', 'image', 'thumbnail', 'artwork']) || null,
                link: pick(primero, ['link', 'url', 'permalink_url', 'permalink']) || null
            };

            if (!track.link) {
                return await responder.texto('❌ El primer resultado no tiene link válido.');
            }

            await downloadAndSend(track, sock, jid, msg);

        } catch (error) {
            console.error('[SC] Error:', error.message);
            await responder.texto('❌ Error: ' + error.message);
        }
    }
};