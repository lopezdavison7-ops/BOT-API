import fetch from 'node-fetch';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import yts from 'yt-search';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const run = promisify(exec);
const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

const KYZO_API_URL = 'https://kyzorohan.web.id/api/ytplay';
const KYZO_API_KEY = 'kyzo_450f7983414f9ec5';
const FAA_API = 'https://api-faa.my.id/faa';

const CACHE_TTL = 5 * 60 * 1000;
const SESION_TTL = 10 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics', 'audio', 'letra'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

function extractVideoId(url) {
    return String(url || '').match(YOUTUBE_ID_REGEX)?.[1] || null;
}

function esURL(input) {
    return /^https?:\/\//i.test(input) || 
           /youtube\.com\/watch/i.test(input) || 
           /youtu\.be\//i.test(input);
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
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function parsearDuracionASegundos(duracionStr) {
    if (!duracionStr) return 0;
    if (typeof duracionStr === 'number') return duracionStr;
    const str = String(duracionStr).trim();
    if (/^\d+$/.test(str)) return parseInt(str) || 0;
    const partes = str.split(':').map(p => parseInt(p) || 0);
    if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
    if (partes.length === 2) return partes[0] * 60 + partes[1];
    return parseInt(str) || 0;
}

function detectarFormatoAudio(buffer) {
    if (buffer.length < 100) return null;
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'audio/mpeg';
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return 'audio/mpeg';
    if (buffer.length > 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'audio/mp4';
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67) return 'audio/ogg';
    return null;
}

function esMp4Valido(buffer) {
    return buffer.length > 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp';
}

function limpiarSesionesViejas() {
    const ahora = Date.now();
    for (const k of Object.keys(global.playSessions)) {
        if (ahora - global.playSessions[k].timestamp > SESION_TTL) {
            delete global.playSessions[k];
        }
    }
}

async function fallbackToMp3Buffer(url) {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const id = crypto.randomBytes(6).toString('hex');
    const inputPath = path.join(tempDir, `ytfb_${id}.bin`);
    const outputPath = path.join(tempDir, `ytfb_${id}.mp3`);

    try {
        const { data } = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
        });

        const buffer = Buffer.from(data);
        if (!buffer.length) throw new Error('Audio fallback vacío');

        fs.writeFileSync(inputPath, buffer);

        await run(
            `ffmpeg -y -i "${inputPath}" -vn -map_metadata -1 -ac 2 -ar 44100 -c:a libmp3lame -b:a 192k "${outputPath}"`,
            { timeout: 120000 }
        );

        const mp3Buffer = fs.readFileSync(outputPath);
        if (!mp3Buffer.length) throw new Error('Conversión a MP3 falló');

        return mp3Buffer;
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }
}

async function callKyzoApi(query) {
    const { data } = await axios.get(KYZO_API_URL, {
        params: { query, key: KYZO_API_KEY },
        timeout: 30000,
    });

    if (!data?.status || !data?.download) {
        throw new Error('Kyzo: API devolvió datos vacíos/inválidos');
    }

    return {
        status: true,
        title: data.title || '',
        dl: data.download,
    };
}

async function ytdlAudioKyzo(url, videoId, titulo) {
    const query = titulo || videoId || url;
    try {
        return await callKyzoApi(query);
    } catch (err) {
        if (query !== url) {
            return await callKyzoApi(url);
        }
        throw err;
    }
}

