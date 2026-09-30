import fetch from 'node-fetch';
import { performance } from 'node:perf';

// ───────────── CONFIGURACIÓN ─────────────
const ENDPOINTS_BUSQUEDA = [
    'https://api.delirius.online/search/youtube',
    'https://api.delirius.online/search/ytsearch',
    'https://api.delirius.online/search/yt',
    'https://api.delirius.online/yt/search',
    'https://api.delirius.online/youtube/search'
];

const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';

const HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
    'Referer': 'https://api.delirius.online/'
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

// ───────────── BÚSQUEDA CON MÚLTIPLES ENDPOINTS ─────────────
async function buscarYouTube(query) {
    const inicio = performance.now();
    let ultimoError = null;
    let ultimaRespuesta = null;
    
    for (const endpoint of ENDPOINTS_BUSQUEDA) {
        try {
            const url = `${endpoint}?q=${encodeURIComponent(query)}`;
            console.log(`[PLAY] 🔍 Probando: ${endpoint}`);
            
            const res = await fetch(url, {
                headers: HEADERS,
                signal: AbortSignal.timeout(15000)
            });

            console.log(`[PLAY] Status: ${res.status} | Content-Type: ${res.headers.get('content-type')}`);

            const rawText = await res.text();
            console.log(`[PLAY] Respuesta raw (primeros 500 chars):`, rawText.substring(0, 500));

            if (!res.ok) {
                ultimoError = `HTTP ${res.status}`;
                ultimaRespuesta = rawText.substring(0, 200);
                console.log(`[PLAY] ❌ ${endpoint} falló: ${res.status}`);
                continue;
            }
            
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                ultimoError = 'Respuesta no es JSON válido';
                ultimaRespuesta = rawText.substring(0, 200);
                console.log(`[PLAY] ❌ ${endpoint} no devolvió JSON`);
                continue;
            }
            
            // Validar respuesta - aceptar múltiples formatos
            const esValido = data.estado === true || 
                           data.status === true || 
                           data.success === true ||
                           (data.datos && Array.isArray(data.datos)) ||
                           (data.data && Array.isArray(data.data)) ||
                           (data.result && Array.isArray(data.result));
            
            if (!esValido) {
                ultimoError = data.message || data.error || 'Respuesta inválida';
                ultimaRespuesta = JSON.stringify(data).substring(0, 200);
                console.log(`[PLAY] ❌ ${endpoint} respondió pero sin datos válidos`);
                continue;
            }

            const resultados = data.datos || data.data || data.result || data.results || [];
            
            if (!Array.isArray(resultados) || resultados.length === 0) {
                ultimoError = 'Sin resultados';
                continue;
            }

            // Preferir el primer video NO live
            const video = resultados.find(v => !v.isLive && !v.enVivo && !v.live) || resultados[0];
            
            if (!video) {
                ultimoError = 'No se pudo extraer video';
                continue;
            }

            console.log(`[PLAY] ✅ Búsqueda exitosa en ${(performance.now() - inicio).toFixed(0)}ms usando ${endpoint}`);

            return {
                videoId: video.videoId || video.id || video.vid,
                url: video.url || `https://www.youtube.com/watch?v=${video.videoId || video.id}`,
                titulo: video.título || video.title || video.name || 'Sin título',
                thumbnail: video.imagen || video.miniatura || video.thumbnail || video.thumb || '',
                duracion: video.duración || video.duration || video.dur || '0:00',
                vistas: video.vistas || video.views || video.viewCount || 0,
                publicado: video.publicadoEn || video.uploaded || video.publishedAt || 'Desconocido',
                autor: video.autor?.nombre || video.autor?.name || video.author || video.channel || 'Desconocido'
            };
            
        } catch (error) {
            ultimoError = error.message;
            console.log(`[PLAY] ❌ Error en ${endpoint}: ${error.message}`);
            continue;
        }
    }
    
    console.error('[PLAY] Todos los endpoints fallaron');
    console.error('[PLAY] Último error:', ultimoError);
    console.error('[PLAY] Última respuesta:', ultimaRespuesta);
    
    throw new Error(`Todas las APIs fallaron. Último error: ${ultimoError}. Respuesta: ${ultimaRespuesta}`);
}

