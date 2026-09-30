import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 8 });

const DELIRIUS = {
    buscar: 'https://api.delirius.online/search/ytsearch',
    mp3: 'https://api.delirius.online/download/ytmp3',
    mp4: 'https://api.delirius.online/download/ytmp4'
};

const NOTH = {
    buscar: 'https://noth.hidenplay.net/api/busqueda/youtube',
    mp3: 'https://noth.hidenplay.net/api/descargas/ytmp3',
    mp4: 'https://noth.hidenplay.net/api/descargas/ytmp4',
    key: 'nothSrEG'
};

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

if (!global.playSessions) global.playSessions = {};
if (!global.playCache) global.playCache = new Map();

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

async function getJSON(url, timeoutMs) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { 'Accept': 'application/json', 'User-Agent': getUA() },
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

async function buscarDelirius(query) {
    const data = await getJSON(`${DELIRIUS.buscar}?q=${encodeURIComponent(query)}`, 10000);
    if (data.status !== true && data.estado !== true) throw new Error('Delirius sin éxito');
    const lista = data.data || data.datos || [];
    const v = lista.find(x => (x.type || x.tipo) === 'video' && !(x.isLive || x.enVivo)) || lista[0];
    if (!v) throw new Error('Delirius vacío');
    return normVideo(v);
}

async function buscarNoth(query) {
    const data = await getJSON(`${NOTH.buscar}?query=${encodeURIComponent(query)}&apikey=${NOTH.key}`, 10000);
    if (data.status !== true) throw new Error('Noth sin éxito');
    const lista = data.data || [];
    const v = lista.find(x => x.type === 'video' && !x.isLive) || lista[0];
    if (!v) throw new Error('Noth vacío');
    return normVideo(v);
}

async function buscarYouTube(query) {
    const key = query.toLowerCase().trim();

    const cached = global.playCache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
        console.log(`[PLAY] ⚡ Caché: ${key}`);
        return cached.video;
    }

    const esGenerica = key.length <= 5 || GENERICAS.has(key);
    let video = null;

    if (!esGenerica) {
        video = await Promise.any([buscarDelirius(key), buscarNoth(key)]);
    } else {
        const variantes = [key, ...MODIFICADORES.map(m => `${key} ${m}`)].slice(0, 4);
        console.log(`[PLAY] Búsqueda genérica → variantes: ${variantes.join(' | ')}`);

        const resultados = await Promise.allSettled(
            variantes.flatMap(v => [
                buscarDelirius(v).then(r => ({ r, v })),
                buscarNoth(v).then(r => ({ r, v }))
            ])
        );

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
    return await Promise.any([
        (async () => {
            const d = await getJSON(`${DELIRIUS.mp3}?url=${encodeURIComponent(url)}`, 18000);
            if (d.status !== true && d.estado !== true) throw new Error('x');
            const i = normInfo(d.data || d.datos || {});
            if (!i.downloadUrl) throw new Error('x');
            return i;
        })(),
        (async () => {
            const d = await getJSON(`${NOTH.mp3}?url=${encodeURIComponent(url)}&apikey=${NOTH.key}`, 18000);
            if (d.status !== true && d.estado !== true) throw new Error('x');
            const i = normInfo(d.data || d.datos || {});
            if (!i.downloadUrl) throw new Error('x');
            return i;
        })()
    ]);
}

async function infoVideo(url) {
    return await Promise.any([
        (async () => {
            const d = await getJSON(`${DELIRIUS.mp4}?url=${encodeURIComponent(url)}&format=${FORMATO_VIDEO}`, 18000);
            if (d.status !== true && d.estado !== true) throw new Error('x');
            const i = normInfo(d.data || d.datos || {});
            if (!i.downloadUrl) throw new Error('x');
            return i;
        })(),
        (async () => {
            const d = await getJSON(`${NOTH.mp4}?url=${encodeURIComponent(url)}&apikey=${NOTH.key}`, 18000);
            if (d.status !== true && d.estado !== true) throw new Error('x');
            const i = normInfo(d.data || d.datos || {});
            if (!i.downloadUrl) throw new Error('x');
            return i;
        })()
    ]);
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
        await responder.texto('🎵 Descargando audio...');

        const info = await infoAudio(video.url);
        const buffer = await descargarBuffer(info.downloadUrl, 60000);

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
                '╭━━〔 🎵 𝐏𝐋𝐘 〕━━\n' +
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
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
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

            const caption =
                '╭━━〔  𝐏𝐋𝐀𝐘 〕━━⬣\n' +
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

            const botones = [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'playaudio' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'playvideo' }) }
            ];

            const mensajePreview = video.thumbnail
                ? { image: { url: video.thumbnail }, caption, footer: '🎵 BOT-API • Elige formato', interactiveButtons: botones }
                : { text: caption, footer: '🎵 BOT-API • Elige formato', interactiveButtons: botones };

            try {
                await sock.sendMessage(jid, mensajePreview, { quoted: msg });
            } catch (e) {
                await responder.texto(caption + '\n\nResponde *1* para audio o *2* para video');
            }

        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ No se pudo buscar\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

export { procesarAudio, procesarVideo };