import fetch from 'node-fetch';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const BASE = 'https://api.delirius.online';
const FAA = 'https://api-faa.my.id/faa';
const ALYA = 'https://api.alyacore.xyz';
const AKEY = 'AURA-BOT-JERIELB';

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

const ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const esURL = q => /^https?:\/\//i.test(q) || /youtu\.?be\//i.test(q);
const wwwUrl = id => `https://www.youtube.com/watch?v=${id}`;
const fmtVistas = n => { n = parseInt(String(n).replace(/\D/g,''))||0; return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n); };
const fmtDur = s => { s = Math.floor(+s||0); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const aSeg = s => { if (typeof s === 'number') return s; const p = String(s||'').split(':').map(Number); return p.length===2 ? p[0]*60+p[1] : (p[0]||0); };

async function json(url, ms = 25000) {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, signal: AbortSignal.timeout(ms) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

async function descargarThumb(url) {
    try {
        if (!url) return null;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        return buf.length > 500 ? buf : null;
    } catch { return null; }
}

function validar(buf, tipo) {
    if (!buf || buf.length < 5000) return null;
    const head = buf.slice(0, 64).toString('utf8');
    if (head.includes('<!') || head.includes('<html') || head.includes('<HTML')) return null;
    if (tipo === 'audio') {
        if (buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33) return 'audio/mpeg';
        if (buf[0]===0xFF && (buf[1]&0xE0)===0xE0) return 'audio/mpeg';
        if (buf.slice(4,8).toString()==='ftyp') return 'audio/mp4';
        if (buf.slice(0,4).toString()==='OggS') return 'audio/ogg';
        if (buf.slice(0,4).toString()==='RIFF') return 'audio/wav';
        if (buf[0]===0x1A && buf[1]===0x45) return 'audio/webm';
        if (buf.length > 20000) return 'audio/mpeg';
        return null;
    }
    return buf.slice(4,8).toString()==='ftyp' ? 'video/mp4' : null;
}

async function buscar(query) {
    if (esURL(query)) {
        const id = query.match(ID_REGEX)?.[1];
        if (!id) throw new Error('URL inválida');
        const data = await json(`${BASE}/search/ytsearch?q=${encodeURIComponent(query)}`, 20000);
        const v = (data?.data || []).find(x => x.videoId === id) || data?.data?.[0];
        if (v) return { id: v.videoId, url: v.url, titulo: v.title, thumb: v.thumbnail || v.image || '', seg: aSeg(v.duration), vistas: v.views||0, autor: v.author?.name || 'Desconocido' };
        return { id, url: wwwUrl(id), titulo: 'Video de YouTube', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, seg: 0, vistas: 0, autor: 'Desconocido' };
    }
    const k = query.toLowerCase().trim();
    const cache = global.playCache.get('s_'+k);
    if (cache && Date.now()-cache.t < 300000) return cache.v;
    const data = await json(`${BASE}/search/ytsearch?q=${encodeURIComponent(k)}`, 20000);
    const v = (data?.data || []).find(x => x.type === 'video' && !x.isLive) || data?.data?.[0];
    if (!v) throw new Error('Sin resultados');
    const video = { id: v.videoId, url: v.url, titulo: v.title, thumb: v.thumbnail || v.image || '', seg: aSeg(v.duration), vistas: v.views||0, autor: v.author?.name || 'Desconocido' };
    global.playCache.set('s_'+k, { v: video, t: Date.now() });
    return video;
}

async function bajar(url, ms) {
    console.log(`[BAJAR] Iniciando: ${url.substring(0, 80)}...`);
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', 'Accept': '*/*' },
        signal: AbortSignal.timeout(ms)
    });
    console.log(`[BAJAR] Status: ${res.status} | Content-Type: ${res.headers.get('content-type')}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`[BAJAR] ✅ Recibido: ${buf.length} bytes`);
    if (!buf.length) throw new Error('Buffer vacío');
    return buf;
}

async function enviarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    await responder.texto('🎵 Descargando audio...');
    
    const fuentes = [
        { nombre: 'Delirius', obtener: async () => { const d = await json(`${BASE}/download/ytmp3?url=${encodeURIComponent(video.url)}`); if (!d?.data?.download) throw new Error('sin url'); return { url: d.data.download, titulo: d.data.title, autor: d.data.author, thumb: d.data.image }; } },
        { nombre: 'Faa', obtener: async () => { const f = await json(`${FAA}/youtube?url=${encodeURIComponent(wwwUrl(video.id))}`); const r = f?.result || {}; if (!r.mp3) throw new Error('sin mp3'); return { url: r.mp3, titulo: r.title, autor: r.author || '', thumb: r.thumbnail || '' }; } },
        { nombre: 'Alya', obtener: async () => { const a = await json(`${ALYA}/dl/ytmp3?url=${encodeURIComponent(video.url)}&key=${AKEY}`); const d = a?.data || {}; const dl = typeof d.dl === 'string' ? d.dl : (d.dl?.url || d.url); if (!dl) throw new Error('sin dl'); return { url: dl, titulo: d.title, autor: d.author || '', thumb: d.thumbnail || '' }; } }
    ];
    
    for (const fuente of fuentes) {
        try {
            console.log(`[AUDIO] Probando ${fuente.nombre}...`);
            const info = await fuente.obtener();
            const buf = await bajar(info.url, 60000);
            const mime = validar(buf, 'audio');
            if (!mime) { console.log(`[AUDIO] ❌ ${fuente.nombre} devolvió HTML/basura`); continue; }
            console.log(`[AUDIO] ✅ ${fuente.nombre} OK (${buf.length} bytes, ${mime})`);
            const titulo = info.titulo || video.titulo;
            const autor = info.autor || video.autor;
            const nombre = `${titulo.slice(0,60).replace(/[^\w\s]/g,'')}`;
            const ext = mime === 'audio/mp4' ? 'm4a' : 'mp3';
            
            if (buf.length > 16*1048576) {
                const cap = `╭━━〔  𝐀𝐔𝐃𝐈𝐎 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ 📦 ${(buf.length/1048576).toFixed(2)} MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
                await sock.sendMessage(jid, { document: buf, mimetype: mime, fileName: `${nombre}.${ext}`, caption: cap }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, { audio: buf, mimetype: mime, fileName: `${nombre}.${ext}`, ptt: false, seconds: video.seg }, { quoted: msg });
                const capInfo = `╭━━〔 🎵 𝐘𝐓𝐌𝐔𝐒𝐈𝐂 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ ⏱️ ${fmtDur(video.seg)}\n┃ 🔗 ${video.url}\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
                const thumbBuf = await descargarThumb(info.thumb || video.thumb);
                if (thumbBuf) await sock.sendMessage(jid, { image: thumbBuf, caption: capInfo }, { quoted: msg });
                else await sock.sendMessage(jid, { text: capInfo }, { quoted: msg });
            }
            return;
        } catch (e) { console.log(`[AUDIO] ❌ ${fuente.nombre} falló: ${e.message}`); }
    }
    throw new Error('Ningún CDN de audio respondió');
}

async function enviarVideo(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    await responder.texto('🎬 Descargando video...');
    
    const fuentes = [
        { nombre: 'Delirius', obtener: async () => { const d = await json(`${BASE}/download/ytmp4?url=${encodeURIComponent(video.url)}`); if (!d?.data?.download) throw new Error('sin url'); return { url: d.data.download, titulo: d.data.title, autor: d.data.author, thumb: d.data.image }; } },
        { nombre: 'Faa', obtener: async () => { const f = await json(`${FAA}/ytmp4?url=${encodeURIComponent(wwwUrl(video.id))}`); const r = f?.result || {}; const dl = r.download_url || r.mp4 || r.url; if (!dl) throw new Error('sin mp4'); return { url: dl, titulo: r.title, autor: r.author || '', thumb: r.thumbnail || '' }; } }
    ];
    
    for (const fuente of fuentes) {
        try {
            console.log(`[VIDEO] Probando ${fuente.nombre}...`);
            const info = await fuente.obtener();
            const buf = await bajar(info.url, 120000);
            const mime = validar(buf, 'video');
            if (!mime) { console.log(`[VIDEO] ❌ ${fuente.nombre} devolvió HTML/basura`); continue; }
            console.log(`[VIDEO] ✅ ${fuente.nombre} OK (${buf.length} bytes)`);
            const titulo = info.titulo || video.titulo;
            const autor = info.autor || video.autor;
            const cap = `╭━━〔 🎬 𝐈𝐄𝐎 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ 📦 ${(buf.length/1048576).toFixed(2)} MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
            if (buf.length > 16*1048576) await sock.sendMessage(jid, { document: buf, mimetype: 'video/mp4', fileName: `${titulo.slice(0,60).replace(/[^\w\s]/g,'')}.mp4`, caption: cap }, { quoted: msg });
            else await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
            return;
        } catch (e) { console.log(`[VIDEO] ❌ ${fuente.nombre} falló: ${e.message}`); }
    }
    throw new Error('Ningún CDN de video respondió');
}

export const procesarAudio = async (sock, msg, video, responder) => {
    try { await enviarAudio(sock, msg, video, responder); }
    catch (e) { console.error('[PLAY-audio]', e.message); await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`); }
};

export const procesarVideo = async (sock, msg, video, responder) => {
    try { await enviarVideo(sock, msg, video, responder); }
    catch (e) { console.error('[PLAY-video]', e.message); await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐎𝐑 〕━━⬣\n ⚠️ ${e.message}\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`); }
};

async function botones(sock, msg, video, jid) {
    const cap = `╭━━〔  𝐏𝐋𝐀𝐘 〕━━⬣\n┃ 🎧 *${video.titulo}*\n┃ 👤 ${video.autor}\n┃ ⏱️ ${fmtDur(video.seg)} | 👀 ${fmtVistas(video.vistas)}\n┃\n┃ 🎯 Elige con botones o responde *1* o *2*\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
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
            if (['play2','playvideo','video'].includes(nombreComando)) await procesarVideo(sock, msg, video, responder);
            else await botones(sock, msg, video, jid);
        } catch (e) {
            console.error('[PLAY]', e.message);
            await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`);
        }
    }
};