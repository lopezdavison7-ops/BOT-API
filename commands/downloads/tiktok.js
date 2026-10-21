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
                try {
                    const res = await fetch(
                        `${FAA_API}/tiktok?url=${encodeURIComponent(query)}`,
                        { headers: HEADERS, timeout: 30000 }
                    );
                    
                    const json = await res.json();
                    
                    if (json?.estado && json?.resultado) {
                        videoData = json.resultado;
                    } else {
                        throw new Error('La API no devolvió datos válidos');
                    }
                } catch (e) {
                    console.error('[TT] Descarga falló:', e.message);
                    throw new Error('No se pudo descargar el video: ' + e.message);
                }
            } else {
                // Búsqueda
                const cacheKey = query.toLowerCase();
                const cached = searchCache.get(cacheKey);

                if (cached && cached.exp > now) {
                    videoData = cached.data;
                } else {
                    try {
                        const res = await fetch(
                            `${FAA_API}/tiktok-search?q=${encodeURIComponent(query)}`,
                            { headers: HEADERS, timeout: 30000 }
                        );
                        
                        const json = await res.json();
                        
                        if (json?.estado && json?.resultado && Array.isArray(json.resultado) && json.resultado.length > 0) {
                            // Tomar el primer resultado y descargarlo
                            const primerVideo = json.resultado[0];
                            
                            // Construir URL de TikTok para descargar
                            const videoUrl = `https://www.tiktok.com/@${primerVideo.autor?.username || 'user'}/video/${primerVideo.id}`;
                            
                            const resDownload = await fetch(
                                `${FAA_API}/tiktok?url=${encodeURIComponent(videoUrl)}`,
                                { headers: HEADERS, timeout: 30000 }
                            );
                            
                            const jsonDownload = await resDownload.json();
                            
                            if (jsonDownload?.estado && jsonDownload?.resultado) {
                                videoData = jsonDownload.resultado;
                            } else {
                                throw new Error('No se pudo descargar el video de búsqueda');
                            }
                        } else {
                            throw new Error('No se encontraron resultados');
                        }
                    } catch (e) {
                        console.error('[TT] Búsqueda falló:', e.message);
                        throw new Error('No se pudo buscar videos: ' + e.message);
                    }

                    if (videoData && searchCache.size < 150) {
                        searchCache.set(cacheKey, { data: videoData, exp: now + CACHE_TTL });
                    }
                }
            }

            // Extraer información del video
            const author = videoData.autor?.nickname || videoData.autor?.username || 'Desconocido';
            const title = videoData.title || 'TikTok';
            const videoUrl = videoData.alternativas?.seleccionado || videoData.alternativas?.hd || videoData.datos;
            const audioUrl = videoData.music_info?.url;

            const formatCount = (n) => {
                if (!n && n !== 0) return '0';
                const num = Number(n) || 0;
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                return String(num);
            };

            const views = videoData.estadísticas?.vistas || videoData.stats?.views || 0;
            const likes = videoData.estadísticas?.['Me gusta'] || videoData.stats?.likes || 0;
            const comments = videoData.estadísticas?.comentario || videoData.stats?.comments || 0;

            if (!videoUrl) {
                throw new Error('La API no devolvió un video descargable');
            }

            const caption = 
                '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                `┃ 👤 *Autor:* ${author}\n` +
                `┃ 📝 *Título:* ${title.slice(0, 100)}\n` +
                `┃ 👁️ *Vistas:* ${formatCount(views)}\n` +
                `┃ ❤️ *Likes:* ${formatCount(likes)}\n` +
                `┃ 💬 *Comentarios:* ${formatCount(comments)}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣';

            // Enviar video
            await sock.sendMessage(jid, {
                video: { url: videoUrl },
                caption: caption,
                mimetype: 'video/mp4',
                fileName: `${title.slice(0, 30).replace(/[^\w\s]/g, '')}.mp4`
            }, { quoted: msg });

            // Enviar audio si está disponible
            if (audioUrl) {
                await sock.sendMessage(jid, {
                    audio: { url: audioUrl },
                    mimetype: 'audio/mpeg',
                    fileName: `${title.slice(0, 30).replace(/[^\w\s]/g, '')}.mp3`
                }, { quoted: msg });
            }

            await reaccion('✅');

        } catch (error) {
            console.error('[TIKTOK] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al procesar el contenido.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};