

import fetch from 'node-fetch';
import { performance } from 'node:perf_hooks';

// ───────────── CONFIGURACIÓN ─────────────
const API_BUSQUEDA = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';

const HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36'
};
// ─────────────────────────────────────────

if (!global.playSessions) global.playSessions = {};

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

// ───────────── BÚSQUEDA OPTIMIZADA ─────────────
async function buscarYouTube(query) {
    const inicio = performance.now();
    
    const url = `${API_BUSQUEDA}?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(15000) // reducido de 20s a 15s
    });

    if (!res.ok) throw new Error(`Búsqueda falló: ${res.status}`);
    const data = await res.json();

    if (!data.estado && !data.status) {
        throw new Error(data.message || 'No se pudo buscar');
    }

    const resultados = data.datos || data.data || [];
    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error('No se encontraron resultados');
    }

    // Preferir el primer video NO live
    const video = resultados.find(v => !v.isLive && !v.enVivo) || resultados[0];

    console.log(`[PLAY] Búsqueda: ${(performance.now() - inicio).toFixed(0)}ms`);

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

// ───────────── DESCARGAR BUFFER (OPTIMIZADO) ─────────────
async function descargarBuffer(url, timeoutMs = 60000) {
    const inicio = performance.now();

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity'
        },
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) throw new Error(`Descarga falló: ${res.status}`);

    // Convertir ArrayBuffer directamente (más rápido que arrayBuffer())
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) throw new Error('Buffer vacío');

    console.log(`[PLAY] Buffer descargado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB en ${(performance.now() - inicio).toFixed(0)}ms`);

    return buffer;
}

// ───────────── OBTENER AUDIO (OPTIMIZADO) ─────────────
async function descargarAudio(youtubeUrl) {
    const inicio = performance.now();

    const res = await fetch(`${API_MP3}?url=${encodeURIComponent(youtubeUrl)}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000) // 30s en vez de 60s
    });

    if (!res.ok) throw new Error(`API MP3 falló: ${res.status}`);
    const data = await res.json();

    if (!data.status && !data.estado) throw new Error('No se pudo obtener el audio');

    const info = data.data || data.datos || {};
    
    if (!info.download && !info.descarga) {
        throw new Error('La API no devolvió link de descarga');
    }

    console.log(`[PLAY] Info MP3: ${(performance.now() - inicio).toFixed(0)}ms`);

    return {
        titulo: info.title || info.titulo,
        autor: info.author || info.autor,
        thumbnail: info.image || info.imagen,
        downloadUrl: info.download || info.descarga
    };
}

