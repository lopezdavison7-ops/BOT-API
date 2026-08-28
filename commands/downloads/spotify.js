// commands/downloads/spotify.js
// ============================================================
// COMANDO: SPOTIFY — Lempi API Edition
// BOT-API
//
// Búsqueda + descarga directa de MP3 desde Spotify.
// Usa Lempi API para todo. Sin intermediarios.
//
// Uso:
//   .spotify <nombre>
//   .spotify <url de spotify>
// ============================================================

import axios from 'axios';
import config from '../../config.js';

const LEMPI_API = 'https://api.lempi.lat';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

function esUrlSpotify(texto) {
    return /open\.spotify\.com|spotify:/.test(texto);
}

function sanitizarNombre(nombre) {
    return String(nombre)
        .replace(/[<>:\"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
}

function formatearDuracion(segundos) {
    const min = Math.floor(segundos / 60);
    const seg = Math.floor(segundos % 60);
    return `${min}:${seg.toString().padStart(2, '0')}`;
}

// ============================================================
// BÚSQUEDA EN LEMPI
// ============================================================

async function buscarEnLempi(query, apikey) {
    try {
        const url = `${LEMPI_API}/s/sp?q=${encodeURIComponent(query)}&limit=5&apikey=${apikey}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const data = res.data;

        if (!data.status || !data.resultados?.canciones?.length) {
            return null;
        }

        return data.resultados.canciones.map(c => ({
            titulo: c.titulo,
            artista: c.artistas?.map(a => a.nombre).join(', ') || 'Desconocido',
            album: c.album?.nombre || '',
            url: c.url
        }));
    } catch (e) {
        console.error('[LEMPI SEARCH] Error:', e.message);
        return null;
    }
}

// ============================================================
// DESCARGA DIRECTA DESDE LEMPI
// ============================================================

async function descargarDesdeLempi(spotifyUrl, apikey) {
    try {
        const url = `${LEMPI_API}/dl/spotify?url=${encodeURIComponent(spotifyUrl)}&apikey=${apikey}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 30000 });
        const data = res.data;

        if (!data.status || !data.datos?.url) {
            return {
                exito: false,
                error: data.message || 'La API no devolvió link de descarga.'
            };
        }

        // Descargar el MP3 directo
        const mp3Res = await axios.get(data.datos.url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': USER_AGENT },
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024
        });

        return {
            exito: true,
            buffer: Buffer.from(mp3Res.data),
            titulo: `${data.artista} - ${data.titulo}`,
            artista: data.artista,
            cancion: data.titulo,
            album: data.album,
            duracion: data.duracion,
            tamano: data.datos.tamaño
        };
    } catch (e) {
        console.error('[LEMPI DOWNLOAD] Error:', e.message);
        return { exito: false, error: e.message };
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'spotify',

    categoria: 'descargas',

    alias: ['sp', 'spoti', 'spotifydl', 'spdl'],

    descripcion: 'Descarga música de Spotify en MP3. Uso: .spotify <nombre> | .spotify <url>',

    ejecutar: async ({ sock, msg, responder, argumento }) => {

        const chatJid = msg.key.remoteJid;
        const apikey = config.LEMPI_API_KEY || '';

        if (!apikey) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *API Key de Lempi no configurada.*\n' +
                '┃\n' +
                '┃ Agrega tu key en config.js:\n' +
                '┃ LEMPI_API_KEY: "tu_key_aqui"\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        if (!argumento.trim()) {
            await responder.texto(
                '╭〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *Falta el enlace o nombre.*\n' +
                '┃\n' +
                '┃ 📌 *Uso:* .spotify Anuel AA\n' +
                '┃ 📌 *Uso:* .spotify https://open.spotify.com/track/...\n' +
                '┃\n' +
                '╰━━━━━━━━💻BOT-API⚡━━━━━━━━⬣'
            );
            return;
        }

        const input = argumento.trim();
        let spotifyUrl = null;

        // -------------------------------------------------------
        // DETERMINAR URL DE SPOTIFY
        // -------------------------------------------------------

        if (esUrlSpotify(input)) {
            spotifyUrl = input;
            await responder.texto(
                `╭〔 🔍 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ 🎵 Procesando URL...\\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        } else {
            // BÚSQUEDA POR NOMBRE
            await responder.texto(
                `╭〔 🔍 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ Buscando: *${input}*\\n` +
                `┃ 🔎 En Spotify💻...\\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );

            const canciones = await buscarEnLempi(input, apikey);

            if (!canciones || canciones.length === 0) {
                await responder.texto(
                    '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                    '┃\n' +
                    '┃ No se encontraron canciones.\\n' +
                    '┃ Intenta con otro nombre.\\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            const track = canciones[0];
            spotifyUrl = track.url;

            await responder.texto(
                `╭〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ 🎤 *${track.titulo}*\\n` +
                `┃ 👤 ${track.artista}\\n` +
                `┃ 💿 ${track.album}\\n` +
                `┃ ⏳ Descargando audio...\\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        // -------------------------------------------------------
        // DESCARGAR
        // -------------------------------------------------------

        const resultado = await descargarDesdeLempi(spotifyUrl, apikey);

        if (!resultado.exito) {
            await responder.texto(
                `╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ No se pudo descargar.\\n` +
                `┃ 📝 ${resultado.error}\\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
            return;
        }

        // -------------------------------------------------------
        // ENVIAR
        // -------------------------------------------------------

        try {
            await sock.sendMessage(chatJid, {
                audio: resultado.buffer,
                mimetype: 'audio/mpeg',
                fileName: `${sanitizarNombre(resultado.titulo)}.mp3`,
                ptt: false
            }, { quoted: msg });

            const duracionStr = formatearDuracion(resultado.duracion);

            await responder.texto(
                `╭〔 ✅ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ 🎵 *${resultado.cancion}*\\n` +
                `┃ 👤 ${resultado.artista}\\n` +
                `┃ 💿 ${resultado.album}\\n` +
                `┃ ⏱️ ${duracionStr}\\n` +
                `┃ 📦 ${resultado.tamano}\\n` +
                `┃ ✅ Descarga completada\\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        } catch (e) {
            console.error('[SPOTIFY] Error enviando:', e.message);
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                '┃ Error al enviar el audio.\\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};
