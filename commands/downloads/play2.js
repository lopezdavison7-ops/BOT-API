

import fetch from 'node-fetch';

// ───────────── CONFIGURACIÓN ─────────────
const API_BUSQUEDA = 'https://api.delirius.online/search/ytsearch';
const API_DESCARGA = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p'; // 360p, 480p, 720p, 1080p
// ─────────────────────────────────────────

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

// ───────────── DESCARGAR MP4 ─────────────
async function descargarMP4(youtubeUrl, formato = FORMATO_VIDEO) {
    const url = `${API_DESCARGA}?url=${encodeURIComponent(youtubeUrl)}&format=${formato}`;

    const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) throw new Error(`Descarga falló: ${res.status}`);

    const data = await res.json();

    if (!data.status && !data.estado) {
        throw new Error(data.message || 'No se pudo obtener el video');
    }

    const info = data.data || data.datos || {};

    return {
        titulo: info.title || info.titulo,
        autor: info.author || info.autor,
        canal: info.channel || info.canal,
        vistas: info.views || info.vistas,
        likes: info.likes,
        thumbnail: info.image || info.imagen,
        formato: info.format || info.formato || formato,
        downloadUrl: info.download || info.descarga
    };
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'play2',
    categoria: 'downloader',
    alias: ['playvideo', 'video', 'ytmp4', 'descargarvideo'],
    descripcion: 'Busca en YouTube y descarga el VIDEO del primer resultado.',
    uso: '.play2 <nombre de canción/video>',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎬 𝐏𝐋𝐀𝐘𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre del video\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play2 twice fancy\n' +
                '┃ ➪ .play2 yan block 444\n' +
                '┃ ➪ .play2 bad bunny titi me pregunto\n' +
                '┃\n' +
                '┃ 📊 Calidad: ' + FORMATO_VIDEO + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // PASO 1: Buscar en YouTube
            await responder.texto('🔍 [1/3] Buscando en YouTube...');

            const video = await buscarYouTube(query);

            console.log(`[PLAY2] Encontrado: ${video.titulo} (${video.url})`);

            // PASO 2: Enviar preview con info
            const captionPreview =
                '╭━━〔 🎬 𝐏𝐋𝐀𝐘𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 Autor: ' + video.autor.nombre + '\n' +
                '┃ ⏱️ Duración: ' + video.duracion + '\n' +
                '┃ 👀 Vistas: ' + formatearVistas(video.vistas) + '\n' +
                '┃ 📅 Publicado: ' + video.publicado + '\n' +
                '┃ 📊 Calidad: ' + FORMATO_VIDEO + '\n' +
                '┃\n' +
                '┃ ⬇️ Descargando video...\n' +
                '┃    (puede tardar unos segundos)\n' +
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

            // PASO 3: Descargar MP4
            console.log('[PLAY2] Obteniendo video MP4...');
            const mp4 = await descargarMP4(video.url, FORMATO_VIDEO);

            if (!mp4.downloadUrl) {
                throw new Error('La API no devolvió link de descarga');
            }

            console.log('[PLAY2] Descargando video de:', mp4.downloadUrl);

            // Descargar el buffer del video
            const videoRes = await fetch(mp4.downloadUrl, {
                signal: AbortSignal.timeout(120000) // 2 minutos para videos
            });

            if (!videoRes.ok) {
                throw new Error('No se pudo descargar el video: ' + videoRes.status);
            }

            const videoBuffer = await videoRes.arrayBuffer();
            const buffer = Buffer.from(videoBuffer);

            if (!buffer.length) {
                throw new Error('El video está vacío');
            }

            const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
            console.log(`[PLAY2] Video descargado: ${tamañoMB} MB`);

            // Verificar tamaño (WhatsApp tiene límite de ~16MB para videos)
            if (buffer.length > 16 * 1024 * 1024) {
                await responder.texto(
                    '╭━━〔 ⚠️ 𝐕𝐈𝐃𝐄𝐎 𝐌𝐔𝐘 𝐏𝐄𝐒𝐀𝐃𝐎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📦 Tamaño: ' + tamañoMB + ' MB\n' +
                    '┃\n' +
                    '┃ ⚠️ El video supera el límite\n' +
                    '┃    de WhatsApp (16 MB).\n' +
                    '┃\n' +
                    '┃ 💡 Se enviará como documento\n' +
                    '┃    para que puedas descargarlo.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );

                // Enviar como documento
                await sock.sendMessage(msg.key.remoteJid, {
                    document: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${mp4.titulo || video.titulo}.mp4`,
                    caption:
                        '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 🎧 *' + (mp4.titulo || video.titulo) + '*\n' +
                        '┃\n' +
                        '┃ 👤 Autor: ' + (mp4.autor || video.autor.nombre) + '\n' +
                        '┃ 📊 Calidad: ' + mp4.formato + '\n' +
                        '┃ 📦 Tamaño: ' + tamañoMB + ' MB\n' +
                        '┃\n' +
                        '┃ 💡 Toca para descargar\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                }, { quoted: msg });
            } else {
                // Enviar como video normal
                await sock.sendMessage(msg.key.remoteJid, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption:
                        '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 🎧 *' + (mp4.titulo || video.titulo) + '*\n' +
                        '┃\n' +
                        '┃ 👤 Autor: ' + (mp4.autor || video.autor.nombre) + '\n' +
                        '┃ 📊 Calidad: ' + mp4.formato + '\n' +
                        '┃ 📦 Tamaño: ' + tamañoMB + ' MB\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                }, { quoted: msg });
            }

            console.log('[PLAY2] ✅ Video enviado correctamente');

        } catch (error) {
            console.error('[PLAY2] ❌ Error:', error?.message || error);

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo descargar el video.\n' +
                '┃\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro video\n' +
                '┃    o verifica tu conexión.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};