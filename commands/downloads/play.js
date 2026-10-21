import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 8 });

const API_BUSCAR = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';

const CACHE_TTL = 5 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = new Map();

function getUA() {
    return UAS[Math.floor(Math.random() * UAS.length)];
}

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

function esURL(input) {
    return /^https?:\/\//i.test(input) || 
           /youtube\.com\/watch/i.test(input) || 
           /youtu\.be\//i.test(input);
}

function extraerVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function getJSON(url, timeoutMs) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: {
            'Accept': 'application/json',
            'User-Agent': getUA(),
            'Referer': 'https://www.youtube.com/'
        },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

function normVideo(v) {
    return {
        videoId: v.videoId,
        url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
        titulo: v.title || v.título || 'Sin título',
        thumbnail: v.image || v.imagen || v.thumbnail || '',
        duracion: v.duration || v.duración || '0:00',
        vistas: v.views || v.vistas || 0,
        autor: v.author?.name || v.author?.nombre || v.autor?.nombre || 'Desconocido'
    };
}

function normInfo(i) {
    return {
        titulo: i.title || i.titulo || i.título || 'Sin título',
        autor: i.author || i.autor || 'Desconocido',
        thumbnail: i.image || i.imagen || '',
        formato: i.format || i.formato || '',
        downloadUrl: i.download || i.descarga
    };
}

async function buscarUna(query) {
    const data = await getJSON(`${API_BUSCAR}?q=${encodeURIComponent(query)}`, 10000);
    if (data.status !== true && data.estado !== true) throw new Error('API sin éxito');
    const lista = data.data || data.datos || [];
    const v = lista.find(x => (x.type || x.tipo) === 'video' && !(x.isLive || x.enVivo)) || lista[0];
    if (!v) throw new Error('Sin resultados');
    return normVideo(v);
}

async function videoDesdeURL(url) {
    const videoId = extraerVideoId(url);
    if (!videoId) throw new Error('URL de YouTube inválida');

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    try {
        const data = await getJSON(`${API_BUSCAR}?q=${videoId}`, 10000);
        if ((data.status === true || data.estado === true) && data.data && data.data.length > 0) {
            const v = data.data.find(x => x.videoId === videoId) || data.data[0];
            return normVideo(v);
        }
    } catch (error) {
        console.log('[PLAY] No se pudieron obtener metadatos de la URL, usando valores por defecto');
    }

    return {
        videoId,
        url: videoUrl,
        titulo: 'Video de YouTube',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duracion: '0:00',
        vistas: 0,
        autor: 'Desconocido'
    };
}

async function buscarYouTube(query) {
    const key = query.toLowerCase().trim();

    if (esURL(query)) {
        console.log(`[PLAY] 📎 URL directa detectada: ${query}`);
        return await videoDesdeURL(query);
    }

    const cached = global.playCache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
        console.log(`[PLAY] ⚡ Caché: ${key}`);
        return cached.video;
    }

    let video = null;
    const esGenerica = key.length <= 5 || GENERICAS.has(key);

    if (!esGenerica) {
        video = await buscarUna(key);
    } else {
        const variantes = [key, ...MODIFICADORES.map(m => `${key} ${m}`)].slice(0, 4);
        console.log(`[PLAY] Genérica → variantes: ${variantes.join(' | ')}`);

        const resultados = await Promise.allSettled(variantes.map(v => buscarUna(v).then(r => ({ r, v }))));

        for (const v of variantes) {
            const exito = resultados.find(s => s.status === 'fulfilled' && s.value.v === v);
            if (exito) {
                video = exito.value.r;
                console.log(`[PLAY] ✅ Variante ganadora: "${v}"`);
                break;
            }
        }

        if (!video) throw new Error('Sin resultados');
    }

    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });

    return video;
}

async function infoAudio(url) {
    const data = await getJSON(`${API_MP3}?url=${encodeURIComponent(url)}`, 18000);
    if (data.status !== true && data.estado !== true) throw new Error('API MP3 sin éxito');
    const info = normInfo(data.data || data.datos || {});
    if (!info.downloadUrl) throw new Error('Sin link de descarga');
    return info;
}

