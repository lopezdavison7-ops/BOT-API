

import fetch from 'node-fetch';

// ───────────── CONFIGURACIÓN ─────────────
const API_BUSQUEDA = 'https://api.delirius.online/search/ytsearch';
const API_DESCARGA = 'https://api.delirius.online/download/ytmp3';
// ─────────────────────────────────────────

function jidANumero(jid) {
    return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
}

// ───────────── BUSCAR EN YOUTUBE ─────────────
async function buscarYouTube(query) {
    const url = `${API_BUSQUEDA}?q=${encodeURIComponent(query)}`;

    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) throw new Error(`Búsqueda falló: ${res.status}`);

    const data = await res.json();

    if (!data.estado && !data.status) {
        throw new Error(data.message || 'No se pudo buscar');
    }

    const resultados = data.datos || data.data || [];

    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error('No se encontraron resultados para: ' + query);
    }

    // Tomar el primer video (filtrando lives si existen)
    const video = resultados.find(v => !v.isLive && !v.enVivo) || resultados[0];

    return {
        videoId: video.videoId,
        url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
        titulo: video.título || video.title,
        descripcion: video.descripción || video.description,
        thumbnail: video.imagen || video.miniatura || video.thumbnail,
        duracion: video.duración || video.duration,
        vistas: video.vistas || video.views,
        publicado: video.publicadoEn || video.uploaded,
        autor: {
            nombre: video.autor?.nombre || video.autor?.name || 'Desconocido',
            url: video.autor?.url
        }
    };
}

// ───────────── DESCARGAR MP3 ─────────────
async function descargarMP3(youtubeUrl) {
    const url = `${API_DESCARGA}?url=${encodeURIComponent(youtubeUrl)}`;

    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) throw new Error(`Descarga falló: ${res.status}`);

    const data = await res.json();

    if (!data.status && !data.estado) {
        throw new Error(data.message || 'No se pudo obtener el MP3');
    }

    const info = data.data || data.datos || {};

    return {
        titulo: info.title || info.titulo,
        autor: info.author || info.autor,
        canal: info.channel || info.canal,
        vistas: info.views || info.vistas,
        likes: info.likes,
        thumbnail: info.image || info.imagen,
        formato: info.format || info.formato,
        downloadUrl: info.download || info.descarga
    };
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'play',
    categoria: 'downloader',
    alias: ['p', 'musica', 'reproducir', 'song', 'audio'],
    descripcion: 'Busca en YouTube y descarga el audio del primer resultado.',
    uso: '.play <nombre de canción>',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre de la canción\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play twice fancy\n' +
                '┃ ➪ .play yan block 444\n' +
                '┃ ➪ .play bad bunny titi me pregunto\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // PASO 1: Buscar en YouTube
            await responder.texto('🔍 [1/3] Buscando en YouTube...');

            const video = await buscarYouTube(query);

            console.log(`[PLAY] Encontrado: ${video.titulo} (${video.url})`);

            // PASO 2: Enviar preview con info
            const captionPreview =
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 Autor: ' + video.autor.nombre + '\n' +
                '┃ ⏱️ Duración: ' + video.duracion + '\n' +
                '┃ 👀 Vistas: ' + formatearVistas(video.vistas) + '\n' +
                '┃ 📅 Publicado: ' + video.publicado + '\n' +
                '┃\n' +
                '┃ ⬇️ Descargando audio...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            if (video.thumbnail) {
                try {
                    await sock.sendMessage(msg.key.remoteJid, {
                        image: { url: video.thumbnail },
                        caption: captionPreview
                    }, { quoted: msg });
                } catch (e) {
                    await responder.texto(captionPreview);
                }
            } else {
                await responder.texto(captionPreview);
            }

            // PASO 3: Descargar MP3
            console.log('[PLAY] Obteniendo MP3...');
            const mp3 = await descargarMP3(video.url);

            if (!mp3.downloadUrl) {
                throw new Error('La API no devolvió link de descarga');
            }

            console.log('[PLAY] Descargando audio de:', mp3.downloadUrl);

            // Descargar el buffer del audio
            const audioRes = await fetch(mp3.downloadUrl, {
                signal: AbortSignal.timeout(60000)
            });

            if (!audioRes.ok) {
                throw new Error('No se pudo descargar el audio: ' + audioRes.status);
            }

            const audioBuffer = await audioRes.arrayBuffer();
            const buffer = Buffer.from(audioBuffer);

            if (!buffer.length) {
                throw new Error('El audio está vacío');
            }

            console.log(`[PLAY] Audio descargado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

            // Enviar audio
            await sock.sendMessage(msg.key.remoteJid, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: mp3.titulo || video.titulo,
                        body: '🎵 BOT-API • Play',
                        thumbnailUrl: mp3.thumbnail || video.thumbnail,
                        mediaType: 1,
                        mediaUrl: video.url,
                        sourceUrl: video.url,
                        showAdAttribution: true,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: msg });

            console.log('[PLAY] ✅ Audio enviado correctamente');

        } catch (error) {
            console.error('[PLAY] ❌ Error:', error?.message || error);

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo reproducir la canción.\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '┃    o verifica tu conexión.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};