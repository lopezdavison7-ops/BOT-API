import fetch from 'node-fetch';

const FAA_API = 'https://api-faa.my.id/faa';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9'
};

const searchCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export default {
    nombre: 'tiktok',
    categoria: 'Descargas',
    alias: ['tt', 'tk', 'ttv', 'tiktokdl', 'tiktoksearch'],
    descripcion: 'Busca y descarga videos de TikTok por texto o enlace.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const reaccion = async (emoji) => {
            try {
                await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
            } catch {}
        };

        const query = String(argumento || '').trim();

        if (!query) {
            await reaccion('❌');
            return await responder.texto(
                '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Proporciona una búsqueda o enlace.\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ › .tt https://vm.tiktok.com/...\n' +
                '┃ › .tt baile trend\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        await reaccion('⏳');

        try {
            const isUrl = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/)([^\s&]+)/i.test(query);

            let videoData = null;
            const now = Date.now();

            if (isUrl) {
                // Descarga directa por URL
                const res = await fetch(
                    `${FAA_API}/tiktok?url=${encodeURIComponent(query)}`,
                    { headers: HEADERS, timeout: 30000 }
                );
                
                const text = await res.text();
                const json = JSON.parse(text);
                
                console.log('[TT] Descarga keys:', Object.keys(json));
                console.log('[TT] Result keys:', json.result ? Object.keys(json.result) : 'no result');
                
                if (json.status && json.result) {
                    videoData = json.result;
                } else if (json.estado && json.resultado) {
                    videoData = json.resultado;
                } else {
                    throw new Error('La API no devolvió datos válidos');
                }
                
                // Extraer información de descarga
                const authorData = videoData.author || videoData.autor || {};
                const author = authorData.nickname || authorData.apodo || authorData.username || 'Desconocido';
                const title = videoData.title || videoData.título || 'TikTok';
                
                // Intentar múltiples campos de video
                const videoUrl = videoData.alternativas?.seleccionado || 
                                videoData.alternativas?.hd || 
                                videoData.datos || 
                                videoData.data ||
                                videoData.urlnowm ||
                                videoData.url_nowm ||
                                videoData.play ||
                                videoData.hdplay;
                
                const musicData = videoData.music_info || videoData.música || {};
                const audioUrl = musicData.url || videoData.music || videoData.audio;

                if (!videoUrl) {
                    console.log('[TT] videoData completo:', JSON.stringify(videoData).slice(0, 1000));
                    throw new Error('No se pudo extraer la URL del video');
                }

                const stats = videoData.estadísticas || videoData.stats || videoData.statistics || {};
                const views = stats.vistas || stats.views || stats.view_count || 0;
                const likes = stats['Me gusta'] || stats.likes || stats.like_count || 0;
                const comments = stats.comentario || stats.comments || stats.comment_count || 0;

                const formatCount = (n) => {
                    if (!n && n !== 0) return '0';
                    const str = String(n).replace(/[^\d]/g, '');
                    const num = Number(str) || 0;
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                    return String(num);
                };

                const caption = 
                    '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    `┃ 👤 *Autor:* ${author}\n` +
                    `┃ 📝 *Título:* ${title.slice(0, 100)}\n` +
                    `┃ 👁️ *Vistas:* ${formatCount(views)}\n` +
                    `┃ ❤️ *Likes:* ${formatCount(likes)}\n` +
                    `┃ 💬 *Comentarios:* ${formatCount(comments)}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣';

                await sock.sendMessage(jid, {
                    video: { url: videoUrl },
                    caption: caption,
                    mimetype: 'video/mp4',
                    fileName: `${title.slice(0, 30).replace(/[^\w\s]/g, '')}.mp4`
                }, { quoted: msg });

                if (audioUrl) {
                    await sock.sendMessage(jid, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mpeg',
                        fileName: `${title.slice(0, 30).replace(/[^\w\s]/g, '')}.mp3`
                    }, { quoted: msg });
                }

            } else {
                // Búsqueda - usar directamente urlnowm del primer resultado
                const cacheKey = query.toLowerCase();
                const cached = searchCache.get(cacheKey);

                if (cached && cached.exp > now) {
                    videoData = cached.data;
                } else {
                    const res = await fetch(
                        `${FAA_API}/tiktok-search?q=${encodeURIComponent(query)}`,
                        { headers: HEADERS, timeout: 30000 }
                    );
                    
                    const text = await res.text();
                    const json = JSON.parse(text);
                    
                    console.log('[TT] Búsqueda keys:', Object.keys(json));
                    
                    const resultArray = json.result || json.resultado;
                    
                    if ((json.status || json.estado) && resultArray && Array.isArray(resultArray) && resultArray.length > 0) {
                        videoData = resultArray[0];
                        console.log('[TT] Primer video keys:', Object.keys(videoData));
                        console.log('[TT] urlnowm:', videoData.urlnowm ? 'ENCONTRADO' : 'NO ENCONTRADO');
                    } else {
                        throw new Error('No se encontraron resultados');
                    }

                    if (videoData && searchCache.size < 150) {
                        searchCache.set(cacheKey, { data: videoData, exp: now + CACHE_TTL });
                    }
                }

                // Extraer información de búsqueda
                const authorData = videoData.author || videoData.autor || {};
                const author = authorData.nickname || authorData.apodo || authorData.username || 'Desconocido';
                const title = videoData.title || videoData.título || 'TikTok';
                const videoUrl = videoData.urlnowm || videoData.url_nowm;
                const audioUrl = videoData.music?.url || videoData.música?.url;

                if (!videoUrl) {
                    console.log('[TT] videoData de búsqueda:', JSON.stringify(videoData).slice(0, 1000));
                    throw new Error('No se pudo extraer la URL del video de búsqueda');
                }

                const stats = videoData.estadísticas || videoData.stats || videoData.statistics || {};
                const views = stats.vistas || stats.views || stats.view_count || 0;
                const likes = stats['Me gusta'] || stats.likes || stats.like_count || 0;
                const comments = stats.comentario || stats.comments || stats.comment_count || 0;

                const formatCount = (n) => {
                    if (!n && n !== 0) return '0';
                    const str = String(n).replace(/[^\d]/g, '');
                    const num = Number(str) || 0;
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                    return String(num);
                };

                const caption = 
                    '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                    `┃ 👤 *Autor:* ${author}\n` +
                    `┃ 📝 *Título:* ${title.slice(0, 100)}\n` +
                    `┃ 👁️ *Vistas:* ${formatCount(views)}\n` +
                    `┃ ❤️ *Likes:* ${formatCount(likes)}\n` +
                    `┃ 💬 *Comentarios:* ${formatCount(comments)}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣';

                await sock.sendMessage(jid, {
                    video: { url: videoUrl },
                    caption: caption,
                    mimetype: 'video/mp4',
                    fileName: `${title.slice(0, 30).replace(/[^\w\s]/g, '')}.mp4`
                }, { quoted: msg });

                if (audioUrl) {
                    await sock.sendMessage(jid, {
                        audio: { url: audioUrl },
                        mimetype: 'audio/mpeg',
                        fileName: `${title.slice(0, 30).replace(/[^\w\s]/g, '')}.mp3`
                    }, { quoted: msg });
                }
            }

            await reaccion('✅');

        } catch (error) {
            console.error('[TIKTOK] Error completo:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al procesar el contenido.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};