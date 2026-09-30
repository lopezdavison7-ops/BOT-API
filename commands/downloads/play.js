import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 12 });

const API_BUSCAR = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';

const CACHE_TTL = 10 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

if (!global.playSessions) global.playSessions = {};
if (!global.playCache) global.playCache = new Map();
if (!global.playInfoCache) global.playInfoCache = new Map();

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

async function getJSON(url, timeoutMs, signal) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { 'Accept': 'application/json', 'User-Agent': getUA() },
        signal: signal || AbortSignal.timeout(timeoutMs)
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
        formato: i.format || i.formato || '',
        downloadUrl: i.download || i.descarga
    };
}

async function buscarUna(query, signal) {
    const data = await getJSON(`${API_BUSCAR}?q=${encodeURIComponent(query)}`, 8000, signal);
    if (data.status !== true && data.estado !== true) throw new Error('API sin éxito');
    const lista = data.data || data.datos || [];
    const v = lista.find(x => (x.type || x.tipo) === 'video' && !(x.isLive || x.enVivo)) || lista[0];
    if (!v) throw new Error('Sin resultados');
    return normVideo(v);
}

function carreraBusquedas(variantes) {
    return new Promise((resolve, reject) => {
        const controller = new AbortController();
        let pendientes = variantes.length;
        let ultimoError = null;

        variantes.forEach(v => {
            buscarUna(v, controller.signal)
                .then(r => {
                    controller.abort();
                    resolve({ video: r, variante: v });
                })
                .catch(e => {
                    ultimoError = e;
                    if (--pendientes === 0) reject(ultimoError || new Error('Sin resultados'));
                });
        });
    });
}

async function buscarYouTube(query) {
    const key = query.toLowerCase().trim();

    const cached = global.playCache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
        return cached.video;
    }

    const esGenerica = key.length <= 5 || GENERICAS.has(key);
    const variantes = esGenerica
        ? [key, ...MODIFICADORES.map(m => `${key} ${m}`)]
        : [key];

    const { video } = await carreraBusquedas(variantes);

    if (global.playCache.size > 60) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });

    return video;
}

async function infoAudio(url) {
    const data = await getJSON(`${API_MP3}?url=${encodeURIComponent(url)}`, 12000);
    if (data.status !== true && data.estado !== true) throw new Error('API MP3 sin éxito');
    const info = normInfo(data.data || data.datos || {});
    if (!info.downloadUrl) throw new Error('Sin link de descarga');
    return info;
}

async function infoVideo(url) {
    const data = await getJSON(`${API_MP4}?url=${encodeURIComponent(url)}&format=${FORMATO_VIDEO}`, 12000);
    if (data.status !== true && data.estado !== true) throw new Error('API MP4 sin éxito');
    const info = normInfo(data.data || data.datos || {});
    if (!info.downloadUrl) throw new Error('Sin link de descarga');
    return info;
}

function prefetchInfo(video) {
    const id = video.videoId;
    if (!id || global.playInfoCache.has(id)) return;

    if (global.playInfoCache.size > 40) global.playInfoCache.clear();

    global.playInfoCache.set(id, {
        audio: infoAudio(video.url).catch(() => null),
        video: infoVideo(video.url).catch(() => null),
        t: Date.now()
    });
}

async function obtenerInfo(video, tipo) {
    const entry = global.playInfoCache.get(video.videoId);

    if (entry && Date.now() - entry.t < CACHE_TTL) {
        const pre = await entry[tipo];
        if (pre) return pre;
    }

    return tipo === 'audio' ? infoAudio(video.url) : infoVideo(video.url);
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

async function procesarAudio(sock, msg, video, responder) {
    try {
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: '⏳', key: msg.key }
        }).catch(() => {});

        const info = await obtenerInfo(video, 'audio');
        const buffer = await descargarBuffer(info.downloadUrl, 45000);

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

async function procesarVideo(sock, msg, video, responder) {
    try {
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: '⏳', key: msg.key }
        }).catch(() => {});

        const info = await obtenerInfo(video, 'video');
        const buffer = await descargarBuffer(info.downloadUrl, 90000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        const caption =
            '╭━━〔 🎬 𝐈𝐄𝐎 〕━━⬣\n' +
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
            '╭━━〔  𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
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
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play hola\n' +
                '┃ ➪ .play twice fancy\n' +
                '┃\n' +
                '┃ 🎯 Elige con botones o\n' +
                '┃    responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            const video = await buscarYouTube(query);

            global.playSessions[sender] = { jid, video, timestamp: Date.now() };

            const ahora = Date.now();
            for (const key of Object.keys(global.playSessions)) {
                if (ahora - global.playSessions[key].timestamp > 600000) {
                    delete global.playSessions[key];
                }
            }

            prefetchInfo(video);

            const caption =
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 ' + video.autor + '\n' +
                '┃ ⏱️ ' + video.duracion + '\n' +
                '┃ 👀 ' + formatearVistas(video.vistas) + '\n' +
                '┃\n' +
                '┣━━〔  𝐄𝐈𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 📲 Presiona el botón\n' +
                '┃    o responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const botones = [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'playaudio' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'playvideo' }) }
            ];

            await sock.sendMessage(jid, {
                text: caption,
                footer: '🎵 BOT-API • Elige formato',
                interactiveButtons: botones
            }, { quoted: msg });

        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔  𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ No se pudo buscar\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

export { procesarAudio, procesarVideo };