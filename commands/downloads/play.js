import fetch from 'node-fetch';

const API_BUSQUEDA = 'https://noth.hidenplay.net/api/busqueda/youtube';
const API_MP3 = 'https://noth.hidenplay.net/api/descargas/ytmp3';
const API_MP4 = 'https://noth.hidenplay.net/api/descargas/ytmp4';
const API_KEY = 'nothSrEG';
const FORMATO_VIDEO = '360p';

const HEADERS = {
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

if (!global.playSessions) global.playSessions = {};

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

async function buscarYouTube(query) {
    console.log(`[PLAY] Buscando: "${query}"`);
    
    const url = `${API_BUSQUEDA}?query=${encodeURIComponent(query)}&apikey=${API_KEY}`;
    console.log(`[PLAY] URL: ${url}`);

    let res;
    try {
        res = await fetch(url, {
            headers: HEADERS,
            signal: AbortSignal.timeout(20000)
        });
    } catch (error) {
        console.error('[PLAY] Error de red:', error.message);
        throw new Error('Error de conexión con la API');
    }

    console.log(`[PLAY] Status: ${res.status}`);
    console.log(`[PLAY] Content-Type: ${res.headers.get('content-type')}`);

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`[PLAY] Respuesta de error: ${errorText.substring(0, 500)}`);
        throw new Error(`API respondió con error ${res.status}`);
    }

    let data;
    try {
        const rawText = await res.text();
        console.log(`[PLAY] Respuesta (primeros 500 chars): ${rawText.substring(0, 500)}`);
        data = JSON.parse(rawText);
    } catch (error) {
        console.error('[PLAY] Error parseando JSON:', error.message);
        throw new Error('La API no devolvió JSON válido');
    }

    console.log(`[PLAY] data.status = ${data.status}, typeof = ${typeof data.status}`);
    console.log(`[PLAY] data.data es array: ${Array.isArray(data.data)}, length: ${data.data?.length}`);

    const esExitoso = data.status === true;
    if (!esExitoso) {
        console.error('[PLAY] API no devolvió status: true');
        throw new Error(data.message || data.mensaje || 'La API respondió sin éxito');
    }

    const resultados = data.data || [];

    if (!Array.isArray(resultados) || resultados.length === 0) {
        throw new Error('No se encontraron resultados');
    }

    console.log(`[PLAY] Encontrados ${resultados.length} resultados`);

    const video = resultados.find(v => {
        const tipo = v.type || v.tipo;
        const esLive = v.isLive || v.enVivo;
        return tipo === 'video' && !esLive;
    }) || resultados[0];

    console.log(`[PLAY] Video seleccionado: ${video.title || video.título}`);

    return {
        videoId: video.videoId,
        url: video.url || `https://www.youtube.com/watch?v=${video.videoId}`,
        titulo: video.title || video.título || 'Sin título',
        thumbnail: video.image || video.imagen || video.thumbnail || video.miniatura || '',
        duracion: video.duration || video.duración || '0:00',
        vistas: video.views || video.vistas || 0,
        publicado: video.publishedAt || video.publicadoEn || 'Desconocido',
        autor: video.author?.name || video.author?.nombre || video.autor?.nombre || video.autor || 'Desconocido'
    };
}

async function descargarBuffer(url, timeoutMs = 60000) {
    console.log(`[PLAY] Descargando buffer desde: ${url.substring(0, 100)}...`);

    const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(timeoutMs)
    });

    if (!res.ok) {
        console.error(`[PLAY] Error descargando buffer: ${res.status}`);
        throw new Error(`Descarga falló: ${res.status}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    if (!buffer.length) {
        console.error('[PLAY] Buffer vacío');
        throw new Error('Buffer vacío');
    }

    console.log(`[PLAY] Buffer descargado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    return buffer;
}

async function descargarAudio(youtubeUrl) {
    console.log(`[PLAY] Obteniendo info de audio para: ${youtubeUrl}`);
    
    const url = `${API_MP3}?url=${encodeURIComponent(youtubeUrl)}&apikey=${API_KEY}`;
    console.log(`[PLAY] URL MP3: ${url}`);

    const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(25000)
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`[PLAY] Error API MP3: ${res.status} - ${errorText.substring(0, 300)}`);
        throw new Error(`API MP3 falló: ${res.status}`);
    }

    let data;
    try {
        const rawText = await res.text();
        console.log(`[PLAY] Respuesta MP3 (primeros 300 chars): ${rawText.substring(0, 300)}`);
        data = JSON.parse(rawText);
    } catch (error) {
        console.error('[PLAY] Error parseando JSON MP3:', error.message);
        throw new Error('API MP3 no devolvió JSON válido');
    }

    const esExitoso = data.status === true || data.estado === true;
    if (!esExitoso) {
        console.error('[PLAY] API MP3 no devolvió status/estado: true');
        throw new Error(data.message || data.mensaje || 'No se pudo obtener el audio');
    }

    const info = data.data || data.datos || {};

    const downloadUrl = info.download || info.descarga;
    if (!downloadUrl) {
        console.error('[PLAY] API MP3 no devolvió link de descarga');
        console.error('[PLAY] info keys:', Object.keys(info));
        throw new Error('La API no devolvió link de descarga');
    }

    console.log(`[PLAY] Link de descarga MP3 obtenido`);

    return {
        titulo: info.title || info.título || 'Sin título',
        autor: info.author || info.autor || 'Desconocido',
        thumbnail: info.image || info.imagen || '',
        downloadUrl
    };
}

