// commands/downloads/play2.js
// ============================================================
// COMANDO: PLAY2
// BOT-API
//
// Busca y descarga videos de YouTube en MP4.
// Usa Lempi API para búsqueda y descarga de video.
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

function limpiarNombre(nombre = 'Video') {
    return String(nombre)
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80) || 'Video';
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

async function buscarYouTube(consulta) {
    const enCache = obtenerDeCache(consulta);
    if (enCache) {
        console.log(`[PLAY2] ⚡ Búsqueda desde caché: ${consulta}`);
        return enCache;
    }

    const clave = normalizarConsulta(consulta);
    if (busquedasEnCurso.has(clave)) {
        console.log(`[PLAY2] 🔗 Enganchado a búsqueda en curso: ${consulta}`);
        return busquedasEnCurso.get(clave);
    }

    const promesa = buscarYouTubeEnApi(consulta).finally(() => {
        busquedasEnCurso.delete(clave);
    });

    busquedasEnCurso.set(clave, promesa);
    return promesa;
}

async function buscarYouTubeEnApi(consulta) {
    if (!API_KEY) throw new Error('LEMPI_API_KEY no está configurada.');

    const endpoint = `${LEMPI_API}/s/youtube?query=${encodeURIComponent(consulta)}&apikey=${API_KEY}`;
    console.log(`[PLAY2] 🔎 Buscando: ${consulta}`);

    const respuesta = await fetchConTimeout(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'BOT-API/2.0' }
    }, TIMEOUT_BUSQUEDA);

    if (!respuesta.ok) throw new Error(`Búsqueda HTTP ${respuesta.status}`);

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
        titulo: limpiarTexto(primero.title || 'Video'),
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

async function obtenerVideo(videoUrl) {
    if (!API_KEY) throw new Error('LEMPI_API_KEY no está configurada.');

    const endpoint = `${LEMPI_API}/dl/ytv?url=${encodeURIComponent(videoUrl)}&apikey=${API_KEY}`;
    console.log('[PLAY2] 🎬 Solicitando video...');

    const respuesta = await fetchConTimeout(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'BOT-API/2.0' }
    }, TIMEOUT_API);

    if (!respuesta.ok) throw new Error(`API Download HTTP ${respuesta.status}`);

    const datos = await respuesta.json();
    if (!datos?.status || !datos?.datos?.url) {
        throw new Error(datos?.message || 'La API no pudo generar el video.');
    }

    console.log(`[PLAY2] 🎬 Video: ${datos.datos.calidad || 'MP4'}`);

    return {
        download: datos.datos.url,
        titulo: datos.titulo || 'Video',
        calidad: datos.datos.calidad || 'MP4',
        tamaño: datos.datos.tamaño || 'Desconocido',
        thumbnail: datos.miniatura || null,
        canal: datos.canal || null
    };
}

async function obtenerStream(url) {
    console.log('[PLAY2] 🚀 Abriendo stream del video...');
    const respuesta = await fetchConTimeout(url, {
        headers: { Accept: 'video/mp4,*/*', 'User-Agent': 'BOT-API/2.0' }
    }, MEDIA_TIMEOUT);

    if (!respuesta.ok) throw new Error(`Servidor video HTTP ${respuesta.status}`);
    if (!respuesta.body) throw new Error('El servidor no devolvió un stream.');
    return Readable.fromWeb(respuesta.body);
}

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

function crearInformacion(resultado) {
    return (
        '╭━━〔 🎬 𝐏𝐋𝐀𝐘𝟐 〕━━⬣\n' +
        '┃\n' +
        `┃ 🎬 *${resultado.titulo}*\n` +
        '┃\n' +
        `┃ 👤 ${resultado.canal}\n` +
        `┃ 👁️ ${formatearVistas(resultado.vistas)} vistas\n` +
        `┃ ⏱️ ${resultado.duracion}\n` +
        `┃ 📅 ${resultado.publicado}\n` +
        '┃\n' +
        '┃ ⚡ *Enviando video...*\n' +
        '┃\n' +
        '╰━━━━━━━━━━━━━━━━⬣'
    );
}

const descargasActivas = new Map();

export default {
    nombre: 'play2',
    categoria: 'Descargas',
    alias: ['ytv', 'ytmp4', 'mp4', 'video'],
    descripcion: 'Busca un video de YouTube y lo envía como MP4.',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭━━〔 🎬 𝐏𝐋𝐀𝐘𝟐 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe un video.\n' +
                '┃\n' +
                '┃ Ejemplo:\n' +
                '┃ › .play2 Bad Bunny\n' +
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
                '╭━━〔 ⏳ 𝐏𝐋𝐀𝐘𝟐 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Ya tienes una descarga pendiente.\n' +
                '┃\n' +
                `┃ 🎬 ${descargasActivas.get(remitente)}\n` +
                '┃\n' +
                '┃ Espera a que termine antes de pedir otra.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        descargasActivas.set(remitente, consulta);
        console.log('================================================');
        console.log(`[PLAY2] 🎬 ${consulta}`);
        await reaccionar(sock, jid, msg.key, '⏳');

        try {
            const resultado = await buscarYouTube(consulta);
            const promesaThumbnail = obtenerThumbnail(resultado.thumbnail);
            const promesaVideo = obtenerVideo(resultado.videoUrl);

            let thumbnail = await promesaThumbnail;

            if (thumbnail) {
                await responder.imagen(thumbnail, crearInformacion(resultado));
            } else {
                await responder.texto(crearInformacion(resultado));
            }

            const video = await promesaVideo;

            if (!thumbnail && video.thumbnail && video.thumbnail !== resultado.thumbnail) {
                thumbnail = await obtenerThumbnail(video.thumbnail);
            }

            const stream = await obtenerStream(video.download);
            const titulo = limpiarNombre(video.titulo || resultado.titulo);

            console.log(`[PLAY2] 📤 Enviando: ${titulo}`);

            const contenido = {
                video: { stream },
                mimetype: 'video/mp4',
                fileName: `${titulo}.mp4`,
                caption: `🎬 *${video.titulo || resultado.titulo}*\n👤 ${video.canal || resultado.canal}\n📦 ${video.tamaño}`
            };

            if (thumbnail) contenido.jpegThumbnail = thumbnail;

            await sock.sendMessage(jid, contenido, {
                quoted: msg,
                mediaUploadTimeoutMs: MEDIA_TIMEOUT,
                waitForAck: false
            });

            await reaccionar(sock, jid, msg.key, '✅');
            console.log(`[PLAY2] ✅ Video enviado: ${titulo}`);
            console.log('================================================');

        } catch (error) {
            console.error('[PLAY2] ❌ Error:', error?.stack || error?.message || error);
            await reaccionar(sock, jid, msg.key, '❌');
            await responder.texto(
                '╭━━〔 ❌ 𝐏𝐋𝐀𝐘𝟐 〕━━⬣\n' +
                '┃\n' +
                '┃ No pude obtener el video.\n' +
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
