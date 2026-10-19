import fetch from 'node-fetch';

const ANABOT_API = 'https://anabot.my.id/api';
const ANABOT_KEY = ''; // Pon tu apikey aquí si compraste una

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
            let apiUsada = '';

            if (isUrl) {
                // Intento 1: AnaBot (si hay apikey)
                if (ANABOT_KEY) {
                    try {
                        const resAna = await fetch(`${ANABOT_API}/download/tiktok?url=${encodeURIComponent(texto)}&apikey=${ANABOT_KEY}`);
                        if (resAna.ok) {
                            const jsonAna = await resAna.json();
                            if (jsonAna.success && jsonAna.data?.result) {
                                data = jsonAna.data.result;
                                apiUsada = 'AnaBot';
                            }
                        }
                    } catch (e) {
                        console.log('[TIKTOK] AnaBot falló:', e.message);
                    }
                }

                // Intento 2: TikWM (gratuito)
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
                            apiUsada = 'TikWM';
                        }
                    } catch (e) {
                        console.log('[TIKTOK] TikWM falló:', e.message);
                    }
                }

                if (!data) {
                    throw new Error('Todas las APIs fallaron. El enlace puede ser privado o estar roto.');
                }

                if (data.video) {
                    const caption = 
                        '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 〕━━⬣\n' +
                        `┃ 👤 *Usuario:* ${data.username || 'Desconocido'}\n` +
                        `┃ 📝 *Descripción:* ${data.description || 'Sin descripción'}\n` +
                        '┃\n' +
                        `┃ ⚡ Fuente: ${apiUsada}\n` +
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
                        '╭━━〔 🖼️ 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐋𝐈𝐃𝐄𝐒 〕━━⬣\n' +
                        `┃ 👤 *Usuario:* ${data.username || 'Desconocido'}\n` +
                        `┃ 📝 *Descripción:* ${data.description || 'Sin descripción'}\n` +
                        `┃ 📸 *Imágenes:* ${data.image.length}\n` +
                        '┃\n' +
                        `┃ ⚡ Fuente: ${apiUsada}\n` +
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
                    throw new Error('No se encontraron videos ni imágenes en el enlace');
                }
            } else {
                // Búsqueda
                if (ANABOT_KEY) {
                    try {
                        const resSearch = await fetch(`${ANABOT_API}/search/tiktokSearch?username=${encodeURIComponent(texto)}&apikey=${ANABOT_KEY}`);
                        if (resSearch.ok) {
                            const dataSearch = await resSearch.json();
                            if (dataSearch.success && dataSearch.data?.result) {
                                const suggestions = dataSearch.data.result.slice(0, 10);
                                
                                let mensaje = 
                                    '╭━━〔 🔍 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐄𝐀𝐑𝐂𝐇 〕━━⬣\n' +
                                    '┃\n' +
                                    `┃ 📝 Búsqueda: *${texto}*\n` +
                                    '┃\n' +
                                    '┃ 💡 Sugerencias encontradas:\n';

                                suggestions.forEach((item, index) => {
                                    mensaje += `┃ ${index + 1}. ${item.content}\n`;
                                });

                                mensaje += 
                                    '┃\n' +
                                    '┃ 📌 Para descargar, usa:\n' +
                                    '┃ › .tiktok <enlace completo>\n' +
                                    '┃\n' +
                                    '┃ ⚡ Fuente: AnaBot\n' +
                                    '╰━━━━━━━━━━━━━━━━⬣';

                                await responder.texto(mensaje);
                                await reaccion('✅');
                                return;
                            }
                        }
                    } catch (e) {
                        console.log('[TIKTOK] Búsqueda AnaBot falló:', e.message);
                    }
                }

                throw new Error('La búsqueda requiere API key de AnaBot. Usa un enlace completo para descargar.');
            }

            await reaccion('✅');

        } catch (error) {
            console.error('[TIKTOK] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al procesar el contenido de TikTok.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido') + '\n\n' +
                '💡 Nota: Si el enlace es correcto, la API puede estar saturada.'
            );
        }
    }
};