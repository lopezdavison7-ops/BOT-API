

const API = 'https://api.delirius.online/tools/emoji?text=';

const PLATAFORMAS = [
    'apple', 'google', 'whatsapp', 'facebook', 'twitter',
    'samsung', 'microsoft', 'mensajero', 'joypixels',
    'openmoji', 'emojidex', 'htc', 'lg', 'mozilla',
    'softbank', 'au_kddi'
];

const ALIAS = {
    'messenger': 'mensajero',
    'x': 'twitter',
    'au-kddi': 'au_kddi',
    'kddi': 'au_kddi',
    'fb': 'facebook',
    'ig': 'facebook'
};

function normalizarPlataforma(txt) {
    const t = String(txt).toLowerCase().trim();
    return ALIAS[t] || t;
}

async function descargarImagen(url) {
    const res = await fetch(url, {
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Imagen vacía');
    return buffer;
}

export default {
    nombre: 'emoji',
    categoria: 'utils',
    alias: ['emojis', 'emojigraph', 'emo'],
    descripcion: 'Muestra un emoji en el estilo de cada plataforma',
    uso: '.emoji <emoji> · .emoji <emoji> <plataforma>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const chatJid = msg.key.remoteJid;
        const s = sock || global.conns?.[0];
        const args = String(argumento || '').trim();

        if (!args) {
            return await responder.texto(
                '╭━━〔 😁 𝐄𝐌𝐎𝐉𝐈 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el emoji\n' +
                '┃\n' +
                '┃ 📋 Uso:\n' +
                '┃ • .emoji 😁 (todas las plataformas)\n' +
                '┃ • .emoji 🔥 apple (una plataforma)\n' +
                '┃\n' +
                '┃ 🌐 Plataformas:\n' +
                '┃ ' + PLATAFORMAS.join(', ') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }

        const partes = args.split(/\s+/);
        const emoji = partes[0];
        const plataforma = partes[1] ? normalizarPlataforma(partes[1]) : null;

        try {
            const res = await fetch(API + encodeURIComponent(emoji));
            const json = await res.json();

            const datos = json.data || json.datos;

            if (!json.status || !datos || Object.keys(datos).length === 0) {
                return await responder.texto('❌ No encontré ese emoji: *' + emoji + '*');
            }

            if (plataforma) {
                const url = datos[plataforma];

                if (!url) {
                    return await responder.texto(
                        '❌ Plataforma no disponible: *' + plataforma + '*\n\n' +
                        '🌐 Disponibles:\n' + PLATAFORMAS.join(', ')
                    );
                }

                return await responder.imagen(
                    { url },
                    '╭━━〔 😁 𝐄𝐌𝐎𝐉𝐈 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ' + emoji + ' en *' + plataforma.toUpperCase() + '*\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const entradas = PLATAFORMAS
                .filter(p => datos[p])
                .map(p => ({ nombre: p, url: datos[p] }));

            if (!entradas.length) {
                return await responder.texto('❌ Ese emoji no tiene imágenes disponibles.');
            }

            const resultados = await Promise.allSettled(
                entradas.map(e => descargarImagen(e.url))
            );

            const imagenes = [];
            resultados.forEach((r, i) => {
                if (r.status === 'fulfilled') {
                    imagenes.push({ nombre: entradas[i].nombre, buffer: r.value });
                }
            });

            if (!imagenes.length) {
                return await responder.texto('❌ No pude descargar las imágenes del emoji.');
            }

            const album = imagenes.map((img, i) => ({
                image: img.buffer,
                caption: i === imagenes.length - 1
                    ? emoji + ' en *' + imagenes.length + ' plataformas*\n\nBOT-API 💙💻'
                    : '🌐 ' + img.nombre.toUpperCase()
            }));

            try {
                await s.sendMessage(chatJid, { album }, { quoted: msg });
            } catch (errorAlbum) {
                console.error('[EMOJI] Álbum falló:', errorAlbum?.message || errorAlbum);

                for (const img of imagenes) {
                    try {
                        await s.sendMessage(
                            chatJid,
                            { image: img.buffer, caption: '🌐 ' + img.nombre.toUpperCase() },
                            { quoted: msg }
                        );
                    } catch {}
                }
            }

        } catch (error) {
            console.error('[EMOJI] Error:', error?.message || error);
            await responder.texto('❌ Error consultando el emoji: ' + (error?.message || 'Intenta de nuevo'));
        }
    }
};