async function descargarYtmp3Mobi(url, videoId) {
    try {
        const client = axios.create({
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7271.123 Mobile Safari/537.36',
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

        if (!convert?.progressURL || !convert?.downloadURL) {
            throw new Error('No se obtuvo URL de conversión');
        }

        let progress = 0;
        let title = convert.title || '';
        let attempts = 0;
        const maxAttempts = 20;

        while (progress < 3 && attempts < maxAttempts) {
            const { data } = await client.get(convert.progressURL);
            if ((data?.error || 0) > 0) throw new Error(`Error: ${data.error}`);
            progress = Number(data?.progress || 0);
            title = data?.title || title;
            if (progress < 3) {
                attempts += 1;
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }

        if (attempts >= maxAttempts && progress < 3) {
            throw new Error('Timeout');
        }

        return { status: true, title, dl: convert.downloadURL };
    } catch (e) {
        console.log('[YTDL-MOBI] Error:', e.message);
        return { status: false, mess: e.message };
    }
}

async function descargarDesdeFaa(videoUrl, tipo) {
    const endpoint = tipo === 'audio' ? '/youtube' : '/ytmp4';
    
    try {
        console.log(`[FAA-DL] Intentando: ${endpoint}`);
        const url = `${FAA_API}${endpoint}?url=${encodeURIComponent(videoUrl)}`;
        const res = await fetch(url, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(20000)
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        console.log(`[FAA-DL] JSON completo:`, JSON.stringify(data).substring(0, 500));
        
        if (data?.status !== true && data?.estado !== true) {
            console.log(`[FAA-DL] Error: ${data?.message || 'sin éxito'}`);
            return null;
        }
        
        const result = data?.result || data?.data || {};
        let urlDescarga = tipo === 'audio' 
            ? (result?.mp3 || result?.audio || result?.url || result?.download)
            : (result?.download_url || result?.mp4 || result?.video || result?.url || result?.download);
        
        if (typeof urlDescarga === 'object' && urlDescarga?.url) urlDescarga = urlDescarga.url;
        
        if (urlDescarga && typeof urlDescarga === 'string' && urlDescarga.startsWith('http')) {
            console.log(`[FAA-DL] ✅ OK: ${urlDescarga.substring(0, 80)}`);
            return {
                urlDescarga,
                titulo: result?.title || result?.titulo || '',
                duracion: result?.duration || result?.duracion || '',
                autor: result?.author || result?.autor || result?.channel || ''
            };
        }
    } catch (e) {
        console.log(`[FAA-DL] Error: ${e.message}`);
    }
    
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
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*'
        },
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Buffer vacío');
    return buffer;
}

export async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎵 Descargando audio...');

        let buffer = null;
        let mimetype = 'audio/mpeg';
        let fuente = 'Kyzo';

        try {
            const audioKyzo = await ytdlAudioKyzo(video.url, video.videoId, video.titulo);
            if (audioKyzo?.dl) {
                try {
                    buffer = await descargarBuffer(audioKyzo.dl, 60000);
                    const detectedMime = detectarFormatoAudio(buffer);
                    if (detectedMime) {
                        mimetype = detectedMime;
                    } else {
                        console.log('[PLAY-AUDIO] Kyzo devolvió audio no reconocido, usando ffmpeg fallback');
                        buffer = await fallbackToMp3Buffer(audioKyzo.dl);
                        mimetype = 'audio/mpeg';
                    }
                } catch (e) {
                    console.log('[PLAY-AUDIO] Kyzo descarga falló:', e.message);
                    buffer = null;
                }
            }
        } catch (e) {
            console.log('[PLAY-AUDIO] Kyzo API falló:', e.message);
        }

        if (!buffer) {
            console.log('[PLAY-AUDIO] Kyzo falló, usando Faa como fallback...');
            const faaResult = await descargarDesdeFaa(video.url, 'audio');
            if (faaResult?.urlDescarga) {
                try {
                    buffer = await descargarBuffer(faaResult.urlDescarga, 60000);
                    const detectedMime = detectarFormatoAudio(buffer);
                    if (detectedMime) {
                        mimetype = detectedMime;
                    } else {
                        console.log('[PLAY-AUDIO] Faa devolvió audio no reconocido, usando ffmpeg fallback');
                        buffer = await fallbackToMp3Buffer(faaResult.urlDescarga);
                        mimetype = 'audio/mpeg';
                    }
                    fuente = 'Faa';
                } catch (e) {
                    console.log('[PLAY-AUDIO] Faa descarga falló:', e.message);
                }
            }
        }

        if (!buffer) {
            throw new Error('Ningún proveedor devolvió audio válido');
        }

        console.log(`[PLAY-AUDIO] ✅ Descargado con ${fuente}: ${buffer.length} bytes, ${mimetype}`);

        const segundos = video.duracionSegundos || parsearDuracionASegundos(video.duracion);
        const extension = mimetype === 'audio/mp4' ? 'm4a' : (mimetype === 'audio/ogg' ? 'ogg' : 'mp3');

        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: mimetype,
            fileName: `audio.${extension}`,
            ptt: false,
            seconds: segundos,
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
        await responder.texto(
            '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
            '┃ No se pudo enviar el audio.\n' +
            '┃\n' +
            '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
}

export async function procesarVideo(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎬 Descargando video...');

        let buffer = null;
        let fuente = 'ytmp3.mobi';

        try {
            const videoMobi = await descargarYtmp3Mobi(video.url, video.videoId);
            if (videoMobi?.status && videoMobi?.dl) {
                buffer = await descargarBuffer(videoMobi.dl, 120000);
                if (!esMp4Valido(buffer)) {
                    throw new Error('Video no es MP4 válido');
                }
            }
        } catch (e) {
            console.log('[PLAY-VIDEO] ytmp3.mobi falló:', e.message);
        }

        if (!buffer) {
            console.log('[PLAY-VIDEO] ytmp3.mobi falló, usando Faa como fallback...');
            const faaResult = await descargarDesdeFaa(video.url, 'video');
            if (faaResult?.urlDescarga) {
                try {
                    buffer = await descargarBuffer(faaResult.urlDescarga, 120000);
                    if (!esMp4Valido(buffer)) {
                        throw new Error('Video no es MP4 válido');
                    }
                    fuente = 'Faa';
                } catch (e) {
                    console.log('[PLAY-VIDEO] Faa descarga falló:', e.message);
                }
            }
        }

        if (!buffer) {
            throw new Error('Ningún proveedor devolvió video válido');
        }

        console.log(`[PLAY-VIDEO] ✅ Descargado con ${fuente}: ${buffer.length} bytes`);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);

        const caption =
            '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
            '┃ 🎧 *' + video.titulo + '*\n' +
            '┃ 👤 ' + video.autor + '\n' +
            '┃ 📦 ' + tamañoMB + ' MB\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${String(video.titulo).replace(/[^\w\s.-]/g, '').slice(0, 80)}.mp4`,
                caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, {
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
        '┃ 🎯 Elige con botones o\n' +
        '┃    responde *1* o *2*\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    limpiarSesionesViejas();

    const ahora = Date.now();
    const claves = new Set();
    
    const claveUsuario = msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;
    if (claveUsuario) claves.add(claveUsuario);
    if (msg.key.senderPn) claves.add(msg.key.senderPn);
    if (msg.key.participantAlt) claves.add(msg.key.participantAlt);
    if (msg.key.remoteJidAlt) claves.add(msg.key.remoteJidAlt);
    if (jid) claves.add(jid);

    for (const k of claves) {
        global.playSessions[k] = { video, timestamp: ahora };
    }

    console.log(`[PLAY] 🔑 Sesión guardada con claves:`, [...claves].join(' | '));

    let imagenMedia = null;
    try {
        if (video.thumbnail) {
            imagenMedia = await prepareWAMessageMedia(
                { image: { url: video.thumbnail } },
                { upload: sock.waUploadToServer }
            );
        }
    } catch (e) {
        console.log('[PLAY] No se pudo subir thumbnail:', e.message);
    }

    const msgInteractive = {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: {
                    body: { text: caption },
                    footer: { text: '⚡ BOT-API ⚡' },
                    header: imagenMedia?.imageMessage ? {
                        imageMessage: imagenMedia.imageMessage,
                        hasMediaAttachment: true
                    } : {
                        title: '🎵 YouTube Downloader',
                        hasMediaAttachment: false
                    },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎵 Audio',
                                    id: 'play_audio'
                                })
                            },
                            {
                                name: 'quick_reply',
                                buttonParamsJson: JSON.stringify({
                                    display_text: '🎬 Video',
                                    id: 'play_video'
                                })
                            }
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
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre o URL\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play hola (botones)\n' +
                '┃ ➪ .play2 hola (video directo)\n' +
                '┃ ➪ .play https://youtu.be/...\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const enviarDirecto = ['play2', 'playvideo', 'video'].includes(nombreComando);

        try {
            const video = await buscarVideo(query);

            if (enviarDirecto) {
                await procesarVideo(sock, msg, video, responder);
            } else {
                await enviarConBotones(sock, msg, video, jid);
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