async function infoVideo(url) {
    const data = await getJSON(`${API_MP4}?url=${encodeURIComponent(url)}&format=${FORMATO_VIDEO}`, 18000);
    if (data.status !== true && data.estado !== true) throw new Error('API MP4 sin éxito');
    const info = normInfo(data.data || data.datos || {});
    if (!info.downloadUrl) throw new Error('Sin link de descarga');
    return info;
}

async function descargarBuffer(url, timeoutMs) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { 'User-Agent': getUA(), 'Accept': '*/*' },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error('Descarga HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Buffer vacío');
    return buffer;
}

async function enviarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');

        const info = await infoAudio(video.url);
        const buffer = await descargarBuffer(info.downloadUrl, 60000);

        const caption =
            '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
            '┃ 🎧 *' + (info.titulo || video.titulo) + '*\n' +
            '┃ 👤 ' + (info.autor || video.autor) + '\n' +
            '┃ ⏱️ ' + video.duracion + '\n' +
            '┃ 👀 ' + formatearVistas(video.vistas) + '\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: msg });
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

async function enviarVideo(sock, msg, video, responder) {
    try {
        await responder.texto('🎬 Descargando video...');

        const info = await infoVideo(video.url);
        const buffer = await descargarBuffer(info.downloadUrl, 120000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        const caption =
            '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
            '┃ 🎧 *' + titulo + '*\n' +
            '┃ 👤 ' + autor + '\n' +
            '┃ 📊 ' + (info.formato || FORMATO_VIDEO) + ' | 📦 ' + tamañoMB + ' MB\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${String(titulo).replace(/[^\w\s.-]/g, '').slice(0, 80)}.mp4`,
                caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                video: buffer,
                mimetype: 'video/mp4',
                caption
            }, { quoted: msg });
        }
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

async function enviarConBotones(sock, msg, video, jid) {
    const caption = 
        '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
        '┃\n' +
        '┃ 🎧 *' + video.titulo + '*\n' +
        '┃ 👤 ' + video.autor + '\n' +
        '┃ ⏱️ ' + video.duracion + '\n' +
        '┃ 👀 ' + formatearVistas(video.vistas) + '\n' +
        '┃\n' +
        '┃ 📥 Elige el formato:\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    const sessionKey = msg.key.participant || msg.key.remoteJid;
    global.playSessions.set(sessionKey, {
        video,
        timestamp: Date.now()
    });

    const buttons = [
        { buttonId: 'play_audio', buttonText: { displayText: '🎵 Audio' }, type: 1 },
        { buttonId: 'play_video', buttonText: { displayText: '🎬 Video' }, type: 1 }
    ];

    const buttonMessage = {
        image: { url: video.thumbnail },
        caption: caption,
        footer: 'Selecciona una opción',
        buttons: buttons,
        headerType: 4,
        contextInfo: {
            mentionedJid: [msg.key.participant || msg.key.remoteJid]
        }
    };

    await sock.sendMessage(jid, buttonMessage, { quoted: msg });
}

export default {
    nombre: 'play',
    categoria: 'Descargas',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: '.play → audio directo | .play2 → video directo',

    ejecutar: async ({ sock, msg, argumento, responder, jid, nombreComando }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre o URL\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play hola (audio)\n' +
                '┃ ➪ .play2 hola (video)\n' +
                '┃ ➪ .play https://youtu.be/...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const esVideo = ['play2', 'playvideo', 'video'].includes(nombreComando);

        try {
            const video = await buscarYouTube(query);
            const esLink = esURL(query);

            if (esLink) {
                await enviarConBotones(sock, msg, video, jid);
            } else {
                if (esVideo) {
                    await enviarVideo(sock, msg, video, responder);
                } else {
                    await enviarAudio(sock, msg, video, responder);
                }
            }

        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '┃    o verifica tu conexión.\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};