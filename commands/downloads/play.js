import fetch from 'node-fetch';
import axios from 'axios';
import yts from 'yt-search';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const KYZO_API_URL = 'https://kyzorohan.web.id/api/ytplay';
const KYZO_API_KEY = 'kyzo_450f7983414f9ec5';
const FAA_API = 'https://api-faa.my.id/faa';

const CACHE_TTL = 5 * 60 * 1000;
const SESION_TTL = 10 * 60 * 1000;
const DOWNLOAD_CACHE_TTL = 10 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics', 'audio'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};
if (!global.downloadCache) global.downloadCache = new Map();

const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

function extractVideoId(url) {
    return String(url || '').match(YOUTUBE_ID_REGEX)?.[1] || null;
}

function esURL(input) {
    return /^https?:\/\//i.test(input) || /youtube\.com\/watch/i.test(input) || /youtu\.be\//i.test(input);
}

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

function parsearDuracion(segundos) {
    if (!segundos || isNaN(segundos)) return '0:00';
    const s = Math.floor(Number(segundos));
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function limpiarSesionesViejas() {
    const ahora = Date.now();
    for (const k of Object.keys(global.playSessions)) {
        if (ahora - global.playSessions[k].timestamp > SESION_TTL) delete global.playSessions[k];
    }
}

function validarAudio(buffer) {
    if (!buffer || buffer.length < 1000) return null;
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'audio/mpeg';
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return 'audio/mpeg';
    if (buffer.length > 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'audio/mp4';
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67) return 'audio/ogg';
    if (buffer.slice(0, 4).toString('ascii') === 'RIFF') return 'audio/wav';
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) return 'audio/webm';
    return null;
}

function validarVideo(buffer) {
    if (!buffer || buffer.length < 1000) return null;
    if (buffer.length > 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
    return null;
}

async function buscarVideo(query) {
    if (esURL(query)) {
        const videoId = extractVideoId(query);
        if (!videoId) throw new Error('URL de YouTube inválida');
        try {
            const info = await yts({ videoId });
            if (info?.title) {
                return {
                    videoId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    titulo: info.title,
                    thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duracion: parsearDuracion(info.seconds),
                    duracionSegundos: info.seconds || 0,
                    vistas: info.views || 0,
                    autor: info.author?.name || 'Desconocido'
                };
            }
        } catch (e) {
            console.log('[YT-SEARCH] Error buscando por ID:', e.message);
        }
        return {
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            titulo: 'Video de YouTube',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duracion: '0:00',
            duracionSegundos: 0,
            vistas: 0,
            autor: 'Desconocido'
        };
    }

    const key = query.toLowerCase().trim();
    const cached = global.playCache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
        console.log(`[PLAY] ⚡ Caché: ${key}`);
        return cached.video;
    }

    let video = null;
    const esGenerica = key.length <= 5 || GENERICAS.has(key);
    const variantes = esGenerica 
        ? [key, ...MODIFICADORES.map(m => `${key} ${m}`)].slice(0, 4)
        : [key];

    console.log(`[PLAY] Buscando: ${variantes.join(' | ')}`);

    for (const variante of variantes) {
        try {
            const results = await yts(variante);
            const videos = results?.videos || [];
            if (!videos.length) continue;
            const v = videos.find(x => x.type === 'video' && !x.isLive) || videos[0];
            if (v) {
                video = {
                    videoId: v.videoId,
                    url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
                    titulo: v.title || 'Sin título',
                    thumbnail: v.thumbnail || v.image || '',
                    duracion: parsearDuracion(v.seconds),
                    duracionSegundos: v.seconds || 0,
                    vistas: v.views || 0,
                    autor: v.author?.name || 'Desconocido'
                };
                console.log(`[PLAY] ✅ Encontrado: "${v.title}"`);
                break;
            }
        } catch (e) {
            console.log(`[PLAY] Error buscando "${variante}":`, e.message);
        }
    }

    if (!video) throw new Error('Sin resultados de búsqueda');
    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });
    return video;
}

