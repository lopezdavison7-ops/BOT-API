import fetch from 'node-fetch';
import https from 'node:https';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 8 });
const FAA_API = 'https://api-faa.my.id/faa';

const API_BUSCAR = 'https://api.delirius.online/search/ytsearch';
const CACHE_TTL = 5 * 60 * 1000;
const SESION_TTL = 10 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

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

function parsearDuracion(duracionStr) {
    if (!duracionStr) return 0;
    const str = String(duracionStr).trim();
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

function limpiarSesionesViejas() {
    const ahora = Date.now();
    for (const k of Object.keys(global.playSessions)) {
        if (ahora - global.playSessions[k].timestamp > SESION_TTL) {
            delete global.playSessions[k];
        }
    }
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
        console.log('[PLAY] No se pudieron obtener metadatos de la URL');
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

async function descargarMedia(url, timeoutMs, tipo) {
    try {
        console.log(`[PLAY-${tipo}] Descargando: ${url.substring(0, 100)}...`);
        
        const res = await fetch(url, {
            agent: AGENTE,
            headers: {
                'User-Agent': getUA(),
                'Accept': '*/*',
                'Referer': 'https://www.youtube.com/'
            },
            signal: AbortSignal.timeout(timeoutMs)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const contentType = (res.headers.get('content-type') || '').split(';')[0].trim();
        const buffer = Buffer.from(await res.arrayBuffer());

        if (!buffer.length) throw new Error('Buffer vacío');

        console.log(`[PLAY-${tipo}] Descargado: ct=${contentType} bytes=${buffer.length}`);

        if (tipo === 'audio') {
            const mime = detectarFormatoAudio(buffer);
            if (!mime) throw new Error('Audio no reconocido (ct=' + contentType + ')');
            return { buffer, mimetype: mime };
        }

        if (tipo === 'video') {
            const ok = esMp4Valido(buffer);
            if (!ok) throw new Error('Video no reconocido (ct=' + contentType + ')');
            return { buffer, mimetype: 'video/mp4' };
        }

        return { buffer, mimetype: contentType || 'application/octet-stream' };

    } catch (e) {
        console.log(`[PLAY-${tipo}] Error: ${e.message}`);
        throw e;
    }
}

async function audioDesdeFaa(videoUrl) {
    const endpoints = [
        `${FAA_API}/youtube?url=`,
        `${FAA_API}/yt?url=`,
        `${FAA_API}/ytmp3?url=`
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`[PLAY-AUDIO] Faa endpoint: ${endpoint}`);
            const data = await getJSON(`${endpoint}${encodeURIComponent(videoUrl)}`, 15000);
            console.log('[PLAY-AUDIO] Faa JSON completo:', JSON.stringify(data));
            
            if (data?.status === true || data?.status === 'true') {
                const result = data.result || data.data || {};
                const urlMp3 = result.mp3 || result.audio || result.url || result.download;
                
                if (urlMp3) {
                    console.log('[PLAY-AUDIO] ✅ Faa OK:', urlMp3);
                    return {
                        urlMp3,
                        titulo: result.title || result.titulo || '',
                        duracion: result.duration || result.duracion || ''
                    };
                }
            }
            
            console.log('[PLAY-AUDIO] ❌ Faa: respuesta inválida');
        } catch (e) {
            console.log('[PLAY-AUDIO] ❌ Faa error:', e.message);
        }
    }
    
    return null;
}

async function videoDesdeFaa(videoUrl) {
    const endpoints = [
        `${FAA_API}/ytmp4?url=`,
        `${FAA_API}/youtube-video?url=`,
        `${FAA_API}/yt-video?url=`
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`[PLAY-VIDEO] Faa endpoint: ${endpoint}`);
            const data = await getJSON(`${endpoint}${encodeURIComponent(videoUrl)}`, 15000);
            console.log('[PLAY-VIDEO] Faa JSON completo:', JSON.stringify(data));
            
            if (data?.status === true || data?.status === 'true') {
                const result = data.result || data.data || {};
                const urlVideo = result.download_url || result.video || result.url || result.download || result.mp4;
                
                if (urlVideo) {
                    console.log('[PLAY-VIDEO] ✅ Faa OK:', urlVideo);
                    return urlVideo;
                }
            }
            
            console.log('[PLAY-VIDEO] ❌ Faa: respuesta inválida');
        } catch (e) {
            console.log('[PLAY-VIDEO] ❌ Faa error:', e.message);
        }
    }
    
    return null;
}

export async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎵 Descargando audio...');

        const fuenteFaa = await audioDesdeFaa(video.url);
        
        if (!fuenteFaa) {
            throw new Error('Faa no devolvió enlace de audio');
        }

        const resultado = await descargarMedia(fuenteFaa.urlMp3, 60000, 'audio');
        const { buffer, mimetype } = resultado;
        
        const duracionFinal = fuenteFaa.duracion || video.duracion;
        const segundos = parsearDuracion(duracionFinal);
        const extension = mimetype === 'audio/mp4' ? 'm4a' : (mimetype === 'audio/ogg' ? 'ogg' : 'mp3');

        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: mimetype,
            fileName: `audio.${extension}`,
            ptt: false,
            seconds: segundos,
            contextInfo: {
                externalAdReply: {
                    title: fuenteFaa.titulo || video.titulo,
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

        const urlFaa = await videoDesdeFaa(video.url);
        
        if (!urlFaa) {
            throw new Error('Faa no devolvió enlace de video');
        }

        const resultado = await descargarMedia(urlFaa, 120000, 'video');
        const { buffer } = resultado;
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
            const video = await buscarYouTube(query);

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