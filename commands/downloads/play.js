import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 12 });

const API_KEY = '8ez2gm';
const API_BUSCAR_NEOXR = `https://api.neoxr.eu/api/yts`;
const API_BUSCAR_DELIRIUS = `https://api.delirius.online/search/ytsearch`;
const API_DESCARGA = `https://api.neoxr.eu/api/youtube`;

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

async function getJSON(url, timeoutMs) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: {
            'Accept': 'application/json',
            'User-Agent': getUA(),
            'Referer': 'https://www.neoxr.eu/'
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
        titulo: v.title || 'Sin título',
        thumbnail: v.image || v.thumbnail || '',
        duracion: v.duration?.timestamp || v.timestamp || '0:00',
        vistas: v.views || 0,
        autor: v.author?.name || 'Desconocido'
    };
}

async function buscarEnNeoxr(query) {
    console.log(`[PLAY-NEOXR] Buscando: "${query}"`);
    const url = `${API_BUSCAR_NEOXR}?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    console.log(`[PLAY-NEOXR] URL: ${url}`);
    
    const data = await getJSON(url, 10000);
    console.log(`[PLAY-NEOXR] Respuesta completa:`, JSON.stringify(data, null, 2).substring(0, 800));
    
    if (data.status !== true) {
        throw new Error(`Neoxr: ${data.message || data.msg || 'Status no es true'}`);
    }
    
    const lista = data.data || [];
    console.log(`[PLAY-NEOXR] Resultados encontrados: ${lista.length}`);
    
    if (!Array.isArray(lista) || lista.length === 0) {
        throw new Error('Neoxr: Sin resultados');
    }
    
    const v = lista.find(x => x.type === 'video') || lista[0];
    if (!v) throw new Error('Neoxr: No se pudo extraer video');
    
    return normVideo(v);
}

async function buscarEnDelirius(query) {
    console.log(`[PLAY-DELIRIUS] Buscando: "${query}"`);
    const url = `${API_BUSCAR_DELIRIUS}?q=${encodeURIComponent(query)}`;
    console.log(`[PLAY-DELIRIUS] URL: ${url}`);
    
    const data = await getJSON(url, 10000);
    console.log(`[PLAY-DELIRIUS] Respuesta completa:`, JSON.stringify(data, null, 2).substring(0, 800));
    
    if (data.status !== true && data.estado !== true) {
        throw new Error(`Delirius: ${data.message || 'Status no es true'}`);
    }
    
    const lista = data.data || data.datos || [];
    console.log(`[PLAY-DELIRIUS] Resultados encontrados: ${lista.length}`);
    
    if (!Array.isArray(lista) || lista.length === 0) {
        throw new Error('Delirius: Sin resultados');
    }
    
    const v = lista.find(x => (x.type || x.tipo) === 'video' && !(x.isLive || x.enVivo)) || lista[0];
    if (!v) throw new Error('Delirius: No se pudo extraer video');
    
    return normVideo(v);
}

async function buscarUna(query) {
    try {
        return await buscarEnNeoxr(query);
    } catch (errorNeoxr) {
        console.log(`[PLAY] Neoxr falló: ${errorNeoxr.message}, intentando Delirius...`);
        try {
            return await buscarEnDelirius(query);
        } catch (errorDelirius) {
            throw new Error(`Ambas APIs fallaron. Neoxr: ${errorNeoxr.message} | Delirius: ${errorDelirius.message}`);
        }
    }
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
        autor: 'Desconocido'
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

        if (!video) throw new Error('Sin resultados en ninguna variante');
    }

    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });

    return video;
}

async function infoDescarga(url, tipo, calidad) {
    const apiUrl = `${API_DESCARGA}?url=${encodeURIComponent(url)}&type=${tipo}&quality=${calidad}&apikey=${API_KEY}`;
    console.log(`[PLAY] Descargando: ${apiUrl}`);
    
    const data = await getJSON(apiUrl, 25000);
    
    console.log(`[PLAY] Respuesta descarga:`, JSON.stringify(data, null, 2).substring(0, 500));
    
    if (data.status !== true) {
        const errorMsg = data.message || data.msg || 'Error desconocido';
        console.error(`[PLAY] API descarga falló:`, data);
        throw new Error(`API descarga sin éxito: ${errorMsg}`);
    }
    
    const info = data.data || {};
    if (!info.url) {
        console.error(`[PLAY] Sin URL de descarga:`, data);
        throw new Error('La API no devolvió link de descarga');
    }
    
    console.log(`[PLAY] ✅ URL obtenida: ${info.url.substring(0, 80)}...`);
    
    return {
        titulo: data.title || 'Sin título',
        autor: data.channel || 'Desconocido',
        thumbnail: data.thumbnail || '',
        formato: info.quality || calidad,
        tamaño: info.size || 'Desconocido',
        downloadUrl: info.url
    };
}

async function descargarBuffer(url, timeoutMs) {
    console.log(`[PLAY] Descargando buffer de: ${url.substring(0, 100)}...`);
    
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
    
    console.log(`[PLAY] ✅ Buffer descargado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    return buffer;
}

async function procesarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');

        const info = await infoDescarga(video.url, 'audio', '128kbps');
        const buffer = await descargarBuffer(info.downloadUrl, 90000);

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: msg });
        
        console.log(`[PLAY] ✅ Audio enviado exitosamente`);
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

        const info = await infoDescarga(video.url, 'video', '720p');
        const buffer = await descargarBuffer(info.downloadUrl, 120000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        const caption =
            '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
            '┃ 🎧 *' + titulo + '*\n' +
            '┃ 👤 ' + autor + '\n' +
            '┃ 📊 ' + info.formato + ' | 📦 ' + info.tamaño + '\n' +
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
        
        console.log(`[PLAY] ✅ Video enviado exitosamente`);
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