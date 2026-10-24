import fetch from 'node-fetch';
import https from 'node:https';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 8 });

const FAA_API = 'https://api-faa.my.id/faa';
const API_BUSCAR = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const COBALT_API = 'https://api.cobalt.tools';

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.reallyaweso.me',
    'https://api.piped.private.coffee'
];

const INVIDIOUS_INSTANCES = [
    'https://inv.nadeko.net',
    'https://yewtu.be',
    'https://invidious.nerdvpn.de'
];

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
    let ultimoError = null;

    for (let intento = 1; intento <= 2; intento++) {
        try {
            console.log(`[PLAY-${tipo}] Intento ${intento}: Descargando ${url.substring(0, 80)}...`);
            
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

            console.log(`[PLAY-${tipo}] Intento ${intento}: ct=${contentType} bytes=${buffer.length}`);

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
            ultimoError = e;
            console.log(`[PLAY-${tipo}] Intento ${intento} falló: ${e.message}`);
            if (intento < 2) await new Promise(r => setTimeout(r, 1000));
        }
    }

    throw ultimoError || new Error('Descarga fallida');
}

async function audioDesdeFaa(videoUrl) {
    try {
        console.log('[PLAY-AUDIO] Intentando Faa...');
        const data = await getJSON(`${FAA_API}/youtube?url=${encodeURIComponent(videoUrl)}`, 20000);
        console.log('[PLAY-AUDIO] Faa respuesta:', JSON.stringify(data).substring(0, 200));
        
        if (data?.status === true && data?.result?.mp3) {
            console.log('[PLAY-AUDIO] ✅ Faa OK');
            return {
                urlMp3: data.result.mp3,
                titulo: data.result.title || '',
                duracion: data.result.duration || ''
            };
        }
        console.log('[PLAY-AUDIO] ❌ Faa: respuesta inválida');
    } catch (e) {
        console.log('[PLAY-AUDIO] ❌ Faa falló:', e.message);
    }
    return null;
}

async function audioDesdeCobalt(videoUrl) {
    try {
        console.log('[PLAY-AUDIO] Intentando Cobalt...');
        const res = await fetch(`${COBALT_API}/api/json`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': getUA()
            },
            body: JSON.stringify({
                url: videoUrl,
                vCodec: 'h264',
                vQuality: '720',
                aFormat: 'mp3',
                filenamePattern: 'basic',
                isAudioOnly: true
            }),
            signal: AbortSignal.timeout(20000)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        const data = await res.json();
        console.log('[PLAY-AUDIO] Cobalt respuesta:', JSON.stringify(data).substring(0, 200));
        
        if (data?.status === 'stream' && data?.url) {
            console.log('[PLAY-AUDIO] ✅ Cobalt OK');
            return { urlMp3: data.url, titulo: '', duracion: '' };
        }
        console.log('[PLAY-AUDIO] ❌ Cobalt: respuesta inválida');
    } catch (e) {
        console.log('[PLAY-AUDIO] ❌ Cobalt falló:', e.message);
    }
    return null;
}

async function audioDesdeDelirius(videoUrl) {
    try {
        console.log('[PLAY-AUDIO] Intentando Delirius...');
        const data = await getJSON(`${API_MP3}?url=${encodeURIComponent(videoUrl)}`, 18000);
        console.log('[PLAY-AUDIO] Delirius respuesta:', JSON.stringify(data).substring(0, 200));
        
        if ((data.status === true || data.estado === true) && data.data?.download) {
            console.log('[PLAY-AUDIO] ✅ Delirius OK');
            return { urlMp3: data.data.download, titulo: data.data.title || '', autor: data.data.author || '' };
        }
        console.log('[PLAY-AUDIO] ❌ Delirius: respuesta inválida');
    } catch (e) {
        console.log('[PLAY-AUDIO] ❌ Delirius falló:', e.message);
    }
    return null;
}

