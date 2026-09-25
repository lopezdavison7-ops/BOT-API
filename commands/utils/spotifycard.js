

import fetch from 'node-fetch';

const API = 'https://api.siputzx.my.id/api/canvas/spotify';
const IMG_DEFAULT = 'https://i.ibb.co/1s8T3sY/48f7ce63c7aa.jpg';

function bold(t) {
    return String(t).replace(/[A-Za-z]/g, c =>
        String.fromCodePoint((c <= 'Z' ? 0x1D400 - 65 : 0x1D41A - 97) + c.charCodeAt(0))
    );
}

function fmtMs(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return m + ':' + ss;
}

export default {
    nombre: 'spotifycard',
    categoria: 'utils',
    alias: ['spotcard', 'scard', 'spotifyplay', 'spotifycard'],
    descripcion: 'Genera una tarjeta estilo Spotify reproduciendo ahora',
    uso: '.spotifycard título | artista | [url_imagen] | [#color]',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const partes = (argumento || '').split('|').map(s => s.trim());
        const title = partes[0] || '';
        let artist = partes[1] || 'Artista desconocido';
        let image = partes[2] || '';
        let border = partes[3] || '#1DB954';

        if (!title) {
            return await responder.texto(
                '╭━━〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ ➪ .spotifycard título | artista\n' +
                '┃ ➪ .spotifycard título | artista | url_imagen\n' +
                '┃ ➪ .spotifycard título | artista | url_imagen | #color\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ ➪ .spotifycard Blinding Lights | The Weeknd\n' +
                '┃ ➪ .spotifycard Tití Me Preguntó | Bad Bunny | https://i.imgur.com/foto.jpg | #ff0000\n' +
                '┃\n' +
                '┃ 🎨 Colores: cualquier HEX (#1DB954 verde Spotify)\n' +
                '┃ ⏱️ El progreso de reproducción es automático\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (title.length > 60) return await responder.texto('❌ Título muy largo (máx 60 caracteres).');
        if (artist.length > 60) return await responder.texto('❌ Artista muy largo (máx 60 caracteres).');

        if (image && image.startsWith('#')) {
            border = image;
            image = '';
        }
        if (image && !/^https?:\/\//i.test(image)) {
            return await responder.texto('❌ La imagen debe ser una URL válida (https://...)');
        }
        if (border && !border.startsWith('#')) border = '#' + border;
        if (!/^#[0-9a-fA-F]{6}$/.test(border)) border = '#1DB954';

        const start = Math.floor(Math.random() * 150000);
        const end = start + 30000 + Math.floor(Math.random() * 120000);

        const params = new URLSearchParams({
            title,
            artist,
            start: String(start),
            end: String(end),
            border
        });
        if (image) params.set('image', image);

        await responder.texto('🎵 Generando tarjeta Spotify...\n┃ 🎼 ' + title + ' — ' + artist);

        const urls = [API + '?' + params.toString()];
        if (image) {
            const p2 = new URLSearchParams(params);
            p2.delete('image');
            urls.push(API + '?' + p2.toString());
        } else {
            const p3 = new URLSearchParams(params);
            p3.set('image', IMG_DEFAULT);
            urls.push(API + '?' + p3.toString());
        }

        let buffer = null;
        for (const u of urls) {
            try {
                const res = await fetch(u, { timeout: 20000 });
                if (!res.ok) continue;
                const type = res.headers.get('content-type') || '';

                if (type.includes('image')) {
                    const buf = Buffer.from(await res.arrayBuffer());
                    if (buf.length > 500) { buffer = buf; break; }
                } else {

                    const json = await res.json().catch(() => null);
                    const imgUrl = json?.result || json?.url || json?.data?.url || json?.image;
                    if (imgUrl) {
                        const r2 = await fetch(imgUrl, { timeout: 20000 });
                        if (r2.ok) {
                            const buf = Buffer.from(await r2.arrayBuffer());
                            if (buf.length > 500) { buffer = buf; break; }
                        }
                    }
                }
            } catch (e) {
                console.error('[SPOTCARD] intento falló:', e.message);
            }
        }

        if (!buffer) {
            return await responder.texto('❌ No pude generar la tarjeta Spotify. Intenta con otra imagen o más tarde.');
        }

        const caption =
            '╭━━〔 🎵 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 𝐂𝐀𝐑𝐃 〕━━⬣\n' +
            '┃\n' +
            '┃ 🎼 Título: *' + title + '*\n' +
            '┃ 🎤 Artista: *' + artist + '*\n' +
            '┃ ⏱️ Progreso: ' + fmtMs(start) + ' / ' + fmtMs(end) + '\n' +
            '┃ 🎨 Borde: ' + border + '\n' +
            '┃\n' +
            '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        try {
            await sock.sendMessage(msg.key.remoteJid, {
                image: buffer,
                caption
            }, { quoted: msg });
        } catch (e) {
            console.error('[SPOTCARD] envio falló:', e.message);
            await responder.texto('❌ Falló al enviar la imagen: ' + e.message);
        }
    }
};