import fetch from 'node-fetch';

const ANABOT_API = 'https://anabot.my.id/api';
const ANABOT_KEY = 'Alex30';

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
                '╭━━〔 🎵 𝐓𝐊𝐓𝐎𝐊 〕━━⬣\n' +
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

            if (isUrl) {
                // Descarga directa por URL
                try {
                    const resAna = await fetch(`${ANABOT_API}/download/tiktok?url=${encodeURIComponent(texto)}&apikey=${ANABOT_KEY}`);
                    if (resAna.ok) {
                        const jsonAna = await resAna.json();
                        if (jsonAna.success && jsonAna.data?.result) {
                            data = jsonAna.data.result;
                        }
                    }
                } catch (e) {
                    console.log('[TIKTOK] AnaBot falló:', e.message);
                }

                if (!data) {
                    try {
                        const resTikwm = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(texto)}`);
                        const jsonTikwm = await resTikwm.json();
                        if (jsonTikwm.code === 0 && jsonTikwm.data) {
                            const d = jsonTikwm.data;
                            data = {
                                username: d.author?.nickname || 'Desconocido',
                                description: d.title || 'Sin descripción',
                                video: d.play,
                                audio: d.music,
                                image: d.images || []
                            };
                        }
                    } catch (e) {
                        console.log('[TIKTOK] TikWM falló:', e.message);
                    }
                }
            } else {
                // Búsqueda: usar TikWM search que devuelve videos reales
                try {
                    const resSearch = await fetch(`https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(texto)}&count=5`);
                    const jsonSearch = await resSearch.json();

                    if (jsonSearch.code === 0 && jsonSearch.data?.videos && jsonSearch.data.videos.length > 0) {
                        const primerVideo = jsonSearch.data.videos[0];
                        
                        data = {
                            username: primerVideo.author?.nickname || 'Desconocido',
                            description: primerVideo.title || 'Sin descripción',
                            video: primerVideo.play,
                            audio: primerVideo.music_info?.play,
                            image: primerVideo.images || []
                        };
                    }
                } catch (e) {
                    console.log('[TIKTOK] Búsqueda TikWM falló:', e.message);
                }
            }

            if (!data) {
                throw new Error('No se encontraron resultados. Intenta con otro término o verifica el enlace.');
            }

            if (data.video) {
                const caption = 
                    '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 〕━━⬣\n' +
                    `┃ 👤 *Usuario:* ${data.username || 'Desconocido'}\n` +
                    `┃ 📝 *Descripción:* ${data.description || 'Sin descripción'}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣';

                await sock.sendMessage(jid, {
                    video: { url: data.video },
                    caption: caption,
                    mimetype: 'video/mp4'
                }, { quoted: msg });

                if (data.audio) {
                    await sock.sendMessage(jid, {
                        audio: { url: data.audio },
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: msg });
                }
            } else if (data.image && data.image.length > 0) {
                const caption = 
                    '╭━━〔 🖼️ 𝐓𝐈𝐓𝐎𝐊 𝐒𝐋𝐈𝐃𝐄𝐒 〕━━⬣\n' +
                    `┃ 👤 *Usuario:* ${data.username || 'Desconocido'}\n` +
                    `┃ 📝 *Descripción:* ${data.description || 'Sin descripción'}\n` +
                    `┃ 📸 *Imágenes:* ${data.image.length}\n` +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣';

                await responder.texto(caption);

                for (const imageUrl of data.image) {
                    await sock.sendMessage(jid, {
                        image: { url: imageUrl },
                        mimetype: 'image/jpeg'
                    }, { quoted: msg });
                    await new Promise(r => setTimeout(r, 1000));
                }

                if (data.audio) {
                    await sock.sendMessage(jid, {
                        audio: { url: data.audio },
                        mimetype: 'audio/mpeg',
                        ptt: false
                    }, { quoted: msg });
                }
            } else {
                throw new Error('No se encontraron videos ni imágenes.');
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