async function audioDesdePiped(videoId) {
    for (const inst of PIPED_INSTANCES) {
        try {
            console.log(`[PLAY-AUDIO] Intentando Piped ${inst}...`);
            const data = await getJSON(`${inst}/streams/${videoId}`, 12000);
            console.log(`[PLAY-AUDIO] Piped ${inst} respuesta: streams=${data?.audioStreams?.length || 0}`);
            
            const streams = data?.audioStreams || [];
            if (!streams.length) continue;
            
            const ordenados = [...streams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
            const elegido = ordenados.find(s => s.mimeType?.includes('mp4a')) || ordenados[0];
            
            if (elegido?.url) {
                console.log(`[PLAY-AUDIO] ✅ Piped ${inst} OK`);
                return { urlMp3: elegido.url, titulo: '', duracion: '' };
            }
        } catch (e) {
            console.log(`[PLAY-AUDIO] ❌ Piped ${inst} falló: ${e.message}`);
        }
    }
    return null;
}

async function audioDesdeInvidious(videoId) {
    for (const inst of INVIDIOUS_INSTANCES) {
        try {
            console.log(`[PLAY-AUDIO] Intentando Invidious ${inst}...`);
            const res = await fetch(`${inst}/latest_version?id=${videoId}&itag=140`, {
                agent: AGENTE,
                headers: { 'User-Agent': getUA() },
                signal: AbortSignal.timeout(20000),
                redirect: 'follow'
            });
            
            if (!res.ok) continue;
            
            const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
            if (ct.includes('text/html')) continue;
            
            const buffer = Buffer.from(await res.arrayBuffer());
            const mime = detectarFormatoAudio(buffer);
            
            console.log(`[PLAY-AUDIO] Invidious ${inst}: bytes=${buffer.length} formato=${mime}`);
            
            if (mime) {
                console.log(`[PLAY-AUDIO] ✅ Invidious ${inst} OK`);
                return { buffer, mimetype: mime };
            }
        } catch (e) {
            console.log(`[PLAY-AUDIO] ❌ Invidious ${inst} falló: ${e.message}`);
        }
    }
    return null;
}

async function videoDesdeFaa(videoUrl) {
    try {
        console.log('[PLAY-VIDEO] Intentando Faa...');
        const data = await getJSON(`${FAA_API}/ytmp4?url=${encodeURIComponent(videoUrl)}`, 25000);
        console.log('[PLAY-VIDEO] Faa respuesta:', JSON.stringify(data).substring(0, 200));
        
        if (data?.status === true && data?.result?.download_url) {
            console.log('[PLAY-VIDEO] ✅ Faa OK');
            return data.result.download_url;
        }
        console.log('[PLAY-VIDEO] ❌ Faa: respuesta inválida');
    } catch (e) {
        console.log('[PLAY-VIDEO] ❌ Faa falló:', e.message);
    }
    return null;
}

async function videoDesdeCobalt(videoUrl) {
    try {
        console.log('[PLAY-VIDEO] Intentando Cobalt...');
        const res = await fetch(`${COBALT_API}/api/json`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': getUA()
            },
            body: JSON.stringify({
                url: videoUrl,
                vCodec: 'h264',
                vQuality: '720',
                aFormat: 'mp3',
                filenamePattern: 'basic',
                isAudioOnly: false
            }),
            signal: AbortSignal.timeout(25000)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);
        
        const data = await res.json();
        console.log('[PLAY-VIDEO] Cobalt respuesta:', JSON.stringify(data).substring(0, 200));
        
        if (data?.status === 'stream' && data?.url) {
            console.log('[PLAY-VIDEO] ✅ Cobalt OK');
            return data.url;
        }
        console.log('[PLAY-VIDEO] ❌ Cobalt: respuesta inválida');
    } catch (e) {
        console.log('[PLAY-VIDEO] ❌ Cobalt falló:', e.message);
    }
    return null;
}

async function videoDesdeDelirius(videoUrl) {
    try {
        console.log('[PLAY-VIDEO] Intentando Delirius...');
        const data = await getJSON(`${API_MP4}?url=${encodeURIComponent(videoUrl)}&format=360p`, 18000);
        console.log('[PLAY-VIDEO] Delirius respuesta:', JSON.stringify(data).substring(0, 200));
        
        if ((data.status === true || data.estado === true) && data.data?.download) {
            console.log('[PLAY-VIDEO] ✅ Delirius OK');
            return data.data.download;
        }
        console.log('[PLAY-VIDEO] ❌ Delirius: respuesta inválida');
    } catch (e) {
        console.log('[PLAY-VIDEO] ❌ Delirius falló:', e.message);
    }
    return null;
}

