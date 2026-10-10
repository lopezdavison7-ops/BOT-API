import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 15000,
    maxSockets: 16,
    maxFreeSockets: 8,
    scheduling: 'lifo'
});

const API_BUSCAR = 'https://api.delirius.online/search/ytsearch';
const API_MP3 = 'https://api.delirius.online/download/ytmp3';
const API_MP4 = 'https://api.delirius.online/download/ytmp4';
const FORMATO_VIDEO = '360p';

const CACHE_TTL = 5 * 60 * 1000;
const INFO_TTL = 10 * 60 * 1000;
const SESION_TTL = 10 * 60 * 1000;

const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const MAX_VIDEO_BYTES = 256 * 1024 * 1024;
const LIMITE_DOCUMENTO = 16 * 1024 * 1024;
const BUFFER_CACHE_MAX_BYTES = 48 * 1024 * 1024;

const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);
const YT_ID = /^[a-zA-Z0-9_-]{11}$/;

const UAS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
];

if (!global.playSessions) global.playSessions = {};

const _cacheLazy = setInterval(() => {
    const ahora = Date.now();
    const sesiones = global.playSessions;
    for (const clave of Object.keys(sesiones)) {
        if (ahora - sesiones[clave].timestamp > SESION_TTL) delete sesiones[clave];
    }
}, 60000);
if (_cacheLazy.unref) _cacheLazy.unref();

function crearCache(ttl, max) {
    const mapa = new Map();
    return {
        get(clave) {
            const entrada = mapa.get(clave);
            if (!entrada) return undefined;
            if (Date.now() - entrada.t > ttl) {
                mapa.delete(clave);
                return undefined;
            }
            mapa.delete(clave);
            mapa.set(clave, entrada);
            return entrada.v;
        },
        set(clave, valor) {
            mapa.delete(clave);
            mapa.set(clave, { v: valor, t: Date.now() });
            while (mapa.size > max) mapa.delete(mapa.keys().next().value);
        },
        clear() {
            mapa.clear();
        }
    };
}

const cacheBusqueda = crearCache(CACHE_TTL, 60);
const cacheInfo = crearCache(INFO_TTL, 120);

const enVuelo = new Map();
function unificar(clave, fn) {
    const pendiente = enVuelo.get(clave);
    if (pendiente) return pendiente;
    const promesa = Promise.resolve().then(fn).finally(() => enVuelo.delete(clave));
    enVuelo.set(clave, promesa);
    return promesa;
}

const cacheBuffer = new Map();
let bytesBuffer = 0;

function bufferCacheado(url) {
    const entrada = cacheBuffer.get(url);
    if (!entrada) return null;
    if (Date.now() - entrada.t > CACHE_TTL) {
        cacheBuffer.delete(url);
        bytesBuffer -= entrada.buffer.length;
        return null;
    }
    return entrada.buffer;
}

function guardarBuffer(url, buffer) {
    if (buffer.length > BUFFER_CACHE_MAX_BYTES / 2) return;
    const previo = cacheBuffer.get(url);
    if (previo) {
        bytesBuffer -= previo.buffer.length;
        cacheBuffer.delete(url);
    }
    cacheBuffer.set(url, { buffer, t: Date.now() });
    bytesBuffer += buffer.length;
    while (bytesBuffer > BUFFER_CACHE_MAX_BYTES && cacheBuffer.size) {
        const primera = cacheBuffer.keys().next().value;
        bytesBuffer -= cacheBuffer.get(primera).buffer.length;
        cacheBuffer.delete(primera);
    }
}

function getUA() {
    return UAS[Math.floor(Math.random() * UAS.length)];
}

function pick(obj, claves) {
    if (!obj) return undefined;
    for (const clave of claves) {
        const valor = obj[clave];
        if (valor !== undefined && valor !== null && valor !== '') return valor;
    }
    return undefined;
}

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

