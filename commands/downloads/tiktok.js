import fetch from 'node-fetch';

const API_URL = 'https://api.yuki-wabot.my.id';
const API_KEY = 'YukiBot-MD';

export default {
    nombre: 'tiktok',
    categoria: 'Descargas',
    alias: ['tt', 'tiktokdl', 'tiktoksearch'],
    descripcion: 'Descarga videos o imágenes de TikTok por enlace o búsqueda.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const reaccion = async (emoji) => {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        };

        const texto = String(argumento || '').trim();

        if (!texto) {
            await reaccion('❌');
            return await responder.texto(
                '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Ingresa un enlace o término de búsqueda.\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ › .tiktok https://vm.tiktok.com/...\n' +
                '┃ › .tiktok baile trend\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        await reaccion('🕒');

        try {
            // Detectar si es URL o búsqueda
            const isUrl = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/)([^\s&]+)/i.test(texto);
            
            const endpoint = isUrl 
                ? `${API_URL}/dl/tiktok?url=${encodeURIComponent(texto)}&key=${API_KEY}`
                : `${API_URL}/search/tiktok?query=${encodeURIComponent(texto)}&key=${API_KEY}`;

            const res = await fetch(endpoint);
            if (!res.ok) throw new Error(`La API respondió con estado ${res.status}`);
            
            const json = await res.json();
            if (!json.status || !json.data) {
                throw new Error('No se encontró contenido válido o la API está caída.');
            }

            if (isUrl) {
                // ─── DESCARGA POR ENLACE ───
                const { title, duration, dl, author, stats, created_at, type } = json.data;

                if (!dl || (Array.isArray(dl) && dl.length === 0)) {
                    throw new Error('Enlace inválido o sin contenido descargable.');
                }

                const autorNombre = author?.nickname || author?.unique_id || 'Desconocido';
                const likes = (stats?.likes || 0).toLocaleString();
                const comments = (stats?.comments || 0).toLocaleString();
                const views = (stats?.views || stats?.plays || 0).toLocaleString();

                const caption = 
                    '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐃𝐋 〕━━⬣\n' +
                    `┃ 📌 *Título:* ${title || 'Sin título'}\n` +
                    `┃ 👤 *Autor:* ${autorNombre}\n` +
                    `┃ ⏱️ *Duración:* ${duration || 'N/A'}\n` +
                    `┃ ❤️ *Likes:* ${likes}\n` +
                    `┃ 💬 *Comentarios:* ${comments}\n` +
                    `┃ 👁️ *Vistas:* ${views}\n` +
                    `┃ 📅 *Fecha:* ${created_at || 'N/A'}\n` +
                    '╰━━━━━━━━━━━━━━━━⬣';

                if (type === 'image' || (Array.isArray(dl) && dl.length > 1)) {
                    // Es un carrusel de imágenes
                    await responder.texto('📸 Descargando carrusel de imágenes...');
                    
                    const images = Array.isArray(dl) ? dl : [dl];
                    for (let i = 0; i < images.length; i++) {
                        await sock.sendMessage(jid, {
                            image: { url: images[i] },
                            caption: i === 0 ? caption : `┃ 📸 Imagen ${i + 1}/${images.length}`
                        }, { quoted: msg });
                        await new Promise(r => setTimeout(r, 1000)); // Pausa de 1s entre imágenes
                    }

                    // Intentar obtener el audio de fondo del carrusel
                    try {
                        const audioRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(texto)}&hd=1`);
                        const audioJson = await audioRes.json();
                        if (audioJson?.data?.play) {
                            await sock.sendMessage(jid, {
                                audio: { url: audioJson.data.play },
                                mimetype: 'audio/mpeg',
                                ptt: false
                            }, { quoted: msg });
                        }
                    } catch (e) {
                        console.log('[TIKTOK] No se pudo obtener el audio del carrusel:', e.message);
                    }

                } else {
                    // Es un video normal
                    const videoUrl = Array.isArray(dl) ? dl[0] : dl;
                    await sock.sendMessage(jid, {
                        video: { url: videoUrl },
                        caption: caption,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                }

            } else {
                // ─── BÚSQUEDA ───
                const validResults = json.data.filter(v => v.dl && typeof v.dl === 'string' && v.dl.startsWith('http'));
                
                if (validResults.length === 0) {
                    throw new Error('No se encontraron resultados descargables para esa búsqueda.');
                }

                await responder.texto(`🔍 Se encontraron ${validResults.length} resultados. Enviando los más relevantes...`);

                // Enviar hasta 5 resultados para no saturar el chat
                const limit = Math.min(validResults.length, 5);
                for (let i = 0; i < limit; i++) {
                    const v = validResults[i];
                    const cap = 
                        '╭━━〔 🔍 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐄𝐀𝐑𝐂𝐇 〕━━⬣\n' +
                        `┃ 📌 *Título:* ${v.title || 'Sin título'}\n` +
                        `┃ 👤 *Autor:* ${v.author?.nickname || 'Desconocido'}\n` +
                        `┃ ⏱️ *Duración:* ${v.duration || 'N/A'}\n` +
                        `┃ ❤️ *Likes:* ${(v.stats?.likes || 0).toLocaleString()}\n` +
                        `┃ 🎵 *Audio:* ${v.music?.title || 'Original sound'}\n` +
                        '╰━━━━━━━━━━━━━━━━⬣';

                    await sock.sendMessage(jid, {
                        video: { url: v.dl },
                        caption: cap,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                    
                    if (i < limit - 1) {
                        await new Promise(r => setTimeout(r, 1500)); // Pausa de 1.5s entre videos
                    }
                }
            }

            await reaccion('✅');

        } catch (error) {
            console.error('[TIKTOK] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al procesar el contenido de TikTok.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};