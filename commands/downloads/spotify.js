// commands/downloads/spotify.js
// ============================================================
// COMANDO: SPOTIFY
// BOT-API
//
// Descarga música de Spotify en formato MP3.
// Soporta links de track, playlist y álbum.
// Usa scraping de api.spotifydown.com + y2mate para obtener
// los archivos de audio.
//
// Uso:
//   .spotify <url de spotify>
//   .spotify <nombre de canción>
//   .spotify <url de playlist>
// ============================================================

import axios from 'axios';
import config from '../../config.js';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const SPOTIFYDOWN_API = 'https://api.spotifydown.com';
const Y2MATE_ANALYZE = 'https://corsproxy.io/?https://www.y2mate.com/mates/analyzeV2/ajax';
const Y2MATE_CONVERT = 'https://corsproxy.io/?https://www.y2mate.com/mates/convertV2/index';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://spotifydown.com',
    'Referer': 'https://spotifydown.com/',
    'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="120", "Chromium";v="120"',
    'sec-fetch-mode': 'cors'
};

// ============================================================
// UTILIDADES
// ============================================================

function extraerSpotifyId(url) {
    // Soporta:
    // https://open.spotify.com/track/ID
    // https://open.spotify.com/playlist/ID
    // https://open.spotify.com/album/ID
    // spotify:track:ID
    const match = url.match(/(?:track|playlist|album)[/:]([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
}

function extraerTipoUrl(url) {
    if (url.includes('track')) return 'track';
    if (url.includes('playlist')) return 'playlist';
    if (url.includes('album')) return 'album';
    return 'track';
}

function esUrlSpotify(texto) {
    return /open\.spotify\.com|spotify:/.test(texto);
}

function formatearDuracion(ms) {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

function sanitizarNombre(nombre) {
    return String(nombre)
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 100);
}

// ============================================================
// SPOTIFY METADATA (API pública sin auth)
// ============================================================

async function buscarEnSpotify(query) {
    try {
        const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;
        // Usar token embedido de Spotify (público, puede expirar)
        const tokenRes = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000
        });
        const token = tokenRes.data?.accessToken;
        if (!token) return null;

        const res = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });

        const track = res.data?.tracks?.items?.[0];
        if (!track) return null;

        return {
            id: track.id,
            titulo: track.name,
            artista: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            imagen: track.album.images?.[0]?.url,
            duracion: track.duration_ms,
            url: track.external_urls?.spotify
        };
    } catch (e) {
        console.error('[SPOTIFY] Error buscando:', e.message);
        return null;
    }
}

async function obtenerInfoTrack(trackId) {
    try {
        const tokenRes = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000
        });
        const token = tokenRes.data?.accessToken;
        if (!token) return null;

        const res = await axios.get(`https://api.spotify.com/v1/tracks/${trackId}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });

        const track = res.data;
        return {
            id: track.id,
            titulo: track.name,
            artista: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            imagen: track.album.images?.[0]?.url,
            duracion: track.duration_ms,
            url: track.external_urls?.spotify
        };
    } catch (e) {
        console.error('[SPOTIFY] Error obteniendo info:', e.message);
        return null;
    }
}

// ============================================================
// SCRAPER: SPOTIFYDOWN → Y2MATE
// ============================================================

async function obtenerYoutubeId(trackId) {
    try {
        const res = await axios.get(`${SPOTIFYDOWN_API}/getId/${trackId}`, {
            headers: HEADERS,
            timeout: 15000
        });
        return res.data?.id || null;
    } catch (e) {
        console.error('[SPOTIFYDOWN] Error getId:', e.message);
        return null;
    }
}

async function analizarY2Mate(youtubeId) {
    try {
        const res = await axios.post(Y2MATE_ANALYZE, {
            k_query: `https://www.youtube.com/watch?v=${youtubeId}`,
            k_page: 'home',
            hl: 'en',
            q_auto: 0
        }, {
            headers: {
                ...HEADERS,
                'authority': 'corsproxy.io',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 15000
        });
        return res.data;
    } catch (e) {
        console.error('[Y2MATE] Error analizando:', e.message);
        return null;
    }
}