function esURL(input) {
    return /^(https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\//i.test(String(input).trim());
}

function extraerVideoId(url) {
    const texto = String(url).trim();
    const coincidencia = texto.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/
    );
    return coincidencia ? coincidencia[1] : null;
}

function parsearDirecto(query) {
    const texto = String(query).trim();
    if (esURL(texto)) {
        const videoId = extraerVideoId(texto);
        if (!videoId) throw new Error('URL de YouTube inválida');
        return videoId;
    }
    if (YT_ID.test(texto)) return texto;
    return null;
}

function videoDesdeURL(videoId) {
    return {
        videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        titulo: 'Cargando...',
        thumbnail: '',
        duracion: '0:00',
        vistas: 0,
        autor: 'Desconocido'
    };
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
        videoId: v.videoId || v.id,
        url: v.url || `https://www.youtube.com/watch?v=${v.videoId || v.id}`,
        titulo: pick(v, ['title', 'titulo', 'título']) || 'Sin título',
        thumbnail: pick(v, ['image', 'imagen', 'thumbnail']) || '',
        duracion: pick(v, ['duration', 'duración', 'duracion']) || '0:00',
        vistas: pick(v, ['views', 'vistas']) || 0,
        autor: v.author?.name || v.author?.nombre || v.autor?.nombre || v.channel?.name || 'Desconocido'
    };
}

function normInfo(i) {
    return {
        titulo: pick(i, ['title', 'titulo', 'título']) || 'Sin título',
        autor: pick(i, ['author', 'autor']) || 'Desconocido',
        thumbnail: pick(i, ['image', 'imagen']) || '',
        formato: pick(i, ['format', 'formato']) || '',
        downloadUrl: pick(i, ['download', 'descarga', 'downloadUrl', 'dl', 'link', 'url'])
    };
}

async function buscarUna(query) {
    const data = await getJSON(`${API_BUSCAR}?q=${encodeURIComponent(query)}`, 10000);
    if (data.status !== true && data.estado !== true) throw new Error('API sin éxito');
    const lista = data.data || data.datos || [];
    if (!Array.isArray(lista) || !lista.length) throw new Error('Sin resultados');
    const v = lista.find(x => (x.type || x.tipo) === 'video' && !(x.isLive || x.enVivo)) || lista[0];
    return normVideo(v);
}

function primerExito(promesas) {
    return Promise.any(promesas).catch(() => {
        throw new Error('Sin resultados');
    });
}

async function buscarYouTube(query) {
    const directo = parsearDirecto(query);
    if (directo) return videoDesdeURL(directo);

    const clave = query.toLowerCase().trim();
    const cacheada = cacheBusqueda.get(clave);
    if (cacheada) return cacheada;

    return unificar('s:' + clave, async () => {
        const enCache = cacheBusqueda.get(clave);
        if (enCache) return enCache;

        const esGenerica = clave.length <= 5 || GENERICAS.has(clave);
        let video;

        if (esGenerica) {
            const variantes = [clave, ...MODIFICADORES.map(m => `${clave} ${m}`)].slice(0, 4);
            video = await primerExito(variantes.map(v => buscarUna(v)));
        } else {
            try {
                video = await buscarUna(clave);
            } catch {
                video = await primerExito(MODIFICADORES.map(m => buscarUna(`${clave} ${m}`)));
            }
        }

        cacheBusqueda.set(clave, video);
        return video;
    });
}

async function infoAudio(url) {
    const cacheada = cacheInfo.get('a:' + url);
    if (cacheada) return cacheada;
    return unificar('ia:' + url, async () => {
        const enCache = cacheInfo.get('a:' + url);
        if (enCache) return enCache;
        const data = await getJSON(`${API_MP3}?url=${encodeURIComponent(url)}`, 18000);
        if (data.status !== true && data.estado !== true) throw new Error('API MP3 sin éxito');
        const info = normInfo(data.data || data.datos || {});
        if (!info.downloadUrl) throw new Error('Sin link de descarga');
        cacheInfo.set('a:' + url, info);
        return info;
    });
}

