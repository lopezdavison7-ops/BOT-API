

const API = 'https://api.delirius.online/download/instagram?url=';
const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) ' +
    'Chrome/133.0.0.0 Safari/537.36';

async function descargarBuffer(url) {
    const res = await fetch(url, { headers: { 'user-agent': UA } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Archivo vacío');
    return buffer;
}

function esVideo(item) {
    const tipo = String(item.type || item.tipo || '').toLowerCase();
    if (tipo) return /video|vídeo/.test(tipo);

    return /\.mp4(\?|$)/i.test(item.url || '');
}

export default {
    nombre: 'instagram',
    categoria: 'descargas',
    alias: ['ig', 'igdl', 'instadl', 'insta'],
    descripcion: 'Descarga fotos o videos de Instagram',
    uso: '.ig <url de la publicación>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const url = String(argumento || '').trim();

        if (!url) {
            return await responder.texto(
                '╭━━〔 📸 𝐈𝐍𝐒𝐓𝐀𝐆𝐑𝐀𝐌 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la URL de la publicación\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .ig https://instagram.com/p/...\n' +
                '┃ • .ig https://instagram.com/reel/...\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!/instagram\.com|instagr\.am/i.test(url)) {
            return await responder.texto('❌ La URL debe ser de *Instagram*');
        }

        try {

            const res = await fetch(API + encodeURIComponent(url));
            const json = await res.json();

            const datos = json.data || json.datos;

            if (!json.status || !Array.isArray(datos) || datos.length === 0) {
                return await responder.texto(
                    '❌ No se pudo procesar el enlace.\nVerifica que sea una publicación pública.'
                );
            }

            const items = datos.filter(i => i?.url);
            if (!items.length) {
                return await responder.texto('❌ La publicación no tiene archivos descargables.');
            }

            if (items.length > 1) {
                await responder.texto('⏳ Descargando *' + items.length + '* archivos de Instagram...');
            }

            const resultados = await Promise.allSettled(
                items.map(i => descargarBuffer(i.url))
            );

            const archivos = [];
            resultados.forEach((r, i) => {
                if (r.status === 'fulfilled') {
                    archivos.push({ buffer: r.value, video: esVideo(items[i]) });
                } else {
                    console.error(`[IG] Falló archivo ${i + 1}:`, r.reason?.message || r.reason);
                }
            });

            if (!archivos.length) {
                throw new Error('No pude descargar ningún archivo');
            }

            const imagenes = archivos.filter(a => !a.video).map(a => a.buffer);
            const videos = archivos.filter(a => a.video).map(a => a.buffer);

            if (imagenes.length > 1) {

                try {
                    await s.sendMessage(
                        chatJid,
                        { album: imagenes.map(b => ({ image: b })) },
                        { quoted: msg }
                    );
                } catch (errorAlbum) {
                    console.error('[IG] Álbum falló:', errorAlbum?.message || errorAlbum);
                    for (const b of imagenes) {
                        try {
                            await s.sendMessage(chatJid, { image: b }, { quoted: msg });
                        } catch {}
                    }
                }
            } else if (imagenes.length === 1) {
                await s.sendMessage(
                    chatJid,
                    { image: imagenes[0], caption: '📥 *Instagram*' },
                    { quoted: msg }
                );
            }

            for (let i = 0; i < videos.length; i++) {
                try {
                    await s.sendMessage(
                        chatJid,
                        {
                            video: videos[i],
                            caption: i === 0 ? '📥 *Instagram*' : undefined
                        },
                        { quoted: msg }
                    );
                } catch (e) {
                    console.error('[IG] Error enviando video:', e?.message || e);
                }
            }

        } catch (error) {
            console.error('[IG] Error:', error?.message || error);
            await responder.texto('❌ Error: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};