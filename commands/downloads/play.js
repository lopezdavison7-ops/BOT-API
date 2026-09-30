import fetch from 'node-fetch';
import { performance } from 'node:perf_hooks';

const API_BUSQUEDA = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';

const RUTAS = [
    (u) => u,
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u)
];

const NOMBRES_RUTA = ['directo', 'allorigins', 'corsproxy'];

if (!global.playSessions) global.playSessions = {};

async function fetchJSON(url, timeoutMs = 12000) {
    let ultimoError = null;

    for (let i = 0; i < RUTAS.length; i++) {
        try {
            const res = await fetch(RUTAS[i](url), {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(timeoutMs)
            });

            if (!res.ok) {
                ultimoError = `HTTP ${res.status} (${NOMBRES_RUTA[i]})`;
                console.log(`[PLAY] ${NOMBRES_RUTA[i]} → ${res.status}`);
                continue;
            }

            const json = JSON.parse(await res.text());
            console.log(`[PLAY] ${NOMBRES_RUTA[i]} → 200 OK`);
            return json;
        } catch (e) {
            ultimoError = `${e.message} (${NOMBRES_RUTA[i]})`;
            console.log(`[PLAY] ${NOMBRES_RUTA[i]} → ${e.message}`);
        }
    }

    throw new Error('API inaccesible: ' + ultimoError);
}

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

async function buscarYouTube(query) {
    const inicio = performance.now();

    const data = await fetchJSON(`${API_BUSQUEDA}?q=${encodeURIComponent(query)}`);

    if (data.status !== true && data.estado !== true) {
        throw new Error(data.message || 'La API respondió sin éxito');
    }

    const resultados = data.data || data.datos || [];

    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error('No se encontraron resultados');
    }

    const video = resultados.find(v => v.type === 'video' && !v.isLive) || resultados[0];

    console.log(`[PLAY] Búsqueda OK en ${(performance.now() - inicio).toFixed(0)}ms`);

    return {
        videoId: video.videoId,
        url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
        titulo: video.title || video.título || 'Sin título',
        thumbnail: video.image || video.thumbnail || video.imagen || '',
        duracion: video.duration || video.duración || '0:00',
        vistas: video.views || video.vistas || 0,
        publicado: video.publishedAt || video.publicadoEn || 'Desconocido',
        autor: video.author?.name || video.author?.nombre || video.autor || 'Desconocido'
    };
}

async function descargarBuffer(url, timeoutMs = 60000) {
    const inicio = performance.now();

    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity'
        },
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) throw new Error(`Descarga falló: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());

    if (!buffer.length) throw new Error('Buffer vacío');

    console.log(`[PLAY] Buffer: ${(buffer.length / 1024 / 1024).toFixed(2)} MB en ${(performance.now() - inicio).toFixed(0)}ms`);

    return buffer;
}

async function descargarAudio(youtubeUrl) {
    const data = await fetchJSON(`${API_MP3}?url=${encodeURIComponent(youtubeUrl)}`, 20000);

    if (data.status !== true && data.estado !== true) {
        throw new Error(data.message || 'No se pudo obtener el audio');
    }

    const info = data.data || data.datos || {};

    if (!info.download && !info.descarga) {
        throw new Error('La API no devolvió link de descarga');
    }

    return {
        titulo: info.title || info.titulo || 'Sin título',
        autor: info.author || info.autor || 'Desconocido',
        thumbnail: info.image || info.imagen || '',
        downloadUrl: info.download || info.descarga
    };
}

async function descargarVideo(youtubeUrl, formato = FORMATO_VIDEO) {
    const data = await fetchJSON(`${API_MP4}?url=${encodeURIComponent(youtubeUrl)}&format=${formato}`, 20000);

    if (data.status !== true && data.estado !== true) {
        throw new Error(data.message || 'No se pudo obtener el video');
    }

    const info = data.data || data.datos || {};

    if (!info.download && !info.descarga) {
        throw new Error('La API no devolvió link de descarga');
    }

    return {
        titulo: info.title || info.titulo || 'Sin título',
        autor: info.author || info.autor || 'Desconocido',
        thumbnail: info.image || info.imagen || '',
        formato: info.format || info.formato || formato,
        downloadUrl: info.download || info.descarga
    };
}

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
                fileName: `${String(titulo).replace(/[^\w\s.-]/g, '').slice(0, 80)}.mp4`,
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + titulo + '*\n' +
                    '┃ 👤 ' + autor + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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
                    '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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
                '┣━━〔  𝐄𝐈𝐆𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 📲 Presiona el botón\n' +
                '┃    o responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const botones = [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'playaudio' })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'playvideo' })
                }
            ];

            const mensajePreview = video.thumbnail
                ? { image: { url: video.thumbnail }, caption, footer: '🎵 BOT-API • Elige formato', interactiveButtons: botones }
                : { text: caption, footer: '🎵 BOT-API • Elige formato', interactiveButtons: botones };

            try {
                await sock.sendMessage(jid, mensajePreview, { quoted: msg });
            } catch (e) {
                await responder.texto(caption + '\n\nResponde *1* para audio o *2* para video');
            }

            console.log(`[PLAY] Preview enviado en ${(performance.now() - inicio).toFixed(0)}ms`);

        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

export { procesarAudio, procesarVideo };