async function convertirY2Mate(vid, k) {
    try {
        const res = await axios.post(Y2MATE_CONVERT, {
            vid,
            k
        }, {
            headers: {
                ...HEADERS,
                'authority': 'corsproxy.io',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 20000
        });
        return res.data?.dlink || null;
    } catch (e) {
        console.error('[Y2MATE] Error convirtiendo:', e.message);
        return null;
    }
}

async function descargarAudio(url) {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': USER_AGENT },
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024 // 50MB max
        });
        return Buffer.from(res.data);
    } catch (e) {
        console.error('[DOWNLOAD] Error descargando:', e.message);
        return null;
    }
}

// ============================================================
// PLAYLIST / ALBUM
// ============================================================

async function obtenerTracklist(tipo, id) {
    try {
        const url = `${SPOTIFYDOWN_API}/trackList/${tipo}/${id}`;
        const res = await axios.get(url, {
            headers: HEADERS,
            timeout: 15000
        });
        return res.data?.trackList || [];
    } catch (e) {
        console.error('[SPOTIFYDOWN] Error tracklist:', e.message);
        return [];
    }
}

// ============================================================
// DESCARGA COMPLETA DE UN TRACK
// ============================================================

async function descargarTrack(trackInfo) {
    // Paso 1: Obtener YouTube ID desde SpotifyDown
    const youtubeId = await obtenerYoutubeId(trackInfo.id);
    if (!youtubeId) {
        return { exito: false, error: 'No se pudo resolver el track en YouTube.' };
    }

    // Paso 2: Analizar en Y2Mate
    const analisis = await analizarY2Mate(youtubeId);
    if (!analisis || !analisis.links?.mp3?.mp3128?.k) {
        return { exito: false, error: 'No se pudo analizar el audio.' };
    }

    // Paso 3: Convertir
    const downloadUrl = await convertirY2Mate(analisis.vid, analisis.links.mp3.mp3128.k);
    if (!downloadUrl) {
        return { exito: false, error: 'No se pudo generar el link de descarga.' };
    }

    // Paso 4: Descargar
    const buffer = await descargarAudio(downloadUrl);
    if (!buffer) {
        return { exito: false, error: 'No se pudo descargar el archivo.' };
    }

    return {
        exito: true,
        buffer,
        titulo: `${trackInfo.artista} - ${trackInfo.titulo}`,
        info: trackInfo
    };
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'spotify',

    categoria: 'descargas',

    alias: [
        'sp',
        'spoti',
        'spotifydl',
        'spdl'
    ],

    descripcion:
        'Descarga música de Spotify en MP3. Uso: .spotify <url> | .spotify <nombre>',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const chatJid = msg.key.remoteJid;

        // -------------------------------------------------------
        // VALIDAR ARGUMENTO
        // -------------------------------------------------------

        if (!argumento.trim()) {
            await responder.texto(
                '╭〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *Falta el enlace o nombre.*\n' +
                '┃\n' +
                '┃ 📌 *Formas de uso:*\n' +
                '┃ • Por URL: *.spotify https://open.spotify.com/track/...*\n' +
                '┃ • Por nombre: *.spotify Bad Bunny Monaco*\n' +
                '┃ • Playlist: *.spotify https://open.spotify.com/playlist/...*\n' +
                '┃\n' +
                '┃ ⚠️ Las playlists descargan las primeras 5 canciones.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const input = argumento.trim();
        let trackInfo = null;
        let tipo = 'track';
        let spotifyId = null;

        // -------------------------------------------------------
        // DETECTAR SI ES URL O BÚSQUEDA
        // -------------------------------------------------------

        if (esUrlSpotify(input)) {
            spotifyId = extraerSpotifyId(input);
            tipo = extraerTipoUrl(input);

            if (!spotifyId) {
                await responder.texto(
                    '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                    '┃\n' +
                    '┃ URL de Spotify no válida.\n' +
                    '┃\n' +
                    '┃ Asegúrate de copiar el link correcto:\n' +
                    '┃ • Compartir → Copiar enlace\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            // Obtener info del track
            if (tipo === 'track') {
                trackInfo = await obtenerInfoTrack(spotifyId);
            }
        } else {
            // Búsqueda por nombre
            await responder.texto(
                '╭〔 🔍 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                `┃ Buscando: *${input}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            trackInfo = await buscarEnSpotify(input);
            tipo = 'track';
        }

        // -------------------------------------------------------
        // MODO PLAYLIST / ALBUM
        // -------------------------------------------------------

        if (tipo === 'playlist' || tipo === 'album') {
            await responder.texto(
                '╭〔 📂 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                `┃ Obteniendo canciones del ${tipo}...\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            const tracks = await obtenerTracklist(tipo, spotifyId);
            if (!tracks || tracks.length === 0) {
                await responder.texto(
                    '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                    '┃\n' +
                    '┃ No se encontraron canciones.\n' +
                    '┃ El enlace puede ser privado o inválido.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            // Limitar a 5 canciones para no saturar
            const limite = Math.min(tracks.length, 5);
            const seleccionados = tracks.slice(0, limite);

            await responder.texto(
                `╭〔 📂 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ 🎵 Total: *${tracks.length}* canciones\n` +
                `┃ ⬇️ Descargando: *${limite}*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );

            let descargados = 0;
            let fallidos = 0;

            for (let i = 0; i < seleccionados.length; i++) {
                const t = seleccionados[i];
                const info = {
                    id: t.id,
                    titulo: t.title || t.name,
                    artista: t.artists || 'Desconocido',
                    album: t.album || '',
                    imagen: t.cover || t.image,
                    duracion: 0,
                    url: `https://open.spotify.com/track/${t.id}`
                };

                try {
                    await responder.texto(
                        `╭〔 ⏳ 𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐍𝐃𝐎 〕⬣\n` +
                        `┃\n` +
                        `┃ [${i + 1}/${limite}] *${info.titulo}*\n` +
                        `┃ 🎤 ${info.artista}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━⬣`
                    );

                    const resultado = await descargarTrack(info);
                    if (resultado.exito) {
                        await sock.sendMessage(chatJid, {
                            audio: resultado.buffer,
                            mimetype: 'audio/mpeg',
                            fileName: `${sanitizarNombre(resultado.titulo)}.mp3`,
                            ptt: false
                        }, { quoted: msg });
                        descargados++;
                    } else {
                        fallidos++;
                        await responder.texto(
                            `╭〔 ⚠️ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                            `┃\n` +
                            `┃ ❌ Falló: *${info.titulo}*\n` +
                            `┃ 📝 ${resultado.error}\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━⬣`
                        );
                    }
                } catch (e) {
                    fallidos++;
                    console.error('[SPOTIFY] Error en track:', e.message);
                }

                // Delay entre descargas para no saturar
                if (i < seleccionados.length - 1) {
                    await new Promise(r => setTimeout(r, 3000));
                }
            }

            await responder.texto(
                `╭〔 ✅ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ 📂 ${tipo.toUpperCase()} completado\n` +
                `┃ ✅ Descargados: *${descargados}*\n` +
                `┃ ❌ Fallidos: *${fallidos}*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
            return;
        }

        // -------------------------------------------------------
        // MODO TRACK INDIVIDUAL
        // -------------------------------------------------------

        if (!trackInfo) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                '┃ No se encontró la canción.\n' +
                '┃ Intenta con otro nombre o URL.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        // Mostrar info mientras descarga
        const duracionStr = formatearDuracion(trackInfo.duracion);
        await responder.texto(
            `╭〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
            `┃\n` +
            `┃ 🎤 *${trackInfo.titulo}*\n` +
            `┃ 👤 ${trackInfo.artista}\n` +
            `┃ 💿 ${trackInfo.album}\n` +
            `┃ ⏱️ ${duracionStr}\n` +
            `┃\n` +
            `┃ ⏳ Descargando audio...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        // Descargar
        const resultado = await descargarTrack(trackInfo);

        if (!resultado.exito) {
            await responder.texto(
                `╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ No se pudo descargar.\n` +
                `┃ 📝 ${resultado.error}\n` +
                `┃\n` +
                `┃ 💡 Intenta con otra canción.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
            return;
        }

        // Enviar audio
        try {
            await sock.sendMessage(chatJid, {
                audio: resultado.buffer,
                mimetype: 'audio/mpeg',
                fileName: `${sanitizarNombre(resultado.titulo)}.mp3`,
                ptt: false
            }, { quoted: msg });

            await responder.texto(
                `╭〔 ✅ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ 🎵 *${trackInfo.titulo}*\n` +
                `┃ 👤 ${trackInfo.artista}\n` +
                `┃ ✅ Descarga completada\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
        } catch (e) {
            console.error('[SPOTIFY] Error enviando:', e.message);
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                '┃ Error al enviar el audio.\n' +
                '┃ El archivo puede ser muy grande.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }
    }
};
