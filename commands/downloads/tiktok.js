import fetch from 'node-fetch';

const YUKI_URL = 'https://api.yuki-wabot.my.id';
const YUKI_KEY = 'YukiBot-MD';

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
            const isUrl = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/)([^\s&]+)/i.test(texto);
            
            let data = null;
            let apiUsada = 'Yuki';

            if (isUrl) {
                // ─── INTENTO 1: API YUKI ───
                try {
                    const resYuki = await fetch(`${YUKI_URL}/dl/tiktok?url=${encodeURIComponent(texto)}&key=${YUKI_KEY}`);
                    if (resYuki.ok) {
                        const jsonYuki = await resYuki.json();
                        if (jsonYuki.status && jsonYuki.data) {
                            data = jsonYuki.data;
                        }
                    } else if (resYuki.status === 402) {
                        console.log('[TIKTOK] Yuki API sin créditos (402), usando respaldo...');
                    }
                } catch (e) {
                    console.log('[TIKTOK] Yuki API falló, usando respaldo:', e.message);
                }

                // ─── INTENTO 2: API TIKWM (Respaldo gratuito y estable) ───
                if (!data) {
                    apiUsada = 'TikWM (Respaldo)';
                    const resTikwm = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(texto)}`);
                    const jsonTikwm = await resTikwm.json();
                    
                    if (jsonTikwm.code === 0 && jsonTikwm.data) {
                        // Adaptar formato de TikWM al formato que espera el resto del código
                        const d = jsonTikwm.data;
                        data = {
                            title: d.title || 'Sin título',
                            duration: d.duration || 'N/A',
                            author: { nickname: d.author?.nickname || 'Desconocido', unique_id: d.author?.unique_id || '' },
                            stats: { likes: d.digg_count, comments: d.comment_count, views: d.play_count, shares: d.share_count },
                            created_at: new Date(d.create_time * 1000).toLocaleDateString('es-ES'),
                            type: d.images && d.images.length > 0 ? 'image' : 'video',
                            dl: d.images && d.images.length > 0 ? d.images : d.play
                        };
                    }
                }
            } else {
                // ─── BÚSQUEDA (Solo Yuki soporta búsqueda bien, si falla, avisa) ───
                const resYuki = await fetch(`${YUKI_URL}/search/tiktok?query=${encodeURIComponent(texto)}&key=${YUKI_KEY}`);
                if (!resYuki.ok) throw new Error(`La API de búsqueda respondió con estado ${resYuki.status} (Probablemente sin créditos).`);
                
                const jsonYuki = await resYuki.json();
                if (!jsonYuki.status || !jsonYuki.data) {
                    throw new Error('No se encontraron resultados de búsqueda.');
                }
                data = jsonYuki.data; // En búsqueda, data es un array
            }

            if (!data) {
                throw new Error('No se pudo obtener el contenido. El enlace puede ser privado o estar roto.');
            }

            // ─── PROCESAR RESPUESTA ───
            if (isUrl) {
                const { title, duration, dl, author, stats, created_at, type } = data;
                const autorNombre = author?.nickname || author?.unique_id || 'Desconocido';
                
                const caption = 
                    '╭━━〔 🎵 𝐓𝐈𝐊𝐓𝐎𝐊 𝐃𝐋 〕━━⬣\n' +
                    `┃ 📌 *Título:* ${title || 'Sin título'}\n` +
                    `┃ 👤 *Autor:* ${autorNombre}\n` +
                    `┃ ⏱️ *Duración:* ${duration || 'N/A'}\n` +
                    `┃ ❤️ *Likes:* ${(stats?.likes || 0).toLocaleString()}\n` +
                    `┃ 💬 *Comentarios:* ${(stats?.comments || 0).toLocaleString()}\n` +
                    `┃ 👁️ *Vistas:* ${(stats?.views || 0).toLocaleString()}\n` +
                    `┃ 📅 *Fecha:* ${created_at || 'N/A'}\n` +
                    `┃ ⚡ *Fuente:* ${apiUsada}\n` +
                    '╰━━━━━━━━━━━━━━━━⬣';

                if (type === 'image' || (Array.isArray(dl) && dl.length > 1)) {
                    await responder.texto('📸 Descargando carrusel de imágenes...');
                    const images = Array.isArray(dl) ? dl : [dl];
                    
                    for (let i = 0; i < images.length; i++) {
                        await sock.sendMessage(jid, {
                            image: typeof images[i] === 'string' ? { url: images[i] } : images[i],
                            caption: i === 0 ? caption : `┃ 📸 Imagen ${i + 1}/${images.length}`
                        }, { quoted: msg });
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    // Audio de fondo para carruseles (solo si usamos TikWM que lo provee fácil)
                    if (apiUsada.includes('TikWM') && data.dl_audio) {
                        await sock.sendMessage(jid, {
                            audio: { url: data.dl_audio },
                            mimetype: 'audio/mpeg',
                            ptt: false
                        }, { quoted: msg });
                    }
                } else {
                    const videoUrl = Array.isArray(dl) ? dl[0] : dl;
                    await sock.sendMessage(jid, {
                        video: typeof videoUrl === 'string' ? { url: videoUrl } : videoUrl,
                        caption: caption,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                }
            } else {
                // ─── PROCESAR BÚSQUEDA ───
                const validResults = data.filter(v => v.dl && typeof v.dl === 'string' && v.dl.startsWith('http'));
                if (validResults.length === 0) throw new Error('No se encontraron resultados descargables.');

                await responder.texto(`🔍 Se encontraron ${validResults.length} resultados. Enviando los más relevantes...`);
                
                const limit = Math.min(validResults.length, 5);
                for (let i = 0; i < limit; i++) {
                    const v = validResults[i];
                    const cap = 
                        '╭━━〔 🔍 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐄𝐀𝐑𝐂𝐇 〕━━⬣\n' +
                        `┃ 📌 *Título:* ${v.title || 'Sin título'}\n` +
                        `┃ 👤 *Autor:* ${v.author?.nickname || 'Desconocido'}\n` +
                        `┃ ⏱️ *Duración:* ${v.duration || 'N/A'}\n` +
                        `┃ ❤️ *Likes:* ${(v.stats?.likes || 0).toLocaleString()}\n` +
                        '╰━━━━━━━━━━━━━━━━⬣';

                    await sock.sendMessage(jid, {
                        video: { url: v.dl },
                        caption: cap,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });
                    
                    if (i < limit - 1) await new Promise(r => setTimeout(r, 1500));
                }
            }

            await reaccion('✅');

        } catch (error) {
            console.error('[TIKTOK] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al procesar el contenido de TikTok.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido') + '\n\n' +
                '💡 Nota: Si el enlace es correcto, la API principal puede estar saturada.'
            );
        }
    }
};