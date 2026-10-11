import fetch from 'node-fetch';
import https from 'node:https';

const AGENTE = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 15000,
    maxSockets: 16,
    maxFreeSockets: 8,
    scheduling: 'lifo'
});

const API = 'https://api.delirius.online/download/twitter?url=';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 120;

const MAX_VIDEO_BYTES = 96 * 1024 * 1024;
const LIMITE_DOCUMENTO = 16 * 1024 * 1024;
const MAX_MEDIA = 4;

const URL_TW = /https?:\/\/(?:www\.|mobile\.|m\.)?(?:twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/\d+/i;

const cache = new Map();
const enVuelo = new Map();

function pick(obj, claves) {
    if (!obj) return undefined;
    for (const clave of claves) {
        const valor = obj[clave];
        if (valor !== undefined && valor !== null && valor !== '') return valor;
    }
    return undefined;
}

function limpiarCache() {
    const ahora = Date.now();
    for (const [clave, entrada] of cache) {
        if (ahora - entrada.t > CACHE_TTL) cache.delete(clave);
    }
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

function unificar(clave, fn) {
    const pendiente = enVuelo.get(clave);
    if (pendiente) return pendiente;
    const promesa = Promise.resolve().then(fn).finally(() => enVuelo.delete(clave));
    enVuelo.set(clave, promesa);
    return promesa;
}

async function fetchReintento(url, opciones, intentos = 3) {
    let ultimoError;
    for (let i = 0; i < intentos; i++) {
        try {
            return await fetch(url, opciones);
        } catch (error) {
            ultimoError = error;
            if (error?.name === 'AbortError') throw error;
            if (i < intentos - 1) await new Promise(r => setTimeout(r, 350 * (i + 1)));
        }
    }
    throw ultimoError;
}

function extraerUrl(texto) {
    const coincidencia = String(texto || '').match(URL_TW);
    return coincidencia ? coincidencia[0] : null;
}

function formatearNumero(valor) {
    const num = parseInt(String(valor ?? '').replace(/\D/g, ''), 10) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
}

function recortar(texto, max) {
    const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
    if (limpio.length <= max) return limpio;
    return limpio.slice(0, max - 1).trim() + '…';
}

function mejorVideo(media) {
    const videos = Array.isArray(media.videos) ? [...media.videos] : [];
    if (!videos.length) return null;
    videos.sort((a, b) => (Number(b.bitrate) || 0) - (Number(a.bitrate) || 0));
    return videos[0].url || videos[0].link || null;
}

function urlFoto(media) {
    const url = media.image || media.url || media.media_url || null;
    if (!url) return null;
    return url.includes('?') ? url : url + '?name=orig';
}

async function obtenerTweet(url) {
    const clave = url.toLowerCase();
    const enCache = cache.get(clave);
    if (enCache && Date.now() - enCache.t < CACHE_TTL) return enCache.v;

    return unificar('t:' + clave, async () => {
        const guardado = cache.get(clave);
        if (guardado && Date.now() - guardado.t < CACHE_TTL) return guardado.v;

        const res = await fetchReintento(API + encodeURIComponent(url), {
            agent: AGENTE,
            headers: { 'User-Agent': UA, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(25000)
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const json = await res.json();
        if (json.status !== true) {
            throw new Error(json.msg || 'Tweet no encontrado');
        }

        const data = pick(json, ['data', 'datos', 'result']);
        if (!data) throw new Error('Respuesta vacía de la API');

        limpiarCache();
        cache.set(clave, { v: data, t: Date.now() });
        return data;
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
            throw new Error(`Video demasiado grande (> ${(maxBytes / 1048576).toFixed(0)} MB)`);
        }
        trozos.push(trozo);
    }
    return Buffer.concat(trozos, total);
}

async function descargarBuffer(url, maxBytes) {
    return unificar('d:' + url, async () => {
        const res = await fetchReintento(url, {
            agent: AGENTE,
            headers: { 'User-Agent': UA, 'Accept': '*/*', 'Referer': 'https://x.com/' },
            signal: AbortSignal.timeout(150000)
        });
        if (!res.ok) throw new Error('Descarga HTTP ' + res.status);
        const buffer = await leerBuffer(res, maxBytes);
        if (!buffer.length) throw new Error('Buffer vacío');
        return buffer;
    });
}

function nombreSeguro(texto) {
    return String(texto || 'twitter').replace(/[^\w\s.-]/g, '').trim().slice(0, 60) || 'twitter';
}

function construirCaption(data, titulo) {
    const autor = data.author || {};
    const usuario = autor.username || autor.name || 'desconocido';
    const verificado = autor.verified ? ' ✅' : '';
    const descripcion = recortar(data.description, 220);

    const metricas = [];
    if (data.favorite) metricas.push('❤️ ' + formatearNumero(data.favorite));
    if (data.retweet) metricas.push('🔁 ' + formatearNumero(data.retweet));
    if (data.replie || data.reply) metricas.push('💬 ' + formatearNumero(data.replie || data.reply));

    let caption =
        '╭━━〔 🐦 𝐓𝐖𝐈𝐓𝐓𝐄𝐑 / 𝐗 〕━━⬣\n' +
        '┃\n' +
        '┃ 👤 *@' + usuario + '*' + verificado + '\n' +
        (descripcion ? '┃ 📝 ' + descripcion + '\n' : '') +
        '┃\n';

    if (metricas.length) caption += '┃ ' + metricas.join('  ') + '\n';

    const extras = [];
    if (data.view) extras.push('👁️ ' + formatearNumero(data.view));
    if (data.createdAt) extras.push('📅 ' + data.createdAt);
    if (extras.length) caption += '┃ ' + extras.join('  ') + '\n';

    caption += '┃\n' +
        '┃ 📥 ' + titulo + '\n' +
        '┃\n' +
        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    return caption;
}

async function enviarMedia(media, caption, sock, jid, msg, responder) {
    const tipo = String(media.type || '').toLowerCase();

    if (tipo === 'photo' || media.image) {
        const foto = urlFoto(media);
        if (foto) return sock.sendMessage(jid, { image: { url: foto }, caption }, { quoted: msg });
    }

    const videoUrl = mejorVideo(media);
    if (videoUrl) {
        try {
            const buffer = await descargarBuffer(videoUrl, MAX_VIDEO_BYTES);
            if (buffer.length > LIMITE_DOCUMENTO) {
                return sock.sendMessage(jid, {
                    document: buffer,
                    mimetype: 'video/mp4',
                    fileName: nombreSeguro('twitter') + '.mp4',
                    caption
                }, { quoted: msg });
            }
            return sock.sendMessage(jid, {
                video: buffer,
                mimetype: 'video/mp4',
                caption
            }, { quoted: msg });
        } catch (errorBuffer) {
            console.error('[TWITTER] Fallback por URL:', errorBuffer?.message || errorBuffer);
            return sock.sendMessage(jid, {
                video: { url: videoUrl },
                mimetype: 'video/mp4',
                caption
            }, { quoted: msg });
        }
    }

    return null;
}

export default {
    nombre: 'twitter',
    categoria: 'descargas',
    alias: ['x', 'xdl', 'tw', 'tweet', 'twitterdl'],
    descripcion: '📥 Descarga videos, fotos y GIFs de Twitter / X',
    uso: '.twitter <enlace del tweet>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const texto = String(argumento || '').trim();

        if (!texto) {
            return await responder.texto(
                '╭━━〔 🐦 𝐓𝐖𝐈𝐓𝐓𝐄𝐑 / 𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el enlace del tweet\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ ➪ .twitter <enlace>\n' +
                '┃ ➪ .x <enlace>\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ ➪ .x https://x.com/user/status/123\n' +
                '┃\n' +
                '┃ 🎬 Videos · 🖼️ Fotos · ✨ GIFs\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const url = extraerUrl(texto);
        if (!url) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐄𝐍𝐋𝐀𝐂𝐄 𝐈𝐍𝐕Á𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ Solo acepto enlaces de tweets:\n' +
                '┃ • twitter.com/<user>/status/<id>\n' +
                '┃ • x.com/<user>/status/<id>\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            await responder.texto('🔍 Analizando tweet...');

            const data = await obtenerTweet(url);
            const media = Array.isArray(data.media) ? data.media.slice(0, MAX_MEDIA) : [];

            if (!media.length) {
                const sinMedia = construirCaption(data, 'Sin archivos multimedia');
                return await responder.texto(sinMedia);
            }

            const caption = construirCaption(
                data,
                media.length + ' archivo' + (media.length > 1 ? 's' : '') + ' multimedia'
            );

            let enviados = 0;
            for (let i = 0; i < media.length; i++) {
                try {
                    const enviado = await enviarMedia(
                        media[i],
                        i === 0 ? caption : '',
                        sock, jid, msg, responder
                    );
                    if (enviado) enviados++;
                } catch (errorMedia) {
                    console.error('[TWITTER] Error media ' + (i + 1) + ':', errorMedia?.message || errorMedia);
                }
            }

            if (!enviados) {
                await responder.texto('❌ No se pudo descargar el contenido de este tweet.');
            }

        } catch (error) {
            console.error('[TWITTER] Error:', error?.message || error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No se pudo procesar el tweet.\n' +
                '┃\n' +
                '┃ ⚠️ ' + recortar(error?.message || 'Error desconocido', 120) + '\n' +
                '┃\n' +
                '┃ 💡 Verifica que el tweet sea\n' +
                '┃    público e inténtalo de nuevo.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};
