import fetch from 'node-fetch';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const BASE = 'https://api.delirius.online';
if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

const ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const esURL = q => /^https?:\/\//i.test(q) || /youtu\.?be\//i.test(q);
const fmtVistas = n => { n = parseInt(String(n).replace(/\D/g,''))||0; return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n); };
const fmtDur = s => { s = Math.floor(+s||0); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const aSeg = s => { if (typeof s === 'number') return s; const p = String(s||'').split(':').map(Number); return p.length===2 ? p[0]*60+p[1] : (p[0]||0); };

function validar(buf, tipo) {
    console.log(`[VALIDAR-${tipo}] Tamaño: ${buf.length} bytes | Hex: ${buf.slice(0,16).toString('hex')} | Texto: ${buf.slice(0,40).toString('utf8').replace(/\n/g,' ')}`);
    
    if (!buf || buf.length < 5000) {
        console.log(`[VALIDAR-${tipo}] ❌ Rechazado: muy pequeño (${buf?.length || 0} bytes)`);
        return null;
    }
    
    const head = buf.slice(0, 64).toString('utf8');
    if (head.includes('<!') || head.includes('<html') || head.includes('<HTML')) {
        console.log(`[VALIDAR-${tipo}] ❌ Rechazado: es HTML`);
        return null;
    }
    
    if (tipo === 'audio') {
        if (buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33) return 'audio/mpeg';
        if (buf[0]===0xFF && (buf[1]&0xE0)===0xE0) return 'audio/mpeg';
        if (buf.slice(4,8).toString()==='ftyp') return 'audio/mp4';
        if (buf.slice(0,4).toString()==='OggS') return 'audio/ogg';
        if (buf.slice(0,4).toString()==='RIFF') return 'audio/wav';
        if (buf[0]===0x1A && buf[1]===0x45) return 'audio/webm';
        if (buf.length > 20000) {
            console.log(`[VALIDAR-${tipo}] ⚠️ Sin firma conocida pero tamaño OK, asumiendo mpeg`);
            return 'audio/mpeg';
        }
        console.log(`[VALIDAR-${tipo}] ❌ Rechazado: sin firma y muy pequeño`);
        return null;
    }
    
    if (buf.slice(4,8).toString()==='ftyp') return 'video/mp4';
    console.log(`[VALIDAR-${tipo}] ❌ Rechazado: no es MP4`);
    return null;
}

async function buscar(query) {
    if (esURL(query)) {
        const id = query.match(ID_REGEX)?.[1];
        if (!id) throw new Error('URL inválida');
        const res = await fetch(`${BASE}/search/ytsearch?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(20000) });
        const data = await res.json();
        const v = (data?.data || []).find(x => x.videoId === id) || data?.data?.[0];
        if (v) return { id: v.videoId, url: v.url, titulo: v.title, thumb: v.thumbnail || v.image || '', seg: aSeg(v.duration), vistas: v.views||0, autor: v.author?.name || 'Desconocido' };
        return { id, url: `https://youtu.be/${id}`, titulo: 'Video de YouTube', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, seg: 0, vistas: 0, autor: 'Desconocido' };
    }
    const k = query.toLowerCase().trim();
    const cache = global.playCache.get('s_'+k);
    if (cache && Date.now()-cache.t < 300000) return cache.v;
    const res = await fetch(`${BASE}/search/ytsearch?q=${encodeURIComponent(k)}`, { signal: AbortSignal.timeout(20000) });
    const data = await res.json();
    const v = (data?.data || []).find(x => x.type === 'video' && !x.isLive) || data?.data?.[0];
    if (!v) throw new Error('Sin resultados');
    const video = { id: v.videoId, url: v.url, titulo: v.title, thumb: v.thumbnail || v.image || '', seg: aSeg(v.duration), vistas: v.views||0, autor: v.author?.name || 'Desconocido' };
    global.playCache.set('s_'+k, { v: video, t: Date.now() });
    return video;
}

async function obtenerEnlace(url, tipo) {
    const ck = `${tipo}_${url.match(ID_REGEX)?.[1] || url}`;
    const cache = global.playCache.get(ck);
    if (cache && Date.now()-cache.t < 600000) return cache.v;
    const ep = tipo === 'audio' ? '/download/ytmp3' : '/download/ytmp4';
    const res = await fetch(`${BASE}${ep}?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(30000) });
    const data = await res.json();
    console.log(`[ENLACE-${tipo}] URL: ${data?.data?.download?.substring(0, 80) || 'SIN URL'}`);
    if (data?.status !== true || !data?.data?.download) throw new Error(data?.message || 'Sin enlace de descarga');
    const v = { dl: data.data.download, titulo: data.data.title||'', autor: data.data.author||'', thumb: data.data.image||'' };
    global.playCache.set(ck, { v, t: Date.now() });
    return v;
}

async function bajar(url, ms) {
    console.log(`[BAJAR] Iniciando: ${url.substring(0, 100)}...`);
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': '*/*' },
        signal: AbortSignal.timeout(ms)
    });
    console.log(`[BAJAR] Status: ${res.status} | Content-Type: ${res.headers.get('content-type')} | Content-Length: ${res.headers.get('content-length')}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`[BAJAR] ✅ Recibido: ${buf.length} bytes`);
    if (!buf.length) throw new Error('Buffer vacío');
    return buf;
}

async function enviar(sock, msg, video, tipo, responder) {
    const jid = msg.key.remoteJid;
    await responder.texto(tipo === 'audio' ? '🎵 Descargando audio...' : '🎬 Descargando video...');
    try {
        const info = await obtenerEnlace(video.url, tipo);
        const buf = await bajar(info.dl, tipo === 'audio' ? 60000 : 120000);
        const mime = validar(buf, tipo);
        if (!mime) throw new Error('Archivo inválido (posible bloqueo del servidor)');
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;
        const tamañoMB = (buf.length/1048576).toFixed(2);
        const nombreArchivo = `${titulo.slice(0,60).replace(/[^\w\s.-]/g,'')}`;

        if (tipo === 'audio') {
            if (buf.length > 16*1048576) {
                const cap = `╭━━〔 🎵 𝐀𝐔𝐃𝐈𝐎 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ 📦 ${tamañoMB} MB (Documento)\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
                await sock.sendMessage(jid, {
                    document: buf, mimetype: mime,
                    fileName: `${nombreArchivo}.${mime==='audio/mp4'?'m4a':'mp3'}`,
                    caption: cap
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    audio: buf, mimetype: mime,
                    fileName: `${nombreArchivo}.${mime==='audio/mp4'?'m4a':'mp3'}`,
                    ptt: false, seconds: video.seg,
                    contextInfo: { externalAdReply: { title: titulo, body: autor, thumbnailUrl: info.thumb||video.thumb, mediaType: 2, mediaUrl: video.url, sourceUrl: video.url } }
                }, { quoted: msg });
            }
        } else {
            const cap = `╭━━〔 🎬 𝐕𝐈𝐄𝐎 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ 📦 ${tamañoMB} MB\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
            if (buf.length > 16*1048576) {
                await sock.sendMessage(jid, { document: buf, mimetype: 'video/mp4', fileName: `${nombreArchivo}.mp4`, caption: cap }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
            }
        }
    } catch (e) {
        console.error(`[PLAY-${tipo}]`, e.message);
        await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`);
    }
}

export const procesarAudio = (sock, msg, video, responder) => enviar(sock, msg, video, 'audio', responder);
export const procesarVideo = (sock, msg, video, responder) => enviar(sock, msg, video, 'video', responder);

async function botones(sock, msg, video, jid) {
    const cap = `╭━━〔 🎵 𝐏𝐋𝐘 〕━━\n┃  *${video.titulo}*\n┃ 👤 ${video.autor}\n┃ ⏱️ ${fmtDur(video.seg)} | 👀 ${fmtVistas(video.vistas)}\n┃\n┃ 🎯 Elige con botones o responde *1* o *2*\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
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