// ───────────── OBTENER VIDEO (OPTIMIZADO) ─────────────
async function descargarVideo(youtubeUrl, formato = FORMATO_VIDEO) {
    const inicio = performance.now();

    const res = await fetch(`${API_MP4}?url=${encodeURIComponent(youtubeUrl)}&format=${formato}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) throw new Error(`API MP4 falló: ${res.status}`);
    const data = await res.json();

    if (!data.status && !data.estado) throw new Error('No se pudo obtener el video');

    const info = data.data || data.datos || {};

    if (!info.download && !info.descarga) {
        throw new Error('La API no devolvió link de descarga');
    }

    console.log(`[PLAY] Info MP4: ${(performance.now() - inicio).toFixed(0)}ms`);

    return {
        titulo: info.title || info.titulo,
        autor: info.author || info.autor,
        thumbnail: info.image || info.imagen,
        formato: info.format || info.formato || formato,
        downloadUrl: info.download || info.descarga
    };
}

// ───────────── ENVIAR AUDIO (FIX DEL BUG) ─────────────
async function procesarAudio(sock, msg, video, responder) {
    try {
        const inicio = performance.now();
        await responder.texto('🎵 Descargando audio...');

        const audio = await descargarAudio(video.url);
        const buffer = await descargarBuffer(audio.downloadUrl, 60000);

        // 🔑 FIX: mensaje simple sin contextInfo problemático
        // Esto es lo que arregla el bug de entrega a otros usuarios
        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
            // ❌ SIN contextInfo.externalAdReply (causaba el bug)
            // ❌ SIN showAdAttribution
            // ❌ SIN mediaUrl/sourceUrl
        }, { quoted: msg });

        console.log(`[PLAY] ✅ Audio enviado en ${(performance.now() - inicio).toFixed(0)}ms`);
    } catch (error) {
        console.error('[PLAY-AUDIO] Error:', error?.message || error);
        await responder.texto(
            '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
            '┃ No se pudo enviar el audio.\n' +
            '┃\n' +
            '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
}

// ───────────── ENVIAR VIDEO (FIX DEL BUG) ─────────────
async function procesarVideo(sock, msg, video, responder) {
    try {
        const inicio = performance.now();
        await responder.texto('🎬 Descargando video...');

        const vid = await descargarVideo(video.url, FORMATO_VIDEO);
        const buffer = await descargarBuffer(vid.downloadUrl, 120000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = vid.titulo || video.titulo;
        const autor = vid.autor || video.autor;

        // 🔑 FIX: mensaje simple sin contextInfo problemático
        if (buffer.length > 16 * 1024 * 1024) {
            // Video muy pesado → enviar como documento
            await sock.sendMessage(msg.key.remoteJid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${titulo.replace(/[^\w\s.-]/g, '').slice(0, 80)}.mp4`,
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + titulo + '*\n' +
                    '┃ 👤 ' + autor + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            }, { quoted: msg });
        } else {
            // Video normal
            await sock.sendMessage(msg.key.remoteJid, {
                video: buffer,
                mimetype: 'video/mp4',
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + titulo + '*\n' +
                    '┃ 👤 ' + autor + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            }, { quoted: msg });
        }

        console.log(`[PLAY] ✅ Video enviado en ${(performance.now() - inicio).toFixed(0)}ms`);
    } catch (error) {
        console.error('[PLAY-VIDEO] Error:', error?.message || error);
        await responder.texto(
            '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
            '┃ No se pudo enviar el video.\n' +
            '┃\n' +
            '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
}

// ───────────── COMANDO PRINCIPAL ─────────────
export default {
    nombre: 'play',
    categoria: 'downloader',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: 'Busca en YouTube y elige audio o video con botones.',
    uso: '.play <nombre>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const inicio = performance.now();
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play twice fancy\n' +
                '┃ ➪ .play bad bunny\n' +
                '┃\n' +
                '┃ 🎯 Elige con botones o\n' +
                '┃    responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            // Búsqueda
            const video = await buscarYouTube(query);

            // Guardar sesión
            global.playSessions[sender] = {
                jid,
                video,
                timestamp: Date.now(),
                msgQuoted: msg
            };

            // Limpiar sesiones viejas
            const ahora = Date.now();
            for (const key of Object.keys(global.playSessions)) {
                if (ahora - global.playSessions[key].timestamp > 600000) {
                    delete global.playSessions[key];
                }
            }

            const caption =
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 ' + video.autor + '\n' +
                '┃ ⏱️ ' + video.duracion + '\n' +
                '┃ 👀 ' + formatearVistas(video.vistas) + '\n' +
                '┃\n' +
                '┣━━〔 🎯 𝐄𝐋𝐈𝐆𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 📲 Presiona el botón\n' +
                '┃    o responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // Enviar preview con botones
            const mensajePreview = video.thumbnail
                ? {
                    image: { url: video.thumbnail },
                    caption,
                    footer: '🎵 BOT-API • Elige formato',
                    interactiveButtons: [
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🎵 Audio',
                                id: 'playaudio'
                            })
                        },
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🎬 Video',
                                id: 'playvideo'
                            })
                        }
                    ]
                }
                : {
                    text: caption,
                    footer: '🎵 BOT-API • Elige formato',
                    interactiveButtons: [
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🎵 Audio',
                                id: 'playaudio'
                            })
                        },
                        {
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: '🎬 Video',
                                id: 'playvideo'
                            })
                        }
                    ]
                };

            try {
                await sock.sendMessage(jid, mensajePreview, { quoted: msg });
            } catch (e) {
                // Fallback sin botones
                await responder.texto(caption + '\n\nResponde *1* para audio o *2* para video');
            }

            console.log(`[PLAY] Preview enviado en ${(performance.now() - inicio).toFixed(0)}ms`);

        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

// Exportar funciones para el handler
export { procesarAudio, procesarVideo };