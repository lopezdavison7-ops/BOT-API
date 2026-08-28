// commands/downloads/play.js
// ============================================================
// COMANDO: PLAY
// BOT-API
//
// Busca y descarga música de YouTube en MP3/M4A.
// Usa Lempi API para búsqueda y descarga.
// ============================================================

import 'dotenv/config';
import config from '../../config.js';
import { Readable } from 'stream';

const LEMPI_API = 'https://api.lempi.lat';
const API_KEY = config.LEMPI_API_KEY || '';

const TIMEOUT_BUSQUEDA = 30000;
const TIMEOUT_API = 45000;
const MEDIA_TIMEOUT = 300000;

async function fetchConTimeout(url, opciones = {}, timeout = 30000) {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), timeout);

    try {
        return await fetch(url, { ...opciones, signal: controller.signal });
    } finally {
        clearTimeout(temporizador);
    }
}

function limpiarTexto(texto = '') {
    return String(texto).replace(/\s+/g, ' ').trim();
}

function limpiarNombre(nombre = 'Audio') {
    return String(nombre)
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'Audio';
}

function formatearVistas(vistas) {
    const str = String(vistas || '0').replace(/[^\d.]/g, '');
    const numero = Number(str);

    if (!Number.isFinite(numero)) return 'No disponible';
    if (numero >= 1000000000) return `${(numero / 1000000000).toFixed(1)}B`;
    if (numero >= 1000000) return `${(numero / 1000000).toFixed(1)}M`;
    if (numero >= 1000) return `${(numero / 1000).toFixed(1)}K`;
    return numero.toLocaleString('es-ES');
}

async function reaccionar(sock, jid, key, emoji) {
    try {
        await sock.sendMessage(jid, { react: { text: emoji, key } });
    } catch {}
}

// ============================================================
// CACHÉ DE BÚSQUEDAS
// ============================================================

const CACHE_BUSQUEDA_TTL_MS = 10 * 60 * 1000;
const cacheBusquedas = new Map();
const busquedasEnCurso = new Map();

function normalizarConsulta(consulta) {
    return String(consulta).trim().toLowerCase().replace(/\s+/g, ' ');
}

function obtenerDeCache(consulta) {
    const clave = normalizarConsulta(consulta);
    const entrada = cacheBusquedas.get(clave);
    if (!entrada) return null;
    if (Date.now() > entrada.expira) {
        cacheBusquedas.delete(clave);
        return null;
    }
    return entrada.resultado;
}

function guardarEnCache(consulta, resultado) {
    const clave = normalizarConsulta(consulta);
    cacheBusquedas.set(clave, { resultado, expira: Date.now() + CACHE_BUSQUEDA_TTL_MS });
    if (cacheBusquedas.size > 300) {
        const primeraClave = cacheBusquedas.keys().next().value;
        cacheBusquedas.delete(primeraClave);
    }
}

// ============================================================
// BUSCAR YOUTUBE (LEMPI API)
// ============================================================

async function buscarYouTube(consulta) {
    const enCache = obtenerDeCache(consulta);
    if (enCache) {
        console.log(`[PLAY] ⚡ Búsqueda desde caché: ${consulta}`);
        return enCache;
    }

    const clave = normalizarConsulta(consulta);
    if (busquedasEnCurso.has(clave)) {
        console.log(`[PLAY] 🔗 Enganchado a búsqueda en curso: ${consulta}`);
        return busquedasEnCurso.get(clave);
    }

    const promesa = buscarYouTubeEnApi(consulta).finally(() => {
        busquedasEnCurso.delete(clave);
    });

    busquedasEnCurso.set(clave, promesa);
    return promesa;
}

async function buscarYouTubeEnApi(consulta) {
    if (!API_KEY) {
        throw new Error('LEMPI_API_KEY no está configurada.');
    }

    const endpoint = `${LEMPI_API}/s/youtube?query=${encodeURIComponent(consulta)}&apikey=${API_KEY}`;
    console.log(`[PLAY] 🔎 Buscando: ${consulta}`);

    const respuesta = await fetchConTimeout(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'BOT-API/2.0' }
    }, TIMEOUT_BUSQUEDA);

    if (!respuesta.ok) {
        throw new Error(`Búsqueda HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    if (!datos?.status || !datos?.datos?.ok) {
        throw new Error(datos?.message || 'La búsqueda fue rechazada.');
    }

    const videos = datos.datos?.results?.videos;
    if (!Array.isArray(videos) || videos.length === 0) {
        throw new Error('No encontré resultados.');
    }

    const primero = videos[0];

    const resultado = {
        titulo: limpiarTexto(primero.title || 'Audio'),
        videoUrl: primero.url,
        thumbnail: `https://img.youtube.com/vi/${primero.id}/maxresdefault.jpg`,
        canal: limpiarTexto(primero.channel || 'No disponible'),
        duracion: limpiarTexto(primero.duration || 'No disponible'),
        vistas: primero.views,
        publicado: limpiarTexto(primero.published || 'No disponible')
    };

    guardarEnCache(consulta, resultado);
    return resultado;
}

// ============================================================
// OBTENER MP3 (LEMPI API)
// ============================================================