async function infoVideo(url) {
    const cacheada = cacheInfo.get('v:' + url);
    if (cacheada) return cacheada;
    return unificar('iv:' + url, async () => {
        const enCache = cacheInfo.get('v:' + url);
        if (enCache) return enCache;
        const data = await getJSON(`${API_MP4}?url=${encodeURIComponent(url)}&format=${FORMATO_VIDEO}`, 18000);
        if (data.status !== true && data.estado !== true) throw new Error('API MP4 sin éxito');
        const info = normInfo(data.data || data.datos || {});
        if (!info.downloadUrl) throw new Error('Sin link de descarga');
        cacheInfo.set('v:' + url, info);
        return info;
    });
}

async function leerBuffer(res, maxBytes) {
    if (!res.body) return Buffer.alloc(0);
    const trozos = [];
    let total = 0;
    for await (const trozo of res.body) {
        total += trozo.length;
        if (maxBytes && total > maxBytes) {
            if (typeof res.body.destroy === 'function') res.body.destroy();
            throw new Error(`Archivo demasiado grande (> ${(maxBytes / 1048576).toFixed(0)} MB)`);
        }
        trozos.push(trozo);
    }
    return Buffer.concat(trozos, total);
}

async function descargarBuffer(url, timeoutMs, maxBytes) {
    const res = await fetch(url, {
        agent: AGENTE,
        headers: { 'User-Agent': getUA(), 'Accept': '*/*' },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error('Descarga HTTP ' + res.status);
    const buffer = await leerBuffer(res, maxBytes);
    if (!buffer.length) throw new Error('Buffer vacío');
    return buffer;
}

function nombreSeguro(titulo) {
    return String(titulo || 'video').replace(/[^\w\s.-]/g, '').trim().slice(0, 80) || 'video';
}

async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        const aviso = responder?.texto
            ? responder.texto('🎵 Descargando audio...').catch(() => {})
            : Promise.resolve();

        let buffer = bufferCacheado(video.url);
        if (!buffer) {
            const info = await infoAudio(video.url);
            buffer = await unificar('da:' + info.downloadUrl, () =>
                descargarBuffer(info.downloadUrl, 60000, MAX_AUDIO_BYTES)
            );
            guardarBuffer(video.url, buffer);
        }

        await aviso;
        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: msg });
    } catch (error) {
        console.error('[PLAY-AUDIO] Error:', error?.message || error);
        await responder?.texto(
            '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
            '┃ No se pudo enviar el audio.\n' +
            '┃\n' +
            '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
}

async function procesarVideo(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        const aviso = responder?.texto
            ? responder.texto('🎬 Descargando video...').catch(() => {})
            : Promise.resolve();

        const info = await infoVideo(video.url);
        const buffer = await unificar('dv:' + info.downloadUrl, () =>
            descargarBuffer(info.downloadUrl, 120000, MAX_VIDEO_BYTES)
        );

        await aviso;

        const tamañoMB = (buffer.length / 1048576).toFixed(2);
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        const caption =
            '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
            '┃ 🎧 *' + titulo + '*\n' +
            '┃ 👤 ' + autor + '\n' +
            '┃ 📊 ' + (info.formato || FORMATO_VIDEO) + ' | 📦 ' + tamañoMB + ' MB\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        if (buffer.length > LIMITE_DOCUMENTO) {
            await sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${nombreSeguro(titulo)}.mp4`,
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
        await responder?.texto(
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
                '┃ ➪ .play hola\n' +
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

            const caption =
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ 🎧 *' + video.titulo + '*\n' +
                '┃\n' +
                '┃ 👤 ' + video.autor + '\n' +
                '┃ ⏱️ ' + video.duracion + '\n' +
                '┃ 👀 ' + formatearVistas(video.vistas) + '\n' +
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
