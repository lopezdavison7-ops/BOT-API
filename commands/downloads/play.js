import fetch from 'node-fetch';
import axios from 'axios';
import yts from 'yt-search';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const KYZO_API_URL = 'https://kyzorohan.web.id/api/ytplay';
const KYZO_API_KEY = 'kyzo_450f7983414f9ec5';
const FAA_API = 'https://api-faa.my.id/faa';

const CACHE_TTL = 5 * 60 * 1000;
const SESION_TTL = 10 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics', 'audio'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

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
            timeout: 30000,
        });
        if (data?.status && data?.download) {
            console.log(`[KYZO] ✅ OK: ${data.download.substring(0, 60)}`);
            return data.download;
        }
        console.log('[KYZO] Respuesta sin download:', JSON.stringify(data).substring(0, 200));
    } catch (e) {
        console.log('[KYZO] Error:', e.message);
    }
    return null;
}

async function audioFaa(query) {
    try {
        await new Promise(r => setTimeout(r, 600));
        const url = `${FAA_API}/youtube?q=${encodeURIComponent(query)}`;
        console.log(`[FAA] Buscando con q: ${url.substring(0, 100)}`);
        
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(20000)
        });
        
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            console.log(`[FAA] Error HTTP ${res.status}: ${text.substring(0, 150)}`);
            return null;
        }
        
        const data = await res.json();
        console.log(`[FAA] JSON:`, JSON.stringify(data).substring(0, 300));
        
        if (data?.status !== true) return null;
        
        const result = data?.result || data?.data || {};
        const urlMp3 = result?.mp3 || result?.audio || result?.url;
        
        if (urlMp3 && typeof urlMp3 === 'string' && urlMp3.startsWith('http')) {
            console.log(`[FAA] ✅ OK: ${urlMp3.substring(0, 60)}`);
            return urlMp3;
        }
    } catch (e) {
        console.log('[FAA] Error:', e.message);
    }
    return null;
}

async function videoYtmp3Mobi(videoId) {
    try {
        const client = axios.create({
            timeout: 60000,
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
        if (!convert?.progressURL || !convert?.downloadURL) throw new Error('Sin URL de conversión');

        let progress = 0, attempts = 0;
        while (progress < 3 && attempts < 20) {
            const { data } = await client.get(convert.progressURL);
            if ((data?.error || 0) > 0) throw new Error(`Error: ${data.error}`);
            progress = Number(data?.progress || 0);
            if (progress < 3) { attempts++; await new Promise(r => setTimeout(r, 250)); }
        }
        if (attempts >= 20 && progress < 3) throw new Error('Timeout');
        
        console.log(`[YTDL-MOBI] ✅ OK: ${convert.downloadURL.substring(0, 60)}`);
        return convert.downloadURL;
    } catch (e) {
        console.log('[YTDL-MOBI] Error:', e.message);
    }
    return null;
}

async function videoFaa(query) {
    try {
        await new Promise(r => setTimeout(r, 600));
        const url = `${FAA_API}/ytmp4?q=${encodeURIComponent(query)}`;
        console.log(`[FAA-VIDEO] Buscando: ${url.substring(0, 100)}`);
        
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(20000)
        });
        
        if (!res.ok) return null;
        const data = await res.json();
        console.log(`[FAA-VIDEO] JSON:`, JSON.stringify(data).substring(0, 300));
        
        if (data?.status !== true) return null;
        
        const result = data?.result || data?.data || {};
        const urlVideo = result?.download_url || result?.mp4 || result?.video || result?.url;
        
        if (urlVideo && typeof urlVideo === 'string' && urlVideo.startsWith('http')) {
            console.log(`[FAA-VIDEO] ✅ OK: ${urlVideo.substring(0, 60)}`);
            return urlVideo;
        }
    } catch (e) {
        console.log('[FAA-VIDEO] Error:', e.message);
    }
    return null;
}

export async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎵 Descargando audio...');

        let urlAudio = await audioKyzo(video.titulo);
        let fuente = 'Kyzo';
        
        if (!urlAudio) {
            console.log('[PLAY-AUDIO] Kyzo falló, probando Faa...');
            urlAudio = await audioFaa(video.titulo);
            fuente = 'Faa';
        }
        
        if (!urlAudio) throw new Error('Ningún proveedor devolvió audio');

        const buffer = await descargarBuffer(urlAudio, 60000);
        console.log(`[PLAY-AUDIO] ✅ Descargado con ${fuente}: ${buffer.length} bytes`);

        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.titulo.slice(0, 60).replace(/[^\w\s.-]/g, '')}.mp3`,
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
        
    } catch (error) {
        console.error('[PLAY-AUDIO] Error:', error?.message || error);
        await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ No se pudo enviar el audio.\n┃\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

export async function procesarVideo(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎬 Descargando video...');

        let urlVideo = await videoYtmp3Mobi(video.videoId);
        let fuente = 'ytmp3.mobi';
        
        if (!urlVideo) {
            console.log('[PLAY-VIDEO] ytmp3.mobi falló, probando Faa...');
            urlVideo = await videoFaa(video.titulo);
            fuente = 'Faa';
        }
        
        if (!urlVideo) throw new Error('Ningún proveedor devolvió video');

        const buffer = await descargarBuffer(urlVideo, 120000);
        console.log(`[PLAY-VIDEO] ✅ Descargado con ${fuente}: ${buffer.length} bytes`);

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