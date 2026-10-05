import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });

const APIS_BUSQUEDA = [
    { nombre: 'SiputzX', url: (q) => `https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(q)}` },
    { nombre: 'Caliph', url: (q) => `https://api.caliph.biz.id/api/yt/search?q=${encodeURIComponent(q)}&apikey=caliphkey` },
    { nombre: 'Lann', url: (q) => `https://api.lann.me/api/search/youtube?q=${encodeURIComponent(q)}&apikey=free` },
    { nombre: 'Riy', url: (q) => `https://api.riy.my.id/api/search/youtube?q=${encodeURIComponent(q)}` },
    { nombre: 'Flyy', url: (q) => `https://api.flyy.my.id/api/search/youtube?q=${encodeURIComponent(q)}` },
    { nombre: 'Botcahx', url: (q) => `https://api.botcahx.live/api/search/yt?q=${encodeURIComponent(q)}&apikey=Admin` },
    { nombre: 'Vercel', url: (q) => `https://vercel-ytdl.vercel.app/api/search?query=${encodeURIComponent(q)}` }
];

const APIS_DESCARGA = [
    { nombre: 'SiputzX', url: (url, tipo) => `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(url)}` },
    { nombre: 'Caliph', url: (url, tipo) => `https://api.caliph.biz.id/api/yt/download?url=${encodeURIComponent(url)}&apikey=caliphkey` },
    { nombre: 'Vercel', url: (url, tipo) => `https://vercel-ytdl.vercel.app/api/download?url=${encodeURIComponent(url)}&type=${tipo}` }
];

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

function esURL(input) {
    return /^https?:\/\//i.test(input) || 
           /youtube\.com\/watch/i.test(input) || 
           /youtu\.be\//i.test(input);
}

function extraerVideoId(url) {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

async function fetchJSON(url, timeoutMs, nombre) {
    console.log(`[PLAY-${nombre}] ${url}`);
    const res = await fetch(url, {
        agent: AGENTE,
        headers: {
            'Accept': 'application/json',
            'User-Agent': getUA()
        },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[PLAY-${nombre}] HTTP ${res.status}: ${text.substring(0, 100)}`);
        throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
}

function normVideo(v, source) {
    return {
        videoId: v.videoId || v.id || v.video_id,
        url: v.url || `https://www.youtube.com/watch?v=${v.videoId || v.id || v.video_id}`,
        titulo: v.title || v.judul || 'Sin título',
        thumbnail: v.thumbnail || v.image || v.thumb || '',
        duracion: v.duration || v.durasi || v.timestamp || '0:00',
        vistas: v.views || v.viewers || 0,
        autor: v.author?.name || v.author || v.channel || 'Desconocido',
        source
    };
}

async function probarAPIsBusqueda(query) {
    for (const api of APIS_BUSQUEDA) {
        try {
            const url = api.url(query);
            const data = await fetchJSON(url, 10000, api.nombre);
            
            if (data.status === false || data.error) {
                console.log(`[PLAY-${api.nombre}] Status false o error`);
                continue;
            }
            
            const lista = data.data || data.result || data.results || data.videos || [];
            if (!Array.isArray(lista) || lista.length === 0) {
                console.log(`[PLAY-${api.nombre}] Sin resultados`);
                continue;
            }
            
            const v = lista.find(x => x.type === 'video' || x.videoId) || lista[0];
            if (!v) {
                console.log(`[PLAY-${api.nombre}] No se pudo extraer video`);
                continue;
            }
            
            console.log(`[PLAY-${api.nombre}] ✅ Encontrado: ${v.title || v.judul || 'Sin título'}`);
            return normVideo(v, api.nombre);
        } catch (error) {
            console.log(`[PLAY-${api.nombre}] ❌ ${error.message}`);
            continue;
        }
    }
    throw new Error('Todas las APIs de búsqueda fallaron');
}

function videoDesdeURL(url) {
    const videoId = extraerVideoId(url);
    if (!videoId) throw new Error('URL de YouTube inválida');

    return {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        titulo: 'Cargando...',
        thumbnail: '',
        duracion: '0:00',
        vistas: 0,
        autor: 'Desconocido',
        source: 'URL directa'
    };
}

async function buscarYouTube(query) {
    const key = query.toLowerCase().trim();

    if (esURL(query)) {
        console.log(`[PLAY] 📎 URL directa detectada: ${query}`);
        return videoDesdeURL(query);
    }

    const cached = global.playCache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
        console.log(`[PLAY] ⚡ Caché: ${key}`);
        return cached.video;
    }

    let video = null;
    const esGenerica = key.length <= 5 || GENERICAS.has(key);

    if (!esGenerica) {
        video = await probarAPIsBusqueda(key);
    } else {
        const variantes = [key, ...MODIFICADORES.map(m => `${key} ${m}`)].slice(0, 4);
        console.log(`[PLAY] Genérica → variantes: ${variantes.join(' | ')}`);

        for (const variante of variantes) {
            try {
                video = await probarAPIsBusqueda(variante);
                console.log(`[PLAY] ✅ Variante ganadora: "${variante}"`);
                break;
            } catch (e) {
                continue;
            }
        }

        if (!video) throw new Error('Sin resultados en ninguna variante');
    }

    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });

    return video;
}

