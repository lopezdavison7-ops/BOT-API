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
                console.log('[TT] Descarga respuesta (primeros 500):', text.slice(0, 500));
                
                const json = JSON.parse(text);
                console.log('[TT] Descarga JSON keys:', Object.keys(json));
                console.log('[TT] Descarga estado:', json.estado, typeof json.estado);
                
                // Manejar tanto true como "verdadero"
                const estadoValido = json.estado === true || json.estado === 'verdadero';
                
                if (estadoValido && json.resultado) {
                    videoData = json.resultado;
                } else {
                    throw new Error('La API no devolvió datos válidos');
                }
            } else {
                // Búsqueda
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
                    console.log('[TT] Búsqueda respuesta (primeros 500):', text.slice(0, 500));
                    
                    const json = JSON.parse(text);
                    console.log('[TT] Búsqueda JSON keys:', Object.keys(json));
                    console.log('[TT] Búsqueda estado:', json.estado, typeof json.estado);
                    console.log('[TT] Búsqueda resultado tipo:', typeof json.resultado);
                    console.log('[TT] Búsqueda resultado length:', Array.isArray(json.resultado) ? json.resultado.length : 'no es array');
                    
                    // Manejar tanto true como "verdadero"
                    const estadoValido = json.estado === true || json.estado === 'verdadero';
                    
                    if (estadoValido && json.resultado && Array.isArray(json.resultado) && json.resultado.length > 0) {
                        const primerVideo = json.resultado[0];
                        console.log('[TT] Primer video:', JSON.stringify(primerVideo).slice(0, 300));
                        
                        // Construir URL de TikTok para descargar
                        const username = primerVideo.autor?.username || primerVideo.author?.username || 'user';
                        const videoId = primerVideo.id;
                        const videoUrl = `https://www.tiktok.com/@${username}/video/${videoId}`;
                        
                        console.log('[TT] URL construida:', videoUrl);
                        
                        const resDownload = await fetch(
                            `${FAA_API}/tiktok?url=${encodeURIComponent(videoUrl)}`,
                            { headers: HEADERS, timeout: 30000 }
                        );
                        
                        const textDownload = await resDownload.text();
                        console.log('[TT] Descarga desde búsqueda (primeros 500):', textDownload.slice(0, 500));
                        
                        const jsonDownload = JSON.parse(textDownload);
                        const estadoDownloadValido = jsonDownload.estado === true || jsonDownload.estado === 'verdadero';
                        
                        if (estadoDownloadValido && jsonDownload.resultado) {
                            videoData = jsonDownload.resultado;
                        } else {
                            throw new Error('No se pudo descargar el video de búsqueda');
                        }
                    } else {
                        throw new Error('No se encontraron resultados');
                    }

                    if (videoData && searchCache.size < 150) {
                        searchCache.set(cacheKey, { data: videoData, exp: now + CACHE_TTL });
                    }
                }
            }

            // Extraer información del video
            const author = videoData.autor?.nickname || videoData.autor?.username || 
                          videoData.author?.nickname || videoData.author?.username || 'Desconocido';
            const title = videoData.title || videoData.título || 'TikTok';
            const videoUrl = videoData.alternativas?.seleccionado || videoData.alternativas?.hd || 
                            videoData.datos || videoData.url_nowm;
            const audioUrl = videoData.music_info?.url || videoData.música?.url;

            const formatCount = (n) => {
                if (!n && n !== 0) return '0';
                const str = String(n).replace(/[^\d]/g, '');
                const num = Number(str) || 0;
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                return String(num);
            };

            const stats = videoData.estadísticas || videoData.stats || {};
            const views = stats.vistas || stats.views || 0;
            const likes = stats['Me gusta'] || stats.likes || 0;
            const comments = stats.comentario || stats.comments || 0;

            if (!videoUrl) {
                console.log('[TT] videoData completo:', JSON.stringify(videoData).slice(0, 1000));
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
            console.error('[TIKTOK] Error completo:', error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al procesar el contenido.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};