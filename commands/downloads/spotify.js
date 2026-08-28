// commands/downloads/spotify.js
// ============================================================
// COMANDO: SPOTIFY
// BOT-API
//
// Descarga música de Spotify/YouTube en formato MP3.
// Usa Cobalt API (api.cobalt.tools) como downloader principal.
//
// Uso:
//   .spotify <url de spotify>
//   .spotify <nombre de canción>
//   .spotify <url de playlist>
// ============================================================

import axios from 'axios';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const COBALT_API = 'https://api.cobalt.tools';
const SPOTIFYDOWN_API = 'https://api.spotifydown.com';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const COBALT_HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

const SPOTIFYDOWN_HEADERS = {
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
    const match = url.match(/(?:track|playlist|album)[/:]([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
}

function extraerTipoUrl(url) {
    if (url.includes('playlist')) return 'playlist';
    if (url.includes('album')) return 'album';
    return 'track';
}

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

// ============================================================
// METADATOS SPOTIFY (oEmbed — API pública, sin auth)
// ============================================================

async function obtenerOembed(trackId) {
    try {
        const res = await axios.get(
            `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
            { headers: { 'User-Agent': USER_AGENT }, timeout: 10000 }
        );
        const data = res.data;
        const partes = String(data.title || '').split(' - ');
        return {
            titulo: partes[0] || 'Desconocido',
            artista: partes[1] || 'Desconocido',
            imagen: data.thumbnail_url || null,
            exito: true
        };
    } catch (e) {
        console.error('[SPOTIFY oEmbed] Error:', e.message);
        return { exito: false };
    }
}

// ============================================================
// BÚSQUEDA EN YOUTUBE (para búsqueda por nombre)
// ============================================================

async function buscarEnYouTube(query) {
    try {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ==`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 15000
        });
        const html = res.data;

        let videoId = null;

        const match1 = html.match(/"videoRenderer":\{"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match1) videoId = match1[1];

        if (!videoId) {
            const match2 = html.match(/var ytInitialData = (.+?);<\/script>/);
            if (match2) {
                try {
                    const data = JSON.parse(match2[1]);
                    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
                    if (contents && Array.isArray(contents)) {
                        for (const section of contents) {
                            const items = section?.itemSectionRenderer?.contents;
                            if (items && Array.isArray(items)) {
                                for (const item of items) {
                                    if (item.videoRenderer) {
                                        videoId = item.videoRenderer.videoId;
                                        break;
                                    }
                                }
                            }
                            if (videoId) break;
                        }
                    }
                } catch (e) {}
            }
        }

        if (!videoId) {
            const match3 = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            if (match3) videoId = match3[1];
        }

        if (!videoId) return null;

        let titulo = query;
        const titleMatch = html.match(/"title":\{"runs":\[\{"text":"([^"]+)"\}\]/);
        if (titleMatch) titulo = titleMatch[1];

        return { videoId, titulo };
    } catch (e) {
        console.error('[YOUTUBE SEARCH] Error:', e.message);
        return null;
    }
}

// ============================================================
// COBALT API — DOWNLOADER PRINCIPAL
// ============================================================

async function descargarConCobalt(youtubeUrl, modo = 'audio') {
    try {
        const body = {
            url: youtubeUrl,
            downloadMode: modo,
            audioFormat: 'mp3',
            audioBitrate: '128',
            filenameStyle: 'pretty',
            disableMetadata: false
        };

        const res = await axios.post(`${COBALT_API}/`, body, {
            headers: COBALT_HEADERS,
            timeout: 30000
        });

        const data = res.data;

        if (data.status === 'error') {
            return { exito: false, error: data.text || 'Error de Cobalt' };
        }

        if (data.url) {
            const buffer = await descargarBuffer(data.url);
            if (buffer) {
                return {
                    exito: true,
                    buffer,
                    titulo: data.filename || 'audio'
                };
            }
        }

        if (data.status === 'tunnel') {
            const tunnelUrl = `${COBALT_API}${data.url}`;
            const buffer = await descargarBuffer(tunnelUrl);
            if (buffer) {
                return {
                    exito: true,
                    buffer,
                    titulo: data.filename || 'audio'
                };
            }
        }

        return { exito: false, error: 'Respuesta inesperada de Cobalt.' };
    } catch (e) {
        console.error('[COBALT] Error:', e.message);
        return { exito: false, error: `Cobalt: ${e.message}` };
    }
}

async function descargarBuffer(url) {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': USER_AGENT },
            timeout: 60000,
            maxContentLength: 50 * 1024 * 1024
        });
        return Buffer.from(res.data);
    } catch (e) {
        console.error('[DOWNLOAD BUFFER] Error:', e.message);
        return null;
    }
}

// ============================================================
// SPOTIFYDOWN PIPELINE
// ============================================================

async function obtenerYoutubeId(trackId) {
    try {
        const res = await axios.get(`${SPOTIFYDOWN_API}/getId/${trackId}`, {
            headers: SPOTIFYDOWN_HEADERS,
            timeout: 15000
        });
        return res.data?.id || null;
    } catch (e) {
        console.error('[SPOTIFYDOWN getId] Error:', e.message);
        return null;
    }
}

async function obtenerTracklist(tipo, id) {
    try {
        const url = `${SPOTIFYDOWN_API}/trackList/${tipo}/${id}`;
        const res = await axios.get(url, {
            headers: SPOTIFYDOWN_HEADERS,
            timeout: 15000
        });
        return res.data?.trackList || [];
    } catch (e) {
        console.error('[SPOTIFYDOWN trackList] Error:', e.message);
        return [];
    }
}

// ============================================================
// DESCARGA DESDE SPOTIFY URL
// ============================================================

async function descargarDesdeSpotify(trackId, metadatos = null) {
    const youtubeId = await obtenerYoutubeId(trackId);
    if (!youtubeId) {
        return { exito: false, error: 'No se pudo resolver el track en YouTube.' };
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const resultado = await descargarConCobalt(youtubeUrl, 'audio');
    if (resultado.exito) {
        resultado.titulo = metadatos
            ? `${metadatos.artista} - ${metadatos.titulo}`
            : resultado.titulo;
        resultado.info = metadatos;
    }

    return resultado;
}

// ============================================================
// DESCARGA DESDE YOUTUBE DIRECTO
// ============================================================

async function descargarDesdeYouTube(videoId, titulo = 'Audio') {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const resultado = await descargarConCobalt(youtubeUrl, 'audio');
    if (resultado.exito) {
        resultado.titulo = titulo;
    }
    return resultado;
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
        'Descarga música de Spotify/YouTube en MP3. Uso: .spotify <url> | .spotify <nombre>',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const chatJid = msg.key.remoteJid;

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

        // -------------------------------------------------------
        // MODO URL DE SPOTIFY
        // -------------------------------------------------------

        if (esUrlSpotify(input)) {
            const spotifyId = extraerSpotifyId(input);
            const tipo = extraerTipoUrl(input);

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

            // === TRACK INDIVIDUAL ===
            if (tipo === 'track') {
                const metadatos = await obtenerOembed(spotifyId);
                const tituloDisplay = metadatos.exito
                    ? `${metadatos.artista} - ${metadatos.titulo}`
                    : 'Track de Spotify';

                await responder.texto(
                    `╭〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                    `┃\n` +
                    `┃ 🎤 *${tituloDisplay}*\n` +
                    `┃ ⏳ Descargando audio...\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━⬣`
                );

                const resultado = await descargarDesdeSpotify(spotifyId, metadatos.exito ? metadatos : null);

                if (!resultado.exito) {
                    await responder.texto(
                        `╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                        `┃\n` +
                        `┃ No se pudo descargar.\n` +
                        `┃ 📝 ${resultado.error}\n` +
                        `┃\n` +
                        `┃ 💡 Intenta con otro link o nombre.\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━⬣`
                    );
                    return;
                }

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
                        `┃ 🎵 *${tituloDisplay}*\n` +
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
                return;
            }

            // === PLAYLIST / ALBUM ===
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
                    titulo: t.title || t.name || 'Desconocido',
                    artista: t.artists || 'Desconocido'
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

                    const resultado = await descargarDesdeSpotify(info.id, info);
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
        // MODO BÚSQUEDA POR NOMBRE (YouTube)
        // -------------------------------------------------------

        await responder.texto(
            `╭〔 🔍 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
            `┃\n` +
            `┃ Buscando: *${input}*\n` +
            `┃ 🔎 En YouTube...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        const busqueda = await buscarEnYouTube(input);
        if (!busqueda) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n' +
                '┃\n' +
                '┃ No se encontró la canción en YouTube.\n' +
                '┃ Intenta con otro nombre o URL de Spotify.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        await responder.texto(
            `╭〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
            `┃\n` +
            `┃ 🎤 *${busqueda.titulo}*\n` +
            `┃ ⏳ Descargando audio...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        const resultado = await descargarDesdeYouTube(busqueda.videoId, busqueda.titulo);

        if (!resultado.exito) {
            await responder.texto(
                `╭〔 ❌ 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 〕⬣\n` +
                `┃\n` +
                `┃ No se pudo descargar.\n` +
                `┃ 📝 ${resultado.error}\n` +
                `┃\n` +
                `┃ 💡 Intenta con otro nombre o URL.\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
            return;
        }

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
                `┃ 🎵 *${busqueda.titulo}*\n` +
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