async function probarAPIsDescarga(url, tipo) {
    for (const api of APIS_DESCARGA) {
        try {
            const apiUrl = api.url(url, tipo);
            const data = await fetchJSON(apiUrl, 25000, `${api.nombre}-DL`);
            
            if (data.status === false || data.error) {
                console.log(`[PLAY-${api.nombre}-DL] Status false o error`);
                continue;
            }
            
            const info = data.data || data.result || data;
            const downloadUrl = info.url || info.download || info.link || info.mp3 || info.mp4;
            
            if (!downloadUrl) {
                console.log(`[PLAY-${api.nombre}-DL] Sin URL de descarga`);
                continue;
            }
            
            console.log(`[PLAY-${api.nombre}-DL] ✅ URL obtenida`);
            return {
                titulo: info.title || info.judul || 'Sin título',
                autor: info.author || info.channel || 'Desconocido',
                thumbnail: info.thumbnail || info.image || '',
                formato: info.quality || info.format || (tipo === 'audio' ? '128kbps' : '720p'),
                tamaño: info.size || 'Desconocido',
                downloadUrl,
                source: api.nombre
            };
        } catch (error) {
            console.log(`[PLAY-${api.nombre}-DL] ❌ ${error.message}`);
            continue;
        }
    }
    throw new Error('Todas las APIs de descarga fallaron');
}

async function descargarBuffer(url, timeoutMs) {
    console.log(`[PLAY] Descargando buffer: ${url.substring(0, 100)}...`);
    
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { 'User-Agent': getUA(), 'Accept': '*/*' },
        signal: AbortSignal.timeout(timeoutMs)
    });
    
    if (!res.ok) {
        console.error(`[PLAY] Descarga buffer falló: HTTP ${res.status}`);
        throw new Error('Descarga HTTP ' + res.status);
    }
    
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) {
        console.error(`[PLAY] Buffer vacío`);
        throw new Error('Buffer vacío');
    }
    
    console.log(`[PLAY] ✅ Buffer: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    return buffer;
}

async function procesarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');

        const info = await probarAPIsDescarga(video.url, 'audio');
        const buffer = await descargarBuffer(info.downloadUrl, 90000);

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: msg });
        
        console.log(`[PLAY] ✅ Audio enviado`);
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

        const info = await probarAPIsDescarga(video.url, 'video');
        const buffer = await descargarBuffer(info.downloadUrl, 120000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        const caption =
            '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
            '┃ 🎧 *' + titulo + '*\n' +
            '┃ 👤 ' + autor + '\n' +
            '┃ 📊 ' + info.formato + ' | 📦 ' + info.tamaño + '\n' +
            '┃ 📡 Fuente: ' + info.source + '\n' +
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
        
        console.log(`[PLAY] ✅ Video enviado`);
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
    uso: '.play <nombre o URL>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre o URL\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play hola remix\n' +
                '┃ ➪ .play twice fancy\n' +
                '┃ ➪ .play https://youtu.be/...\n' +
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

            const caption =
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 ' + video.autor + '\n' +
                '┃ ⏱️ ' + video.duracion + '\n' +
                '┃ 👀 ' + formatearVistas(video.vistas) + '\n' +
                '┃ 📡 Fuente: ' + video.source + '\n' +
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
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Intenta con otro nombre\n' +
                '┃    o verifica tu conexión.\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

export { procesarAudio, procesarVideo };