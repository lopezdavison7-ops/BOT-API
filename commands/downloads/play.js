import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });
const API = 'https://kronix-apis.nexcodea.com';
const KEY = '0410239197314016f779ac4fcbc3797ac0e2978658a25e7a7628dc664186f914';
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

const MODS = ['remix', 'official audio', 'song', 'lyrics'];
const GEN = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que']);

function fv(n) {
    const num = parseInt(String(n).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

function esURL(s) { return /youtube\.com|youtu\.be/i.test(s); }

function vidID(url) {
    const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
}

async function req(url, t = 15000) {
    const r = await fetch(url, { agent: AGENTE, headers: HEADERS, signal: AbortSignal.timeout(t) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

async function buscar(q) {
    const d = await req(`${API}/api/busqueda/youtube?query=${encodeURIComponent(q)}&apikey=${KEY}`);
    if (!d.status || !d.resultado?.length) throw new Error('Sin resultados');
    const v = d.resultado.find(x => x.type === 'video') || d.resultado[0];
    return {
        videoId: v.videoId,
        url: v.url || `https://youtube.com/watch?v=${v.videoId}`,
        titulo: v.title || 'Sin título',
        thumbnail: v.thumbnail || v.image || '',
        duracion: v.duration?.timestamp || v.timestamp || '0:00',
        vistas: v.views || 0,
        autor: v.author?.name || 'Desconocido'
    };
}

async function getVideo(query) {
    const k = query.toLowerCase().trim();
    if (esURL(query)) {
        const id = vidID(query);
        if (!id) throw new Error('URL inválida');
        return { videoId: id, url: `https://youtube.com/watch?v=${id}`, titulo: 'Cargando...', thumbnail: '', duracion: '0:00', vistas: 0, autor: 'Desconocido' };
    }
    const c = global.playCache.get(k);
    if (c && Date.now() - c.t < 300000) return c.video;

    let video = null;
    if (k.length > 5 && !GEN.has(k)) {
        video = await buscar(k);
    } else {
        for (const v of [k, ...MODS.map(m => `${k} ${m}`)]) {
            try { video = await buscar(v); break; } catch { continue; }
        }
    }
    if (!video) throw new Error('Sin resultados');
    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(k, { video, t: Date.now() });
    return video;
}

async function getAudio(titulo) {
    const d = await req(`${API}/api/download/ytmp3?query=${encodeURIComponent(titulo)}&apikey=${KEY}`, 25000);
    if (!d.status || !d.resultado?.url) throw new Error('API audio sin URL');
    return { titulo: d.resultado.titulo, autor: d.resultado.autor || 'Desconocido', formato: d.resultado.calidad || 'MP3', url: d.resultado.url };
}

async function getVideo2(url) {
    const d = await req(`${API}/api/download/ytmp4?url=${encodeURIComponent(url)}&apikey=${KEY}`, 30000);
    if (!d.status || !d.resultado?.url) throw new Error('API video sin URL');
    return { titulo: d.resultado.titulo, autor: d.resultado.autor || 'Desconocido', formato: d.resultado.calidad || '720p', url: d.resultado.url };
}

async function dl(url, t = 90000) {
    const r = await fetch(url, { agent: AGENTE, headers: { 'User-Agent': HEADERS['User-Agent'], 'Accept': '*/*' }, signal: AbortSignal.timeout(t) });
    if (!r.ok) throw new Error('DL HTTP ' + r.status);
    const b = Buffer.from(await r.arrayBuffer());
    if (!b.length) throw new Error('Buffer vacío');
    return b;
}

async function procesarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');
        const info = await getAudio(video.titulo);
        const buf = await dl(info.url);
        await sock.sendMessage(msg.key.remoteJid, { audio: buf, mimetype: 'audio/mpeg' }, { quoted: msg });
    } catch (e) {
        await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ' + (e.message || 'Error') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

async function procesarVideo(sock, msg, video, responder) {
    try {
        await responder.texto('🎬 Descargando video...');
        const info = await getVideo2(video.url);
        const buf = await dl(info.url, 120000);
        const mb = (buf.length / 1024 / 1024).toFixed(2);
        const cap = '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n┃ 🎧 *' + (info.titulo || video.titulo) + '*\n┃ 👤 ' + info.autor + '\n┃ 📊 ' + info.formato + ' | 📦 ' + mb + ' MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
        const titulo = info.titulo || video.titulo;
        if (buf.length > 16 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, { document: buf, mimetype: 'video/mp4', fileName: `${titulo.replace(/[^\w\s.-]/g, '').slice(0, 80)}.mp4`, caption: cap }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, { video: buf, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
        }
    } catch (e) {
        await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ' + (e.message || 'Error') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

export default {
    nombre: 'play',
    categoria: 'downloader',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: 'Busca en YouTube (Kronix) - ultra rápido',
    uso: '.play <nombre o URL>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const q = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!q) return await responder.texto('╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃\n┃ ❌ Escribe el nombre o URL\n┃\n┃ 💡 Ejemplos:\n┃ ➪ .play hola remix\n┃ ➪ .play twice fancy\n┃\n┃ 🎯 Elige con botones\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');

        try {
            const video = await getVideo(q);
            global.playSessions[sender] = { jid, video, timestamp: Date.now() };

            const cap = '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃\n┃ 🎧 *' + video.titulo + '*\n┃\n┃ 👤 ' + video.autor + '\n┃ ⏱️ ' + video.duracion + '\n┃ 👀 ' + fv(video.vistas) + '\n┃\n┣━━〔 🎯 𝐄𝐋𝐈𝐆𝐄 〕━━⬣\n┃\n┃ 📲 Presiona el botón\n┃    o responde *1* o *2*\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const botones = [
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'playaudio' }) },
                { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'playvideo' }) }
            ];

            const prev = video.thumbnail
                ? { image: { url: video.thumbnail }, caption: cap, footer: '🎵 BOT-API', interactiveButtons: botones }
                : { text: cap, footer: '🎵 BOT-API', interactiveButtons: botones };

            try {
                await sock.sendMessage(jid, prev, { quoted: msg });
            } catch {
                await responder.texto(cap + '\n\nResponde *1* audio o *2* video');
            }
        } catch (e) {
            await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ' + (e.message || 'Error') + '\n┃\n┃ 💡 Intenta con otro nombre\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        }
    }
};

export { procesarAudio, procesarVideo };