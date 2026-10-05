import fetch from 'node-fetch';
import https from 'node:https';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);
const AGENTE = new https.Agent({ keepAlive: true, maxSockets: 15 });

const APIS_BUSQUEDA = [
    { nombre: 'SiputzX', url: (q) => `https://api.siputzx.my.id/api/s/youtube?query=${encodeURIComponent(q)}` },
    { nombre: 'Caliph', url: (q) => `https://api.caliph.biz.id/api/yt/search?q=${encodeURIComponent(q)}&apikey=caliphkey` },
    { nombre: 'Lann', url: (q) => `https://api.lann.me/api/search/youtube?q=${encodeURIComponent(q)}&apikey=free` }
];

const CACHE_TTL = 5 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

async function fetchJSON(url, timeoutMs, nombre) {
    console.log(`[PLAY-${nombre}] ${url}`);
    const res = await fetch(url, {
        agent: AGENTE,
        headers: {
            'Accept': 'application/json',
            'User-Agent': getUA()
        },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[PLAY-${nombre}] HTTP ${res.status}: ${text.substring(0, 100)}`);
        throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
}

function normVideo(v, source) {
    let duracionStr = '0:00';
    
    if (v.duration) {
        if (typeof v.duration === 'string') {
            duracionStr = v.duration;
        } else if (typeof v.duration === 'object') {
            duracionStr = v.duration.timestamp || v.duration.duration || v.duration.text || '0:00';
        }
    } else if (v.durasi) {
        duracionStr = String(v.durasi);
    } else if (v.timestamp) {
        duracionStr = String(v.timestamp);
    }
    
    return {
        videoId: v.videoId || v.id || v.video_id,
        url: v.url || `https://www.youtube.com/watch?v=${v.videoId || v.id || v.video_id}`,
        titulo: v.title || v.judul || 'Sin título',
        thumbnail: v.thumbnail || v.image || v.thumb || '',
        duracion: duracionStr,
        vistas: v.views || v.viewers || 0,
        autor: v.author?.name || v.author || v.channel || 'Desconocido',
        source
    };
}

async function probarAPIsBusqueda(query) {
    for (const api of APIS_BUSQUEDA) {
        try {
            const url = api.url(query);
            const data = await fetchJSON(url, 10000, api.nombre);
            
            if (data.status === false || data.error) {
                console.log(`[PLAY-${api.nombre}] Status false o error`);
                continue;
            }
            
            const lista = data.data || data.result || data.results || data.videos || [];
            if (!Array.isArray(lista) || lista.length === 0) {
                console.log(`[PLAY-${api.nombre}] Sin resultados`);
                continue;
            }
            
            const v = lista.find(x => x.type === 'video' || x.videoId) || lista[0];
            if (!v) {
                console.log(`[PLAY-${api.nombre}] No se pudo extraer video`);
                continue;
            }
            
            console.log(`[PLAY-${api.nombre}] ✅ Encontrado: ${v.title || v.judul || 'Sin título'}`);
            return normVideo(v, api.nombre);
        } catch (error) {
            console.log(`[PLAY-${api.nombre}] ❌ ${error.message}`);
            continue;
        }
    }
    throw new Error('Todas las APIs de búsqueda fallaron');
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
        autor: 'Desconocido',
        source: 'URL directa'
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
        video = await probarAPIsBusqueda(key);
    } else {
        const variantes = [key, ...MODIFICADORES.map(m => `${key} ${m}`)].slice(0, 4);
        console.log(`[PLAY] Genérica → variantes: ${variantes.join(' | ')}`);

        for (const variante of variantes) {
            try {
                video = await probarAPIsBusqueda(variante);
                console.log(`[PLAY] ✅ Variante ganadora: "${variante}"`);
                break;
            } catch (e) {
                continue;
            }
        }

        if (!video) throw new Error('Sin resultados en ninguna variante');
    }

    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });

    return video;
}

async function descargarConYtdlp(url, tipo, outputPath) {
    const formato = tipo === 'audio' 
        ? '--extract-audio --audio-format mp3 --audio-quality 192K'
        : '--format mp4 --write-thumbnail';
    
    const comando = `yt-dlp ${formato} --no-playlist --restrict-filenames --output "${outputPath}" "${url}"`;
    
    console.log(`[PLAY-YTDL] Ejecutando: ${comando.substring(0, 100)}...`);
    
    try {
        const { stdout, stderr } = await execAsync(comando, { 
            timeout: 120000,
            maxBuffer: 50 * 1024 * 1024
        });
        
        console.log(`[PLAY-YTDL] ✅ Descarga completada`);
        return true;
    } catch (error) {
        console.error(`[PLAY-YTDL] ❌ Error: ${error.message}`);
        throw error;
    }
}

async function descargarYT(url, tipo) {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const videoId = extraerVideoId(url) || Date.now();
    const ext = tipo === 'audio' ? 'mp3' : 'mp4';
    const outputPath = path.join(tmpDir, `${videoId}.%(ext)s`);
    const expectedPath = path.join(tmpDir, `${videoId}.${ext}`);
    
    try {
        await descargarConYtdlp(url, tipo, outputPath);
        
        if (fs.existsSync(expectedPath)) {
            const buffer = fs.readFileSync(expectedPath);
            fs.unlinkSync(expectedPath);
            return buffer;
        }
        
        const archivos = fs.readdirSync(tmpDir).filter(f => f.includes(videoId));
        if (archivos.length > 0) {
            const archivoPath = path.join(tmpDir, archivos[0]);
            const buffer = fs.readFileSync(archivoPath);
            fs.unlinkSync(archivoPath);
            return buffer;
        }
        
        throw new Error('No se encontró el archivo descargado');
    } catch (error) {
        const archivos = fs.readdirSync(tmpDir).filter(f => f.includes(videoId));
        archivos.forEach(f => {
            try { fs.unlinkSync(path.join(tmpDir, f)); } catch {}
        });
        throw error;
    }
}

async function procesarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');

        const buffer = await descargarYT(video.url, 'audio');
        
        console.log(`[PLAY] Buffer de audio: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: msg });
        
        console.log(`[PLAY] ✅ Audio enviado`);
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

        const buffer = await descargarYT(video.url, 'video');
        
        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = video.titulo;
        const autor = video.autor;

        const caption =
            '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
            '┃ 🎧 *' + titulo + '*\n' +
            '┃ 👤 ' + autor + '\n' +
            '┃ 📊 MP4 | 📦 ' + tamañoMB + ' MB\n' +
            '┃ 📡 Fuente: yt-dlp\n' +
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
        
        console.log(`[PLAY] ✅ Video enviado`);
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
                '┃ 📡 Fuente: ' + video.source + '\n' +
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