async function descargarVideo(youtubeUrl, formato = FORMATO_VIDEO) {
    console.log(`[PLAY] Obteniendo info de video para: ${youtubeUrl}`);
    
    const url = `${API_MP4}?url=${encodeURIComponent(youtubeUrl)}&apikey=${API_KEY}`;
    console.log(`[PLAY] URL MP4: ${url}`);

    const res = await fetch(url, {
        headers: HEADERS,
        signal: AbortSignal.timeout(25000)
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`[PLAY] Error API MP4: ${res.status} - ${errorText.substring(0, 300)}`);
        throw new Error(`API MP4 falló: ${res.status}`);
    }

    let data;
    try {
        const rawText = await res.text();
        console.log(`[PLAY] Respuesta MP4 (primeros 300 chars): ${rawText.substring(0, 300)}`);
        data = JSON.parse(rawText);
    } catch (error) {
        console.error('[PLAY] Error parseando JSON MP4:', error.message);
        throw new Error('API MP4 no devolvió JSON válido');
    }

    const esExitoso = data.status === true || data.estado === true;
    if (!esExitoso) {
        console.error('[PLAY] API MP4 no devolvió status/estado: true');
        throw new Error(data.message || data.mensaje || 'No se pudo obtener el video');
    }

    const info = data.data || data.datos || {};

    const downloadUrl = info.download || info.descarga;
    if (!downloadUrl) {
        console.error('[PLAY] API MP4 no devolvió link de descarga');
        console.error('[PLAY] info keys:', Object.keys(info));
        throw new Error('La API no devolvió link de descarga');
    }

    console.log(`[PLAY] Link de descarga MP4 obtenido`);

    return {
        titulo: info.title || info.título || 'Sin título',
        autor: info.author || info.autor || 'Desconocido',
        thumbnail: info.image || info.imagen || '',
        formato: info.format || info.formato || formato,
        downloadUrl
    };
}

async function procesarAudio(sock, msg, video, responder) {
    try {
        await responder.texto('🎵 Descargando audio...');

        const audio = await descargarAudio(video.url);
        const buffer = await descargarBuffer(audio.downloadUrl, 60000);

        await sock.sendMessage(msg.key.remoteJid, {
            audio: buffer,
            mimetype: 'audio/mpeg'
        }, { quoted: msg });

        console.log(`[PLAY] ✅ Audio enviado exitosamente`);
    } catch (error) {
        console.error('[PLAY-AUDIO] Error completo:', error);
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

        const vid = await descargarVideo(video.url, FORMATO_VIDEO);
        const buffer = await descargarBuffer(vid.downloadUrl, 120000);

        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const titulo = vid.titulo || video.titulo;
        const autor = vid.autor || video.autor;

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(msg.key.remoteJid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${String(titulo).replace(/[^\w\s.-]/g, '').slice(0, 80)}.mp4`,
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + titulo + '*\n' +
                    '┃ 👤 ' + autor + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, {
                video: buffer,
                mimetype: 'video/mp4',
                caption:
                    '╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    '┃ 🎧 *' + titulo + '*\n' +
                    '┃ 👤 ' + autor + '\n' +
                    '┃ 📊 ' + vid.formato + ' | 📦 ' + tamañoMB + ' MB\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            }, { quoted: msg });
        }

        console.log(`[PLAY] ✅ Video enviado exitosamente`);
    } catch (error) {
        console.error('[PLAY-VIDEO] Error completo:', error);
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
    uso: '.play <nombre>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const query = String(argumento || '').trim();
        const sender = msg.key.participant || msg.key.remoteJid;

        if (!query) {
            return await responder.texto(
                '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe el nombre\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .play twice fancy\n' +
                '┃ ➪ .play bad bunny\n' +
                '┃ ➪ .play hola\n' +
                '┃\n' +
                '┃ 🎯 Elige con botones o\n' +
                '┃    responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        try {
            const video = await buscarYouTube(query);

            global.playSessions[sender] = {
                jid,
                video,
                timestamp: Date.now(),
                msgQuoted: msg
            };

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
                '┃\n' +
                '┣━━〔 🎯 𝐄𝐋𝐈𝐆𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 📲 Presiona el botón\n' +
                '┃    o responde *1* o *2*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            const botones = [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'playaudio' })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'playvideo' })
                }
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
            console.error('[PLAY] Error completo:', error);
            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n' +
                '┃\n' +
                '┃ 💡 Revisa los logs del bot\n' +
                '┃    para más detalles\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};

export { procesarAudio, procesarVideo };