async function descargarBuffer(url, timeoutMs = 60000) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Buffer vacío');
    return buffer;
}

async function audioKyzo(query) {
    try {
        const { data } = await axios.get(KYZO_API_URL, {
            params: { query, key: KYZO_API_KEY },
            timeout: 15000,
        });
        if (data?.status && data?.download) {
            console.log(`[KYZO] ✅ URL obtenida`);
            return data.download;
        }
    } catch (e) {
        console.log('[KYZO] Error:', e.message);
    }
    return null;
}

async function audioMobi(videoId) {
    try {
        const client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36',
                'Referer': 'https://id.ytmp3.mobi/',
            },
        });

        const { data: init } = await client.get('https://d.ymcdn.org/api/v1/init', {
            params: { p: 'y', 23: '1llum1n471', _: Math.random() },
        });
        if (!init?.convertURL) throw new Error('Init failed');

        const { data: convert } = await client.get(init.convertURL, {
            params: { v: videoId, f: 'mp3', _: Math.random() },
        });
        if (!convert?.progressURL || !convert?.downloadURL) throw new Error('Sin URL');

        let progress = 0, attempts = 0;
        while (progress < 3 && attempts < 15) {
            const { data } = await client.get(convert.progressURL);
            if ((data?.error || 0) > 0) throw new Error(`Error: ${data.error}`);
            progress = Number(data?.progress || 0);
            if (progress < 3) { attempts++; await new Promise(r => setTimeout(r, 200)); }
        }
        if (attempts >= 15 && progress < 3) throw new Error('Timeout');
        
        console.log(`[MOBI-MP3] ✅ URL obtenida`);
        return convert.downloadURL;
    } catch (e) {
        console.log('[MOBI-MP3] Error:', e.message);
    }
    return null;
}

async function videoMobi(videoId) {
    try {
        const client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36',
                'Referer': 'https://id.ytmp3.mobi/',
            },
        });

        const { data: init } = await client.get('https://d.ymcdn.org/api/v1/init', {
            params: { p: 'y', 23: '1llum1n471', _: Math.random() },
        });
        if (!init?.convertURL) throw new Error('Init failed');

        const { data: convert } = await client.get(init.convertURL, {
            params: { v: videoId, f: 'mp4', _: Math.random() },
        });
        if (!convert?.progressURL || !convert?.downloadURL) throw new Error('Sin URL');

        let progress = 0, attempts = 0;
        while (progress < 3 && attempts < 15) {
            const { data } = await client.get(convert.progressURL);
            if ((data?.error || 0) > 0) throw new Error(`Error: ${data.error}`);
            progress = Number(data?.progress || 0);
            if (progress < 3) { attempts++; await new Promise(r => setTimeout(r, 200)); }
        }
        if (attempts >= 15 && progress < 3) throw new Error('Timeout');
        
        console.log(`[MOBI-MP4] ✅ URL obtenida`);
        return convert.downloadURL;
    } catch (e) {
        console.log('[MOBI-MP4] Error:', e.message);
    }
    return null;
}

async function videoFaa(query) {
    try {
        await new Promise(r => setTimeout(r, 600));
        const url = `${FAA_API}/ytmp4?q=${encodeURIComponent(query)}`;
        console.log(`[FAA-VIDEO] Buscando...`);
        
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(20000)
        });
        
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.status !== true) return null;
        
        const result = data?.result || data?.data || {};
        const urlVideo = result?.download_url || result?.mp4 || result?.video || result?.url;
        
        if (urlVideo && typeof urlVideo === 'string' && urlVideo.startsWith('http')) {
            console.log(`[FAA-VIDEO] ✅ URL obtenida`);
            return urlVideo;
        }
    } catch (e) {
        console.log('[FAA-VIDEO] Error:', e.message);
    }
    return null;
}