async function videoDesdePiped(videoId) {
    for (const inst of PIPED_INSTANCES) {
        try {
            console.log(`[PLAY-VIDEO] Intentando Piped ${inst}...`);
            const data = await getJSON(`${inst}/streams/${videoId}`, 12000);
            console.log(`[PLAY-VIDEO] Piped ${inst} respuesta: streams=${data?.videoStreams?.length || 0}`);
            
            const streams = (data?.videoStreams || []).filter(s => s.mimeType?.includes('mp4') && !s.videoOnly);
            if (!streams.length) continue;
            
            const elegido = streams.find(s => s.quality?.startsWith('360')) ||
                            streams.find(s => s.quality?.startsWith('480')) ||
                            streams.find(s => s.quality?.startsWith('720')) || streams[0];
            
            if (elegido?.url) {
                console.log(`[PLAY-VIDEO] ✅ Piped ${inst} OK (${elegido.quality})`);
                return elegido.url;
            }
        } catch (e) {
            console.log(`[PLAY-VIDEO] ❌ Piped ${inst} falló: ${e.message}`);
        }
    }
    return null;
}

export async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎵 Descargando audio...');

        let resultado = null;
        let meta = null;
        const proveedoresIntentados = [];

        if (!resultado) {
            const fuenteFaa = await audioDesdeFaa(video.url);
            if (fuenteFaa) {
                meta = fuenteFaa;
                resultado = await descargarMedia(fuenteFaa.urlMp3, 60000, 'audio').catch(() => null);
            }
            proveedoresIntentados.push('Faa: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            const fuenteCobalt = await audioDesdeCobalt(video.url);
            if (fuenteCobalt) {
                resultado = await descargarMedia(fuenteCobalt.urlMp3, 60000, 'audio').catch(() => null);
            }
            proveedoresIntentados.push('Cobalt: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            const fuenteDelirius = await audioDesdeDelirius(video.url);
            if (fuenteDelirius) {
                meta = meta || fuenteDelirius;
                resultado = await descargarMedia(fuenteDelirius.urlMp3, 60000, 'audio').catch(() => null);
            }
            proveedoresIntentados.push('Delirius: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            const fuentePiped = await audioDesdePiped(video.videoId);
            if (fuentePiped) {
                resultado = await descargarMedia(fuentePiped.urlMp3, 60000, 'audio').catch(() => null);
            }
            proveedoresIntentados.push('Piped: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            resultado = await audioDesdeInvidious(video.videoId);
            proveedoresIntentados.push('Invidious: ' + (resultado ? 'OK' : 'FAIL'));
        }

        console.log('[PLAY-AUDIO] Resumen:', proveedoresIntentados.join(' | '));

        if (!resultado) throw new Error('Ningún proveedor de audio respondió');

        const { buffer, mimetype } = resultado;
        const duracionFinal = meta?.duracion || video.duracion;
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
                    title: meta?.titulo || video.titulo,
                    body: meta?.autor || video.autor,
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

        let resultado = null;
        const proveedoresIntentados = [];

        if (!resultado) {
            const urlFaa = await videoDesdeFaa(video.url);
            if (urlFaa) resultado = await descargarMedia(urlFaa, 120000, 'video').catch(() => null);
            proveedoresIntentados.push('Faa: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            const urlCobalt = await videoDesdeCobalt(video.url);
            if (urlCobalt) resultado = await descargarMedia(urlCobalt, 120000, 'video').catch(() => null);
            proveedoresIntentados.push('Cobalt: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            const urlDelirius = await videoDesdeDelirius(video.url);
            if (urlDelirius) resultado = await descargarMedia(urlDelirius, 120000, 'video').catch(() => null);
            proveedoresIntentados.push('Delirius: ' + (resultado ? 'OK' : 'FAIL'));
        }

        if (!resultado) {
            const urlPiped = await videoDesdePiped(video.videoId);
            if (urlPiped) resultado = await descargarMedia(urlPiped, 120000, 'video').catch(() => null);
            proveedoresIntentados.push('Piped: ' + (resultado ? 'OK' : 'FAIL'));
        }

        console.log('[PLAY-VIDEO] Resumen:', proveedoresIntentados.join(' | '));

        if (!resultado) throw new Error('Ningún proveedor de video respondió');

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