import fetch from 'node-fetch';

const ANABOT_API = 'https://anabot.my.id/api';
const ANABOT_KEY = 'Alex30';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
};

function buscarUrlVideo(obj, profundidad = 0) {
    if (!obj || profundidad > 6) return null;
    if (typeof obj === 'string') {
        if (/^https?:\/\/\S+$/i.test(obj) && (/\.mp4/i.test(obj) || /tiktokcdn/.test(obj) || /video/i.test(obj)) && !/\.jpe?g|\.png|\.webp/i.test(obj)) {
            return obj;
        }
        return null;
    }
    if (Array.isArray(obj)) {
        for (const item of obj) {
            const r = buscarUrlVideo(item, profundidad + 1);
            if (r) return r;
        }
        return null;
    }
    if (typeof obj === 'object') {
        const claves = ['play', 'noWatermark', 'nowatermark', 'download', 'watermark', 'playAddr', 'play_addr', 'video', 'url'];
        for (const k of claves) {
            if (obj[k]) {
                const r = buscarUrlVideo(obj[k], profundidad + 1);
                if (r) return r;
            }
        }
        for (const k of Object.keys(obj)) {
            const r = buscarUrlVideo(obj[k], profundidad + 1);
            if (r) return r;
        }
    }
    return null;
}

function buscarCampo(obj, claves, profundidad = 0) {
    if (!obj || profundidad > 5 || typeof obj !== 'object') return null;
    for (const k of claves) {
        if (obj[k] && typeof obj[k] === 'string') return obj[k];
    }
    for (const k of Object.keys(obj)) {
        const r = buscarCampo(obj[k], claves, profundidad + 1);
        if (r) return r;
    }
    return null;
}

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

            if (isUrl) {
                try {
                    const resAna = await fetch(`${ANABOT_API}/download/tiktok?url=${encodeURIComponent(texto)}&apikey=${ANABOT_KEY}`, { headers: HEADERS });
                    if (resAna.ok) {
                        const jsonAna = await resAna.json();
                        if (jsonAna.success && jsonAna.data?.result) {
                            data = jsonAna.data.result;
                        }
                    }
                } catch (e) {
                    console.log('[TIKTOK] AnaBot falló:', e.message);
                }

                if (!data || (!data.video && !(data.image && data.image.length))) {
                    try {
                        const resTikwm = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(texto)}`, { headers: HEADERS });
                        const txt = await resTikwm.text();
                        if (txt.trim().startsWith('{')) {
                            const jsonTikwm = JSON.parse(txt);
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
                        }
                    } catch (e) {
                        console.log('[TIKTOK] TikWM URL falló:', e.message);
                    }
                }
            } else {
                const endpoints = [
                    `https://www.tikwm.com/api/feed/search?keywords=${encodeURIComponent(texto)}&count=5`,
                    `https://tikwm.com/api/feed/search?keywords=${encodeURIComponent(texto)}&count=5`,
                    `https://api.tiklydown.eu.org/api/search/video?query=${encodeURIComponent(texto)}`,
                    `https://api.tiklydown.me/api/search/video?query=${encodeURIComponent(texto)}`
                ];

                for (const endpoint of endpoints) {
                    if (data) break;
                    try {
                        const res = await fetch(endpoint, { headers: HEADERS });
                        const txt = await res.text();
                        if (!txt.trim().startsWith('{') && !txt.trim().startsWith('[')) continue;
                        const json = JSON.parse(txt);

                        const urlVideo = buscarUrlVideo(json);
                        if (urlVideo) {
                            data = {
                                username: buscarCampo(json, ['nickname', 'unique_id', 'uniqueId']) || 'Desconocido',
                                description: buscarCampo(json, ['title', 'description']) || `Resultados de: ${texto}`,
                                video: urlVideo,
                                audio: null,
                                image: []
                            };
                        }
                    } catch (e) {
                        console.log('[TIKTOK] Búsqueda falló:', e.message);
                    }
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
                    '╭━━〔 🖼️ 𝐈𝐊𝐓𝐎𝐊 𝐒𝐋𝐈𝐃𝐄𝐒 〕━━⬣\n' +
                    `┃ 👤 *Usuario:* ${data.username || 'Desconocido'}\n' +
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