async function obtenerAudioValido(video) {
    const cacheKey = `audio_${video.videoId}`;
    const cached = global.downloadCache.get(cacheKey);
    if (cached && Date.now() - cached.t < DOWNLOAD_CACHE_TTL) {
        console.log(`[AUDIO] ⚡ Usando URL en caché`);
        try {
            const buffer = await descargarBuffer(cached.url, 60000);
            const mimetype = validarAudio(buffer);
            if (mimetype) {
                console.log(`[AUDIO] ✅ Caché válido (${mimetype})`);
                return { buffer, mimetype, fuente: 'Caché' };
            }
        } catch (e) {
            console.log('[AUDIO] Caché falló, buscando de nuevo...');
        }
    }

    console.log('[AUDIO] Probando Kyzo y Mobi en paralelo...');
    
    const promesas = [
        audioKyzo(video.titulo).then(url => url ? { nombre: 'Kyzo', url } : null),
        audioMobi(video.videoId).then(url => url ? { nombre: 'Mobi', url } : null)
    ];

    const resultados = await Promise.allSettled(promesas);
    
    for (const resultado of resultados) {
        if (resultado.status === 'fulfilled' && resultado.value) {
            const { nombre, url } = resultado.value;
            try {
                console.log(`[AUDIO] Descargando de ${nombre}...`);
                const buffer = await descargarBuffer(url, 60000);
                const mimetype = validarAudio(buffer);
                if (mimetype) {
                    console.log(`[AUDIO] ✅ ${nombre} dio audio válido (${mimetype})`);
                    global.downloadCache.set(cacheKey, { url, t: Date.now() });
                    return { buffer, mimetype, fuente: nombre };
                }
                console.log(`[AUDIO] ❌ ${nombre} dio buffer inválido`);
            } catch (e) {
                console.log(`[AUDIO] ${nombre} descarga falló: ${e.message}`);
            }
        }
    }
    
    return null;
}

async function obtenerVideoValido(video) {
    const cacheKey = `video_${video.videoId}`;
    const cached = global.downloadCache.get(cacheKey);
    if (cached && Date.now() - cached.t < DOWNLOAD_CACHE_TTL) {
        console.log(`[VIDEO] ⚡ Usando URL en caché`);
        try {
            const buffer = await descargarBuffer(cached.url, 120000);
            const mimetype = validarVideo(buffer);
            if (mimetype) {
                console.log(`[VIDEO] ✅ Caché válido`);
                return { buffer, mimetype, fuente: 'Caché' };
            }
        } catch (e) {
            console.log('[VIDEO] Caché falló, buscando de nuevo...');
        }
    }

    console.log('[VIDEO] Probando Mobi y Faa en paralelo...');
    
    const promesas = [
        videoMobi(video.videoId).then(url => url ? { nombre: 'Mobi', url } : null),
        videoFaa(video.titulo).then(url => url ? { nombre: 'Faa', url } : null)
    ];

    const resultados = await Promise.allSettled(promesas);
    
    for (const resultado of resultados) {
        if (resultado.status === 'fulfilled' && resultado.value) {
            const { nombre, url } = resultado.value;
            try {
                console.log(`[VIDEO] Descargando de ${nombre}...`);
                const buffer = await descargarBuffer(url, 120000);
                const mimetype = validarVideo(buffer);
                if (mimetype) {
                    console.log(`[VIDEO] ✅ ${nombre} dio video válido`);
                    global.downloadCache.set(cacheKey, { url, t: Date.now() });
                    return { buffer, mimetype, fuente: nombre };
                }
                console.log(`[VIDEO] ❌ ${nombre} dio buffer inválido`);
            } catch (e) {
                console.log(`[VIDEO] ${nombre} descarga falló: ${e.message}`);
            }
        }
    }
    
    return null;
}

