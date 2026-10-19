import fetch from 'node-fetch';

const ANABOT_API = 'https://anabot.my.id/api';

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
            
            if (isUrl) {
                const resDownload = await fetch(`${ANABOT_API}/downloader/tiktok?url=${encodeURIComponent(texto)}`);
                
                if (!resDownload.ok) {
                    throw new Error(`API respondió con código ${resDownload.status}`);
                }

                const data = await resDownload.json();

                if (!data.success || !data.data?.result) {
                    throw new Error('La API no devolvió datos válidos');
                }

                const result = data.data.result;

                if (result.video) {
                    const caption = 
                        '╭━━〔 🎬 𝐓𝐈𝐊𝐓𝐎𝐊 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃 〕━━⬣\n' +
                        `┃ 👤 *Usuario:* ${result.username || 'Desconocido'}\n` +
                        `┃ 📝 *Descripción:* ${result.description || 'Sin descripción'}\n` +
                        '┃\n' +
                        '┃ ⚡ Fuente: AnaBot API\n' +
                        '╰━━━━━━━━━━━━━━━━⬣';

                    await sock.sendMessage(jid, {
                        video: { url: result.video },
                        caption: caption,
                        mimetype: 'video/mp4'
                    }, { quoted: msg });

                    if (result.audio) {
                        await sock.sendMessage(jid, {
                            audio: { url: result.audio },
                            mimetype: 'audio/mpeg',
                            ptt: false
                        }, { quoted: msg });
                    }
                } else if (result.image && result.image.length > 0) {
                    const caption = 
                        '╭━━〔 🖼️ 𝐓𝐈𝐊𝐓𝐎𝐊 𝐒𝐋𝐈𝐃𝐄𝐒 〕━━⬣\n' +
                        `┃ 👤 *Usuario:* ${result.username || 'Desconocido'}\n` +
                        `┃ 📝 *Descripción:* ${result.description || 'Sin descripción'}\n` +
                        `┃ 📸 *Imágenes:* ${result.image.length}\n` +
                        '┃\n' +
                        '┃ ⚡ Fuente: AnaBot API\n' +
                        '╰━━━━━━━━━━━━━━━━⬣';

                    await responder.texto(caption);

                    for (const imageUrl of result.image) {
                        await sock.sendMessage(jid, {
                            image: { url: imageUrl },
                            mimetype: 'image/jpeg'
                        }, { quoted: msg });
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    if (result.audio) {
                        await sock.sendMessage(jid, {
                            audio: { url: result.audio },
                            mimetype: 'audio/mpeg',
                            ptt: false
                        }, { quoted: msg });
                    }
                } else {
                    throw new Error('No se encontraron videos ni imágenes en el enlace');
                }
            } else {
                const resSearch = await fetch(`${ANABOT_API}/search/tiktokSearch?q=${encodeURIComponent(texto)}`);
                
                if (!resSearch.ok) {
                    throw new Error(`API de búsqueda respondió con código ${resSearch.status}`);
                }

                const data = await resSearch.json();

                if (!data.success || !data.data?.result || data.data.result.length === 0) {
                    throw new Error('No se encontraron resultados de búsqueda');
                }

                const suggestions = data.data.result.slice(0, 10);
                
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
                    '┃ ⚡ Fuente: AnaBot API\n' +
                    '╰━━━━━━━━━━━━━━━━⬣';

                await responder.texto(mensaje);
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