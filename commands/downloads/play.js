// commands/downloader/play.js
// ============================================================
// BOT-API — PLAY UNIFICADO (Audio + Video con botones)
// Busca en YouTube y permite elegir audio o video
// ============================================================

import fetch from 'node-fetch';

// ───────────── CONFIGURACIÓN ─────────────
const API_BUSQUEDA = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';
// ─────────────────────────────────────────

// Sesiones activas de play
if (!global.playSessions) global.playSessions = {};

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

    const video = resultados.find(v => !v.isLive && !v.enVivo) || resultados[0];

    return {
        videoId: video.videoId,
        url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
        titulo: video.título || video.title,
        thumbnail: video.imagen || video.miniatura || video.thumbnail,
        duracion: video.duración || video.duration,
        vistas: video.vistas || video.views,
        publicado: video.publicadoEn || video.uploaded || 'Desconocido',
        autor: video.autor?.nombre || video.autor?.name || 'Desconocido'
    };
}

// ───────────── DESCARGAR AUDIO ─────────────
async function descargarAudio(youtubeUrl) {
    const res = await fetch(`${API_MP3}?url=${encodeURIComponent(youtubeUrl)}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) throw new Error(`Descarga MP3 falló: ${res.status}`);
    const data = await res.json();

    if (!data.status && !data.estado) throw new Error('No se pudo obtener el audio');

    const info = data.data || data.datos || {};
    return {
        titulo: info.title || info.titulo,
        autor: info.author || info.autor,
        thumbnail: info.image || info.imagen,
        downloadUrl: info.download || info.descarga
    };
}

// ───────────── DESCARGAR VIDEO ─────────────
async function descargarVideo(youtubeUrl, formato = FORMATO_VIDEO) {
    const res = await fetch(`${API_MP4}?url=${encodeURIComponent(youtubeUrl)}&format=${formato}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(60000)
    });

    if (!res.ok) throw new Error(`Descarga MP4 falló: ${res.status}`);
    const data = await res.json();

    if (!data.status && !data.estado) throw new Error('No se pudo obtener el video');

    const info = data.data || data.datos || {};
    return {
        titulo: info.title || info.titulo,
        autor: info.author || info.autor,
        thumbnail: info.image || info.imagen,
        formato: info.format || info.formato || formato,
        downloadUrl: info.download || info.descarga
    };
}

// ───────────── PROCESAR AUDIO ─────────────
async function procesarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');
        const audio = await descargarAudio(video.url);

        if (!audio.downloadUrl) throw new Error('La API no devolvió link de descarga');

        const audioRes = await fetch(audio.downloadUrl, { signal: AbortSignal.timeout(60000) });
        if (!audioRes.ok) throw new Error('No se pudo descargar el audio');

        const buffer = Buffer.from(await audioRes.arrayBuffer());
        if (!buffer.length) throw new Error('Audio vacío');

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                externalAdReply: {
                    title: audio.titulo || video.titulo,
                    body: '🎵 BOT-API • Audio',
                    thumbnailUrl: audio.thumbnail || video.thumbnail,
                    mediaType: 1,
                    mediaUrl: video.url,
                    sourceUrl: video.url,
                    showAdAttribution: true,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: msg });

        console.log('[PLAY] ✅ Audio enviado');
    } catch (error) {
        await responder.texto('❌ Error descargando audio: ' + (error?.message || error));
    }
}

// ───────────── PROCESAR VIDEO ─────────────
async function procesarVideo(sock, msg, video, responder) {
    try {
        await responder.texto('🎬 Descargando video...');
        const vid = await descargarVideo(video.url, FORMATO_VIDEO);

        if (!vid.downloadUrl) throw new Error('La API no devolvió link de descarga');

        const videoRes = await fetch(vid.downloadUrl, { signal: AbortSignal.timeout(120000) });
        if (!videoRes.ok) throw new Error('No se pudo descargar el video');

        const buffer = Buffer.from(await videoRes.arrayBuffer());
        if (!buffer.length) throw new Error('Video vacío');

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${vid.titulo || video.titulo}.mp4`,
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + (vid.titulo || video.titulo) + '*\n' +
                    '┃ 👤 ' + (vid.autor || video.autor) + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                video: buffer,
                mimetype: 'video/mp4',
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + (vid.titulo || video.titulo) + '*\n' +
                    '┃ 👤 ' + (vid.autor || video.autor) + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            }, { quoted: msg });
        }

        console.log('[PLAY] ✅ Video enviado');
    } catch (error) {
        await responder.texto('❌ Error descargando video: ' + (error?.message || error));
    }
}

// ───────────── COMANDO ─────────────
export default {
    nombre: 'play',
    categoria: 'downloader',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: 'Busca en YouTube y elige audio o video con botones.',
    uso: '.play <nombre>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre de la canción/video\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play twice fancy\n' +
                '┃ ➪ .play yan block 444\n' +
                '┃\n' +
                '┃ 🎯 Aparecerán botones para\n' +
                '┃    elegir 🎵 Audio o 🎬 Video\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // PASO 1: Buscar en YouTube
            await responder.texto('🔍 Buscando en YouTube...');
            const video = await buscarYouTube(query);

            console.log(`[PLAY] Encontrado: ${video.titulo}`);

            // PASO 2: Guardar sesión para este usuario
            global.playSessions[sender] = {
                jid: msg.key.remoteJid,
                video,
                timestamp: Date.now(),
                msgQuoted: msg
            };

            // Limpiar sesiones viejas (>10 min)
            for (const key of Object.keys(global.playSessions)) {
                if (Date.now() - global.playSessions[key].timestamp > 600000) {
                    delete global.playSessions[key];
                }
            }

            // PASO 3: Enviar preview con botones interactivos
            const caption =
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 Autor: ' + video.autor + '\n' +
                '┃ ⏱️ Duración: ' + video.duracion + '\n' +
                '┃ 👀 Vistas: ' + formatearVistas(video.vistas) + '\n' +
                '┃ 📅 Publicado: ' + video.publicado + '\n' +
                '┃\n' +
                '┣━━〔 🎯 𝐄𝐋𝐈𝐆𝐄 𝐄𝐋 𝐅𝐎𝐑𝐌𝐀𝐓𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ 💡 Presiona un botón para elegir\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Enviar con botones interactivos
            if (video.thumbnail) {
                try {
                    await sock.sendMessage(msg.key.remoteJid, {
                        image: { url: video.thumbnail },
                        caption,
                        footer: '🎵 BOT-API • Selecciona el formato',
                        interactiveButtons: [
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎵 Audio',
                                    id: 'play_audio'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎬 Video',
                                    id: 'play_video'
                                })
                            }
                        ]
                    }, { quoted: msg });
                } catch (e) {
                    // Fallback sin botones
                    await responder.texto(caption + '\n\n📲 Responde con *1* (audio) o *2* (video)');
                }
            } else {
                try {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: caption,
                        footer: '🎵 BOT-API • Selecciona el formato',
                        interactiveButtons: [
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎵 Audio',
                                    id: 'play_audio'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎬 Video',
                                    id: 'play_video'
                                })
                            }
                        ]
                    }, { quoted: msg });
                } catch (e) {
                    await responder.texto(caption + '\n\n📲 Responde con *1* (audio) o *2* (video)');
                }
            }

        } catch (error) {
            console.error('[PLAY] ❌ Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

// Exportar funciones para usarlas en el handler
export { procesarAudio, procesarVideo };