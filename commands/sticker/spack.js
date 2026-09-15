// commands/sticker/spack.js
// ============================================================
// COMANDO: SPACK (Sticker Pack)
// BOT-API
//
// Busca packs de stickers y los envía como ÁLBUM
// (igual que pinterest.js). Si el álbum falla, los manda
// todos en bloque sin esperas.
// Usa Lempi API para búsqueda y descarga.
//
// Uso:
//   .spack <tema> — Busca y envía el primer pack encontrado
// ============================================================

import axios from 'axios';
import sharp from 'sharp';
import config from '../../config.js';

const LEMPI_API = 'https://api.lempi.lat';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const HEADERS = {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

const MAX_STICKERS = 15;

function truncarTexto(texto, max = 40) {
    const t = String(texto || '').trim();
    return t.length > max ? t.substring(0, max - 3) + '...' : t;
}

async function buscarStickerPacks(query, apikey) {
    try {
        const url = `${LEMPI_API}/s/stickers?q=${encodeURIComponent(query)}&apikey=${apikey}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
        const data = res.data;

        if (!data.status || !data.resultados?.length) {
            return null;
        }

        return data.resultados.map(p => ({
            titulo: p.titulo,
            autor: p.autor,
            url: p.url,
            icono: p.icono,
            animado: p.animado,
            total: p.total,
            zip: p.zip,
            stickers: p.stickers || []
        }));
    } catch (e) {
        console.error('[LEMPI STICKER SEARCH] Error:', e.message);
        return null;
    }
}

async function descargarImagen(url) {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': USER_AGENT },
            timeout: 15000,
            maxContentLength: 10 * 1024 * 1024
        });
        return Buffer.from(res.data);
    } catch (e) {
        console.error('[DOWNLOAD IMAGE] Error:', e.message);
        return null;
    }
}

async function convertirASticker(buffer) {
    try {
        const webpBuffer = await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 90, lossless: false })
            .toBuffer();
        return webpBuffer;
    } catch (e) {
        console.error('[CONVERT STICKER] Error:', e.message);
        return null;
    }
}

// ============================================================
// NUEVO: descargar + convertir TODOS en paralelo (rápido)
// ============================================================

async function prepararStickers(urls) {
    console.log(`[SPACK] Preparando ${urls.length} stickers en paralelo...`);

    const resultados = await Promise.allSettled(
        urls.map(async (url) => {
            const img = await descargarImagen(url);
            if (!img) throw new Error('descarga falló');

            const webp = await convertirASticker(img);
            if (!webp) throw new Error('conversión falló');

            return webp;
        })
    );

    const validos = [];

    resultados.forEach((r, i) => {
        if (r.status === 'fulfilled') {
            validos.push(r.value);
        } else {
            console.error(`[SPACK] Falló sticker ${i + 1}:`, r.reason?.message || r.reason);
        }
    });

    console.log(`[SPACK] Preparados: ${validos.length}/${urls.length}`);
    return validos;
}

// ============================================================
// NUEVO: enviar como ÁLBUM (el truco de pinterest.js)
// ============================================================

async function enviarComoAlbum(sock, jid, msg, buffers) {
    if (!buffers.length) throw new Error('No hay stickers.');

    console.log(`[SPACK] Creando álbum de ${buffers.length} stickers...`);

    const album = buffers.map((buffer) => ({
        sticker: buffer
    }));

    await sock.sendMessage(jid, { album }, { quoted: msg });

    console.log(`[SPACK] Álbum enviado correctamente: ${buffers.length}`);
    return buffers.length;
}

// ============================================================
// NUEVO: respaldo — enviar en bloque, SIN esperas de 500ms
// ============================================================

async function enviarEnBloque(sock, jid, msg, buffers) {
    let enviados = 0;

    for (const buffer of buffers) {
        try {
            await sock.sendMessage(jid, { sticker: buffer }, { quoted: msg });
            enviados++;
        } catch (e) {
            console.error('[SPACK] Error enviando sticker:', e.message);
        }
    }

    return enviados;
}

// ============================================================
// COMANDO
// ============================================================

export default {
    nombre: 'spack',

    categoria: 'stickers',

    alias: [
        'stickerpack',
        'stickers',
        'sp'
    ],

    descripcion:
        'Busca y envía un pack de stickers en álbum. Uso: .spack <tema>',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const chatJid = msg.key.remoteJid;
        const apikey = config.LEMPI_API_KEY || '';

        if (!apikey) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂𝐊 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *API Key de Lempi no configurada.*\n' +
                '┃\n' +
                '┃ Agrega tu key en config.js:\n' +
                '┃ LEMPI_API_KEY: "tu_key_aqui"\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂 〕⬣\n' +
                '┃\n' +
                '┃ ❌ *Falta el tema a buscar.*\n' +
                '┃\n' +
                '┃ 📌 *Uso:* .spack gatos\n' +
                '┃ 📌 *Uso:* .spack anime\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        await responder.texto(
            `╭〔 🔍 𝐒𝐏𝐀𝐂𝐊 〕⬣\n` +
            `┃\n` +
            `┃ Buscando packs: *${consulta}*\n` +
            `┃ 🔎 En Lempi API...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        const packs = await buscarStickerPacks(consulta, apikey);

        if (!packs || packs.length === 0) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂 〕⬣\n' +
                '┃\n' +
                '┃ No se encontraron packs de stickers.\n' +
                '┃ Intenta con otro tema.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const pack = packs[0];
        const urls = pack.stickers.slice(0, MAX_STICKERS);

        await responder.texto(
            `╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n` +
            `┃\n` +
            `┃ 🎨 *${truncarTexto(pack.titulo)}*\n` +
            `┃ 👤 @${pack.autor}\n` +
            `┃ 🖼️ ${pack.total} stickers en total\n` +
            `┃ ⏳ Preparando ${urls.length} stickers...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        // ------------------------------------------------
        // NUEVO: preparar TODOS en paralelo (antes era 1 por 1)
        // ------------------------------------------------
        const buffers = await prepararStickers(urls);

        if (!buffers.length) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂𝐊 〕⬣\n' +
                '┃\n' +
                '┃ No pude descargar ningún sticker.\n' +
                '┃ Intenta con otro pack.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        // ------------------------------------------------
        // NUEVO: ÁLBUM primero, bloque como respaldo
        // ------------------------------------------------
        let enviados = 0;

        try {
            enviados = await enviarComoAlbum(sock, chatJid, msg, buffers);
        } catch (errorAlbum) {
            console.error('[SPACK] El álbum falló:', errorAlbum?.message || errorAlbum);
            enviados = await enviarEnBloque(sock, chatJid, msg, buffers);
        }

        if (!enviados) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂 〕⬣\n' +
                '┃\n' +
                '┃ No pude enviar los stickers.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        await responder.texto(
            `╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n` +
            `┃\n` +
            `┃ ✅ *Pack enviado*\n` +
            `┃ 🎨 ${truncarTexto(pack.titulo)}\n` +
            `┃ 📤 Enviados: *${enviados}*\n` +
            `┃ ❌ Fallidos: *${urls.length - buffers.length}*\n` +
            `┃\n` +
            `┃ 🔗 Ver más: ${pack.url}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );
    }
};