async function obtenerMP3(videoUrl) {
    if (!API_KEY) {
        throw new Error('LEMPI_API_KEY no está configurada.');
    }

    const endpoint = `${LEMPI_API}/dl/yta?url=${encodeURIComponent(videoUrl)}&apikey=${API_KEY}`;
    console.log('[PLAY] ⚡ Solicitando audio...');

    const respuesta = await fetchConTimeout(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'BOT-API/2.0' }
    }, TIMEOUT_API);

    if (!respuesta.ok) {
        throw new Error(`API Download HTTP ${respuesta.status}`);
    }

    const datos = await respuesta.json();

    if (!datos?.status || !datos?.datos?.url) {
        throw new Error(datos?.message || 'La API no pudo generar el audio.');
    }

    console.log(`[PLAY] 🎧 Audio: ${datos.datos.calidad || 'MP3'}`);

    return {
        download: datos.datos.url,
        titulo: datos.titulo || 'Audio',
        calidad: datos.datos.calidad || 'MP3',
        tamaño: datos.datos.tamaño || 'Desconocido',
        thumbnail: datos.miniatura || null,
        canal: datos.canal || null
    };
}

// ============================================================
// OBTENER STREAM DEL AUDIO
// ============================================================

async function obtenerStream(url) {
    console.log('[PLAY] 🚀 Abriendo stream del audio...');

    const respuesta = await fetchConTimeout(url, {
        headers: {
            Accept: 'audio/mpeg,audio/mp4,*/*',
            'User-Agent': 'BOT-API/2.0'
        }
    }, MEDIA_TIMEOUT);

    if (!respuesta.ok) {
        throw new Error(`Servidor audio HTTP ${respuesta.status}`);
    }

    if (!respuesta.body) {
        throw new Error('El servidor no devolvió un stream.');
    }

    return Readable.fromWeb(respuesta.body);
}

// ============================================================
// DESCARGAR THUMBNAIL
// ============================================================

async function obtenerThumbnail(url) {
    if (!url) return null;

    try {
        const respuesta = await fetchConTimeout(url, {
            headers: { 'User-Agent': 'BOT-API/2.0' }
        }, 15000);

        if (!respuesta.ok) return null;

        const arrayBuffer = await respuesta.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch {
        return null;
    }
}

// ============================================================
// INFORMACIÓN
// ============================================================

function crearInformacion(resultado) {
    return (
        '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
        '┃\n' +
        `┃ 🎵 *${resultado.titulo}*\n` +
        '┃\n' +
        `┃ 👤 ${resultado.canal}\n` +
        `┃ 👁️ ${formatearVistas(resultado.vistas)} vistas\n` +
        `┃ ⏱️ ${resultado.duracion}\n` +
        `┃ 📅 ${resultado.publicado}\n` +
        '┃\n' +
        '┃ ⚡ *Enviando audio...*\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

// ============================================================
// DESCARGAS ACTIVAS POR USUARIO
// ============================================================

const descargasActivas = new Map();

// ============================================================
// COMANDO PLAY
// ============================================================

export default {

    nombre: 'play',

    categoria: 'Descargas',

    alias: [
        'yt',
        'yta',
        'ytmp3',
        'mp3'
    ],

    descripcion:
        'Busca una canción y la envía como MP3.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe una canción.\n' +
                '┃\n' +
                '┃ Ejemplo:\n' +
                '┃ › .play Bad Bunny\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const jid = msg?.key?.remoteJid;
        if (!jid) return;

        const remitente = msg?.key?.participant || msg?.key?.participantAlt || jid;

        if (descargasActivas.has(remitente)) {
            await responder.texto(
                '╭━━〔 ⏳ 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Ya tienes una descarga pendiente.\n' +
                '┃\n' +
                `┃ 🎵 ${descargasActivas.get(remitente)}\n` +
                '┃\n' +
                '┃ Espera a que termine antes de pedir otra.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        descargasActivas.set(remitente, consulta);

        console.log('================================================');
        console.log(`[PLAY] 🎵 ${consulta}`);

        await reaccionar(sock, jid, msg.key, '⏳');

        try {

            const resultado = await buscarYouTube(consulta);

            const promesaThumbnail = obtenerThumbnail(resultado.thumbnail);
            const promesaMp3 = obtenerMP3(resultado.videoUrl);

            let thumbnail = await promesaThumbnail;

            if (thumbnail) {
                await responder.imagen(thumbnail, crearInformacion(resultado));
            } else {
                await responder.texto(crearInformacion(resultado));
            }

            const mp3 = await promesaMp3;

            if (!thumbnail && mp3.thumbnail && mp3.thumbnail !== resultado.thumbnail) {
                thumbnail = await obtenerThumbnail(mp3.thumbnail);
            }

            const stream = await obtenerStream(mp3.download);
            const titulo = limpiarNombre(mp3.titulo || resultado.titulo);

            console.log(`[PLAY] 📤 Enviando: ${titulo}`);

            const contenido = {
                audio: { stream },
                mimetype: 'audio/mpeg',
                fileName: `${titulo}.mp3`,
                ptt: false
            };

            if (thumbnail) {
                contenido.jpegThumbnail = thumbnail;
            }

            await sock.sendMessage(jid, contenido, {
                quoted: msg,
                mediaUploadTimeoutMs: MEDIA_TIMEOUT,
                waitForAck: false
            });

            await reaccionar(sock, jid, msg.key, '✅');
            console.log(`[PLAY] ✅ Audio enviado: ${titulo}`);
            console.log('================================================');

        } catch (error) {

            console.error('[PLAY] ❌ Error:', error?.stack || error?.message || error);

            await reaccionar(sock, jid, msg.key, '❌');

            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude obtener el audio.\n' +
                '┃\n' +
                `┃ ⚠️ ${error?.message || 'Error desconocido.'}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

        } finally {
            descargasActivas.delete(remitente);
        }
    }
};
