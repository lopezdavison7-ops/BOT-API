import fetch from 'node-fetch';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const API_KEY = 'rohan6476a72291d2043a';
const API_BASE = 'https://kyzorohan.web.id/api';

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

const ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

const esURL = q => /^https?:\/\//i.test(q) || /youtu\.?be\//i.test(q);
const fmtVistas = n => { n = parseInt(String(n).replace(/\D/g,''))||0; return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n); };
const fmtDur = s => { s = Math.floor(+s||0); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const aSeg = s => { const p = String(s||'').split(':').map(Number); return p.length===2 ? p[0]*60+p[1] : (p[0]||0); };

function tipoBuffer(buf, esAudio) {
    if (!buf || buf.length < 1000) {
        console.log(`[VALIDAR] ❌ Buffer muy pequeño: ${buf ? buf.length : 0} bytes`);
        return null;
    }
    if (esAudio) {
        if (buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33) return 'audio/mpeg';
        if (buf[0]===0xFF && (buf[1]&0xE0)===0xE0) return 'audio/mpeg';
        if (buf.slice(4,8).toString()==='ftyp') return 'audio/mp4';
        if (buf.slice(0,3).toString()==='Ogg') return 'audio/ogg';
        
        // Depuración: si es HTML, lo mostramos
        const inicio = buf.slice(0, 50).toString('utf8');
        if (inicio.includes('<!') || inicio.includes('<html')) {
            console.log(`[VALIDAR] ❌ El servidor devolvió HTML en lugar de audio: ${inicio.substring(0, 100)}`);
        } else {
            console.log(`[VALIDAR] ❌ Formato de audio desconocido. Hex: ${buf.slice(0, 16).toString('hex')}`);
        }
        return null;
    }
    return buf.slice(4,8).toString()==='ftyp' ? 'video/mp4' : null;
}

async function buscar(query) {
    if (esURL(query)) {
        const id = query.match(ID_REGEX)?.[1];
        if (!id) throw new Error('URL inválida');
        const res = await fetch(`${API_BASE}/yts?query=${encodeURIComponent(query)}&key=${API_KEY}`);
        const data = await res.json();
        if (data?.status && data?.videos?.length > 0) {
            const v = data.videos[0];
            return { id, url: v.url || `https://youtu.be/${id}`, titulo: v.title, thumb: v.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, seg: v.duration || 0, vistas: v.views || 0, autor: v.author || 'Desconocido' };
        }
        return { id, url: `https://youtu.be/${id}`, titulo: 'Video de YouTube', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, seg: 0, vistas: 0, autor: 'Desconocido' };
    }
    
    const k = query.toLowerCase().trim();
    const cache = global.playCache.get('s_'+k);
    if (cache && Date.now()-cache.t < 300000) return cache.v;
    
    const res = await fetch(`${API_BASE}/yts?query=${encodeURIComponent(k)}&key=${API_KEY}`);
    const data = await res.json();
    
    if (!data?.status || !data?.videos?.length) throw new Error('Sin resultados');
    
    const v = data.videos[0];
    const video = { 
        id: v.url.match(ID_REGEX)?.[1] || '', 
        url: v.url, 
        titulo: v.title, 
        thumb: v.thumbnail || '', 
        seg: v.duration || 0, 
        vistas: v.views || 0, 
        autor: v.author || 'Desconocido' 
    };
    
    global.playCache.set('s_'+k, { v: video, t: Date.now() });
    return video;
}

async function enlace(url, tipo) {
    const id = url.match(ID_REGEX)?.[1] || url;
    const ck = `${tipo}_${id}`;
    const cache = global.playCache.get(ck);
    if (cache && Date.now()-cache.t < 600000) {
        console.log(`[ENLACE] ⚡ Caché: ${ck}`);
        return cache.v;
    }

    try {
        if (tipo === 'audio') {
            const res = await fetch(`${API_BASE}/ytdlv3?key=${API_KEY}&url=${encodeURIComponent(url)}&type=Audio`, { signal: AbortSignal.timeout(30000) });
            const data = await res.json();
            console.log('[KYPO-AUDIO] Respuesta completa:', JSON.stringify(data));
            
            const dl = data?.result?.download_url || data?.download_url;
            if (dl) {
                const v = { dl, titulo: data?.result?.title || data?.title || '', autor: '', thumb: data?.result?.thumbnail_url || '', dur: '' };
                global.playCache.set(ck, { v, t: Date.now() });
                return v;
            }
            throw new Error('Sin enlace de audio en la respuesta');
        } else {
            const res = await fetch(`${API_BASE}/ytdlv2?key=${API_KEY}&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(30000) });
            const data = await res.json();
            console.log('[KYPO-VIDEO] Respuesta:', JSON.stringify(data).substring(0, 300));
            
            if (data?.status && data?.video?.length) {
                const vFormat = data.video.find(v => v.is_audio === true || v.formatId === 18) || data.video[0];
                if (vFormat?.url) {
                    const v = { dl: vFormat.url, titulo: data.title || '', autor: '', thumb: data.thumbnail || '', dur: '' };
                    global.playCache.set(ck, { v, t: Date.now() });
                    return v;
                }
            }
            throw new Error('Sin enlace de video en la respuesta');
        }
    } catch (e) {
        console.log(`[KYPO] Error ${tipo}:`, e.message);
        throw new Error(`Fallo al obtener enlace: ${e.message}`);
    }
}

async function bajar(url, ms) {
    console.log(`[DESCARGA] Iniciando: ${url.substring(0, 80)}...`);
    const res = await fetch(url, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://kyzorohan.web.id/',
            'Accept': '*/*'
        },
        signal: AbortSignal.timeout(ms) 
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`[DESCARGA] ✅ Completada. Tamaño: ${buf.length} bytes. Inicio Hex: ${buf.slice(0, 16).toString('hex')}`);
    if (!buf.length) throw new Error('Buffer vacío');
    return buf;
}

async function enviar(sock, msg, video, tipo, responder) {
    const jid = msg.key.remoteJid;
    await responder.texto(tipo === 'audio' ? '🎵 Descargando audio...' : '🎬 Descargando video...');
    try {
        const info = await enlace(video.url, tipo);
        const buf = await bajar(info.dl, tipo === 'audio' ? 60000 : 120000);
        const mime = tipoBuffer(buf, tipo === 'audio');
        if (!mime) throw new Error('El archivo descargado no es válido (posible bloqueo del servidor)');
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        if (tipo === 'audio') {
            await sock.sendMessage(jid, {
                audio: buf, mimetype: mime,
                fileName: `${titulo.slice(0,60).replace(/[^\w\s.-]/g,'')}.${mime==='audio/mp4'?'m4a':'mp3'}`,
                ptt: false, seconds: video.seg || aSeg(info.dur),
                contextInfo: { externalAdReply: { title: titulo, body: autor, thumbnailUrl: info.thumb||video.thumb, mediaType: 2, mediaUrl: video.url, sourceUrl: video.url } }
            }, { quoted: msg });
        } else {
            const cap = `╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ 📦 ${(buf.length/1048576).toFixed(2)} MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
            if (buf.length > 16*1048576) await sock.sendMessage(jid, { document: buf, mimetype: 'video/mp4', fileName: `${titulo.slice(0,60).replace(/[^\w\s.-]/g,'')}.mp4`, caption: cap }, { quoted: msg });
            else await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
        }
    } catch (e) {
        console.error(`[PLAY-${tipo}]`, e.message);
        await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`);
    }
}

export const procesarAudio = (sock, msg, video, responder) => enviar(sock, msg, video, 'audio', responder);
export const procesarVideo = (sock, msg, video, responder) => enviar(sock, msg, video, 'video', responder);

async function botones(sock, msg, video, jid) {
    const cap = `╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃ 🎧 *${video.titulo}*\n┃ 👤 ${video.autor}\n┃ ⏱️ ${fmtDur(video.seg)} | 👀 ${fmtVistas(video.vistas)}\n┃\n┃ 🎯 Elige con botones o responde *1* o *2*\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
    const now = Date.now();
    for (const k of Object.keys(global.playSessions)) if (now - global.playSessions[k].timestamp > 600000) delete global.playSessions[k];
    for (const k of new Set([msg.key.participant, msg.key.senderPn, msg.key.participantAlt, msg.key.remoteJidAlt, jid].filter(Boolean))) {
        global.playSessions[k] = { video, timestamp: now };
    }
    let img = null;
    try { if (video.thumb) img = await prepareWAMessageMedia({ image: { url: video.thumb } }, { upload: sock.waUploadToServer }); } catch {}
    const wa = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: {
        body: { text: cap },
        footer: { text: '⚡ BOT-API ⚡' },
        header: img?.imageMessage ? { imageMessage: img.imageMessage, hasMediaAttachment: true } : { title: '🎵 YouTube', hasMediaAttachment: false },
        nativeFlowMessage: { buttons: [
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'play_audio' }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'play_video' }) }
        ], messageParamsJson: '' }
    } } } }, { userJid: sock.user?.id || jid, quoted: msg });
    await sock.relayMessage(jid, wa.message, { messageId: wa.key.id });
}

export default {
    nombre: 'play',
    categoria: 'Descargas',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: '.play → botones | .play2 → video directo',
    ejecutar: async ({ sock, msg, argumento, responder, jid, nombreComando }) => {
        const q = String(argumento || '').trim();
        if (!q) return responder.texto('╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃ ❌ Escribe nombre o URL\n┃ 💡 .play hola | .play2 hola | .play <link>\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        try {
            const video = await buscar(q);
            if (['play2','playvideo','video'].includes(nombreComando)) await enviar(sock, msg, video, 'video', responder);
            else await botones(sock, msg, video, jid);
        } catch (e) {
            console.error('[PLAY]', e.message);
            await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`);
        }
    }
};