// ───────────── DESCARGAR BUFFER ─────────────
async function descargarBuffer(url, timeoutMs = 60000) {
    const inicio = performance.now();

    const res = await fetch(url, {
        headers: {
            'User-Agent': HEADERS['User-Agent'],
            'Accept': '*/*',
            'Accept-Encoding': 'identity'
        },
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) throw new Error(`Descarga falló: ${res.status}`);

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) throw new Error('Buffer vacío');

    console.log(`[PLAY] Buffer descargado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB en ${(performance.now() - inicio).toFixed(0)}ms`);

    return buffer;
}

// ───────────── OBTENER AUDIO ─────────────
async function descargarAudio(youtubeUrl) {
    const inicio = performance.now();

    const res = await fetch(`${API_MP3}?url=${encodeURIComponent(youtubeUrl)}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) throw new Error(`API MP3 falló: ${res.status}`);
    
    const rawText = await res.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        throw new Error('API MP3 no devolvió JSON válido');
    }

    const esValido = data.status === true || data.estado === true || data.success === true;
    if (!esValido) {
        throw new Error(data.message || 'No se pudo obtener el audio');
    }

    const info = data.data || data.datos || data.result || {};

    if (!info.download && !info.descarga && !info.url) {
        throw new Error('La API no devolvió link de descarga');
    }

    console.log(`[PLAY] Info MP3: ${(performance.now() - inicio).toFixed(0)}ms`);

    return {
        titulo: info.title || info.titulo || 'Sin título',
        autor: info.author || info.autor || 'Desconocido',
        thumbnail: info.image || info.imagen || '',
        downloadUrl: info.download || info.descarga || info.url
    };
}

// ───────────── OBTENER VIDEO ─────────────
async function descargarVideo(youtubeUrl, formato = FORMATO_VIDEO) {
    const inicio = performance.now();

    const res = await fetch(`${API_MP4}?url=${encodeURIComponent(youtubeUrl)}&format=${formato}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) throw new Error(`API MP4 falló: ${res.status}`);
    
    const rawText = await res.text();
    let data;
    try {
        data = JSON.parse(rawText);
    } catch (e) {
        throw new Error('API MP4 no devolvió JSON válido');
    }

    const esValido = data.status === true || data.estado === true || data.success === true;
    if (!esValido) {
        throw new Error(data.message || 'No se pudo obtener el video');
    }

    const info = data.data || data.datos || data.result || {};

    if (!info.download && !info.descarga && !info.url) {
        throw new Error('La API no devolvió link de descarga');
    }

    console.log(`[PLAY] Info MP4: ${(performance.now() - inicio).toFixed(0)}ms`);

    return {
        titulo: info.title || info.titulo || 'Sin título',
        autor: info.author || info.autor || 'Desconocido',
        thumbnail: info.image || info.imagen || '',
        formato: info.format || info.formato || formato,
        downloadUrl: info.download || info.descarga || info.url
    };
}

// ───────────── ENVIAR AUDIO ─────────────
async function procesarAudio(sock, msg, video, responder) {
    try {
        const inicio = performance.now();
        await responder.texto('🎵 Descargando audio...');

        const audio = await descargarAudio(video.url);
        const buffer = await descargarBuffer(audio.downloadUrl, 60000);

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
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

// ───────────── ENVIAR VIDEO ─────────────
async function procesarVideo(sock, msg, video, responder) {
    try {
        const inicio = performance.now();
        await responder.texto('🎬 Descargando video...');

        const vid = await descargarVideo(video.url, FORMATO_VIDEO);
        const buffer = await descargarBuffer(vid.downloadUrl, 120000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = vid.titulo || video.titulo;
        const autor = vid.autor || video.autor;

        if (buffer.length > 16 * 1024 * 1024) {
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
            const video = await buscarYouTube(query);

            global.playSessions[sender] = {
                jid,
                video,
                timestamp: Date.now(),
                msgQuoted: msg
            };

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
                await responder.texto(caption + '\n\nResponde *1* para audio o *2* para video');
            }

            console.log(`[PLAY] Preview enviado en ${(performance.now() - inicio).toFixed(0)}ms`);

        } catch (error) {
            console.error('[PLAY] Error completo:', error);
            
            const errorMsg = error?.message || 'Error desconocido';
            
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ ' + errorMsg.split('\n')[0] + '\n' +
                '┃\n' +
                '┃ 🔍 Revisa los logs del bot\n' +
                '┃    para ver qué endpoint funcionó\n' +
                '┃\n' +
                '┃ 💡 Si todos fallan, la API puede\n' +
                '┃    estar en mantenimiento\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

export { procesarAudio, procesarVideo };