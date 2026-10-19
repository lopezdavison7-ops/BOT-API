import fetch from 'node-fetch';

const ALYA_API = 'https://api.alyacore.xyz';
const ALYA_KEY = 'OBOE-AERETHIX';
const TIKWM_API = 'https://www.tikwm.com/api';

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

            let url = null;
            const now = Date.now();

            if (isUrl) {
                url = query;
            } else {
                const cacheKey = query.toLowerCase();
                const cached = searchCache.get(cacheKey);

                if (cached && cached.exp > now) {
                    url = cached.url;
                } else {
                    // Intento 1: Alya API (api.alyacore.xyz)
                    try {
                        const res = await fetch(
                            `${ALYA_API}/search/tiktok?query=${encodeURIComponent(query)}&key=${ALYA_KEY}`,
                            { headers: HEADERS, timeout: 15000 }
                        );
                        if (res.ok) {
                            const text = await res.text();
                            if (!text.trim().startsWith('<')) {
                                const json = JSON.parse(text);
                                if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
                                    url = json.data[0].url || json.data[0].link || json.data[0].video_url;
                                } else if (json?.result && Array.isArray(json.result) && json.result.length > 0) {
                                    url = json.result[0].url || json.result[0].link;
                                }
                            }
                        }
                    } catch (e) {
                        console.log('[TT] Alya falló:', e.message);
                    }

                    // Intento 2: TikWM search como respaldo
                    if (!url) {
                        try {
                            const res = await fetch(
                                `${TIKWM_API}/feed/search?keywords=${encodeURIComponent(query)}&count=10`,
                                { headers: HEADERS, timeout: 15000 }
                            );
                            const text = await res.text();
                            if (!text.trim().startsWith('<')) {
                                const json = JSON.parse(text);
                                if (json?.code === 0 && json?.data?.videos?.length > 0) {
                                    const vid = json.data.videos[0];
                                    url = `https://www.tiktok.com/@${vid.author?.unique_id || 'user'}/video/${vid.video_id || vid.id}`;
                                }
                            }
                        } catch (e) {
                            console.log('[TT] TikWM search falló:', e.message);
                        }
                    }

                    if (!url) {
                        throw new Error('No se encontró ningún video para esa búsqueda. Intenta con otro término.');
                    }

                    if (searchCache.size > 150) searchCache.clear();
                    searchCache.set(cacheKey, { url, exp: now + CACHE_TTL });
                }
            }

            // Descargar usando TikWM
            let data = null;
            try {
                const res = await fetch(
                    `${TIKWM_API}/?url=${encodeURIComponent(url)}&hd=1`,
                    { headers: HEADERS, timeout: 45000 }
                );
                const text = await res.text();
                if (!text.trim().startsWith('<')) {
                    const json = JSON.parse(text);
                    if (json?.code === 0 && json?.data) {
                        data = json.data;
                    }
                }
            } catch (e) {
                console.log('[TT] TikWM download falló:', e.message);
            }

            if (!data) {
                throw new Error('La API no devolvió datos válidos.');
            }

            const author = data.author?.nickname || data.author?.fullname || data.author?.unique_id || 'Desconocido';
            const title = data.title || 'TikTok';
            const views = data.play_count;
            const likes = data.digg_count;
            const comments = data.comment_count;
            const shares = data.share_count;

            const formatCount = (n) => {
                if (!n && n !== 0) return '0';
                const num = Number(n) || 0;
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                return String(num);
            };

            // Imágenes (slideshows)
            const imageUrls = Array.isArray(data.images) 
                ? data.images.filter(img => typeof img === 'string' && /^https?:\/\//.test(img))
                : [];

            if (imageUrls.length > 0) {
                const caption = 
                    '╭━━〔 🖼️ 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐋𝐈𝐃𝐄𝐒 〕━━⬣\n' +
                    `┃ 👤 *Autor:* ${author}\n` +
                    `┃ 📝 *Título:* ${title.slice(0, 100)}\n` +
                    `┃ 👁️ *Vistas:* ${formatCount(views)}\n` +
                    `┃ ❤️ *Likes:* ${formatCount(likes)}\n` +
                    `┃ 💬 *Comentarios:* ${formatCount(comments)}\n` +
                    `┃ 📤 *Compartidos:* ${formatCount(shares)}\n` +
                    `┃ 📸 *Imágenes:* ${imageUrls.length}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣';

                for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
                    await sock.sendMessage(jid, {
                        image: { url: imageUrls[i] },
                        caption: i === 0 ? caption : '',
                        mimetype: 'image/jpeg'
                    }, { quoted: msg });
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (data.music_info?.play) {
                    await sock.sendMessage(jid, {
                        audio: { url: data.music_info.play },
                        mimetype: 'audio/mpeg',
                        fileName: `${title.slice(0, 30)}.mp3`
                    }, { quoted: msg });
                }

                await reaccion('✅');
                return;
            }

            // Video
            const videoUrl = data.hdplay || data.play || data.wmplay;
            if (!videoUrl) {
                throw new Error('La API no devolvió un video descargable.');
            }

            const caption = 
                '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n' +
                `┃ 👤 *Autor:* ${author}\n` +
                `┃ 📝 *Título:* ${title.slice(0, 100)}\n` +
                `┃ 👁️ *Vistas:* ${formatCount(views)}\n` +
                `┃ ❤️ *Likes:* ${formatCount(likes)}\n` +
                `┃ 💬 *Comentarios:* ${formatCount(comments)}\n` +
                `┃ 📤 *Compartidos:* ${formatCount(shares)}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣';

            await sock.sendMessage(jid, {
                video: { url: videoUrl },
                caption: caption,
                mimetype: 'video/mp4',
                fileName: `${title.slice(0, 30)}.mp4`
            }, { quoted: msg });

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