export async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎵 Descargando audio...');

        const resultado = await obtenerAudioValido(video);
        if (!resultado) throw new Error('Ningún proveedor dio audio válido');

        const { buffer, mimetype, fuente } = resultado;
        const extension = mimetype === 'audio/mp4' ? 'm4a' : (mimetype === 'audio/ogg' ? 'ogg' : (mimetype === 'audio/webm' ? 'opus' : 'mp3'));

        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: mimetype,
            fileName: `${video.titulo.slice(0, 60).replace(/[^\w\s.-]/g, '')}.${extension}`,
            ptt: false,
            seconds: video.duracionSegundos,
            contextInfo: {
                externalAdReply: {
                    title: video.titulo,
                    body: video.autor,
                    thumbnailUrl: video.thumbnail,
                    mediaType: 2,
                    mediaUrl: video.url,
                    sourceUrl: video.url
                }
            }
        }, { quoted: msg });
        
        console.log(`[PLAY-AUDIO] ✅ Enviado desde ${fuente}`);
        
    } catch (error) {
        console.error('[PLAY-AUDIO] Error:', error?.message || error);
        await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ No se pudo enviar el audio.\n┃\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

export async function procesarVideo(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎬 Descargando video...');

        const resultado = await obtenerVideoValido(video);
        if (!resultado) throw new Error('Ningún proveedor dio video válido');

        const { buffer, fuente } = resultado;
        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const caption = '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n┃ 🎧 *' + video.titulo + '*\n┃ 👤 ' + video.autor + '\n┃ 📦 ' + tamañoMB + ' MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${video.titulo.slice(0, 60).replace(/[^\w\s.-]/g, '')}.mp4`,
                caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption }, { quoted: msg });
        }
        
        console.log(`[PLAY-VIDEO] ✅ Enviado desde ${fuente}`);
        
    } catch (error) {
        console.error('[PLAY-VIDEO] Error:', error?.message || error);
        await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ No se pudo enviar el video.\n┃\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

async function enviarConBotones(sock, msg, video, jid) {
    const caption = '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃\n┃ 🎧 *' + video.titulo + '*\n┃ 👤 ' + video.autor + '\n┃ ⏱️ ' + video.duracion + '\n┃ 👀 ' + formatearVistas(video.vistas) + '\n┃\n┃ 🎯 Elige con botones o\n┃    responde *1* o *2*\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    limpiarSesionesViejas();
    const ahora = Date.now();
    const claves = new Set([
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.remoteJidAlt, jid
    ].filter(Boolean));
    for (const k of claves) global.playSessions[k] = { video, timestamp: ahora };

    let imagenMedia = null;
    try {
        if (video.thumbnail) {
            imagenMedia = await prepareWAMessageMedia(
                { image: { url: video.thumbnail } },
                { upload: sock.waUploadToServer }
            );
        }
    } catch (e) {}

    const msgInteractive = {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: caption },
                    footer: { text: '⚡ BOT-API ⚡' },
                    header: imagenMedia?.imageMessage ? {
                        imageMessage: imagenMedia.imageMessage,
                        hasMediaAttachment: true
                    } : { title: '🎵 YouTube Downloader', hasMediaAttachment: false },
                    nativeFlowMessage: {
                        buttons: [
                            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'play_audio' }) },
                            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'play_video' }) }
                        ],
                        messageParamsJson: ''
                    }
                }
            }
        }
    };

    const waMsg = generateWAMessageFromContent(jid, msgInteractive, {
        userJid: sock.user?.id || jid,
        quoted: msg
    });
    await sock.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
}

export default {
    nombre: 'play',
    categoria: 'Descargas',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: '.play → botones | .play2 → video directo',

    ejecutar: async ({ sock, msg, argumento, responder, jid, nombreComando }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto('╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃\n┃ ❌ Escribe el nombre o URL\n┃\n┃ 💡 Ejemplos:\n┃ ➪ .play hola (botones)\n┃ ➪ .play2 hola (video directo)\n┃ ➪ .play https://youtu.be/...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        }

        const enviarDirecto = ['play2', 'playvideo', 'video'].includes(nombreComando);

        try {
            const video = await buscarVideo(query);
            if (enviarDirecto) await procesarVideo(sock, msg, video, responder);
            else await enviarConBotones(sock, msg, video, jid);
        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n┃\n┃ 💡 Intenta con otro nombre\n┃    o verifica tu conexión.\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        }
    }
};