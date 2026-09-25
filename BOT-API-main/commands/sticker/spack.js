

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
        return await sharp(buffer)
            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .webp({ quality: 90, lossless: false })
            .toBuffer();
    } catch (e) {
        console.error('[CONVERT STICKER] Error:', e.message);
        return null;
    }
}

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
        if (r.status === 'fulfilled') validos.push(r.value);
        else console.error(`[SPACK] Falló sticker ${i + 1}:`, r.reason?.message || r.reason);
    });

    console.log(`[SPACK] Preparados: ${validos.length}/${urls.length}`);
    return validos;
}

async function enviarComoPack(sock, jid, msg, buffers, nombre) {
    const nombrePack = truncarTexto(nombre, 25);
    const publisher = 'BOT-API ⚡';

    if (typeof sock.stickerPackMessage === 'function') {
        await sock.stickerPackMessage(jid, {
            name: nombrePack,
            publisher,
            stickers: buffers.map(b => ({ data: b, emojis: ['😀'] })),
            cover: buffers[0]
        }, { quoted: msg });
        return 'pack nativo';
    }

    try {
        await sock.sendMessage(jid, {
            stickerPack: {
                name: nombrePack,
                publisher,
                stickers: buffers.map(b => ({ data: b, emojis: ['😀'] })),
                cover: buffers[0]
            }
        }, { quoted: msg });
        return 'pack nativo';
    } catch (e) {
        console.log('[SPACK] Formato stickerPack no soportado:', e.message);
    }

    await sock.sendMessage(jid, {
        cover: buffers[0],
        stickers: buffers.map(b => ({ data: b })),
        name: `📦 ${nombrePack}`,
        publisher: `🌟 ${publisher}`,
        description: 'Pack enviado por BOT-API'
    }, { quoted: msg });

    return 'pack nativo';
}

async function enviarEnBloque(sock, jid, msg, buffers) {
    let enviados = 0;

    for (let i = 0; i < buffers.length; i++) {
        try {
            await sock.sendMessage(
                jid,
                { sticker: buffers[i] },
                i === 0 ? { quoted: msg } : {}
            );
            enviados++;
        } catch (e) {
            console.error(`[SPACK] Error enviando sticker ${i + 1}:`, e.message);
        }
    }

    return enviados;
}

export default {
    nombre: 'spack',

    categoria: 'stickers',

    alias: ['stickerpack', 'stickers', 'sp'],

    descripcion:
        'Busca y envía un pack de stickers completo. Uso: .spack <tema>',

    ejecutar: async ({ sock, msg, responder, argumento }) => {

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
                '╰━━━━━━━━━━━━━━━━⬣'
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
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        await responder.texto(
            '╭〔 🔍 𝐒𝐏𝐀𝐂𝐊 〕⬣\n' +
            '┃\n' +
            `┃ Buscando packs: *${consulta}*\n` +
            '┃ 🔎 En Lempi API...\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
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
        const totalPack = pack.total || pack.stickers.length || urls.length;

        await responder.texto(
            '╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n' +
            '┃\n' +
            `┃ 🎨 *${truncarTexto(pack.titulo)}*\n` +
            `┃ 👤 @${pack.autor}\n` +
            `┃ 🖼️ ${totalPack} stickers en total\n` +
            `┃ ⏳ Preparando ${urls.length} stickers...\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━'
        );

        const buffers = await prepararStickers(urls);

        if (!buffers.length) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂 〕⬣\n' +
                '┃\n' +
                '┃ No pude descargar ningún sticker.\n' +
                '┃ Intenta con otro pack.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        let enviados = 0;
        let modo = '';

        try {
            modo = await enviarComoPack(sock, chatJid, msg, buffers, pack.titulo || consulta);
            enviados = buffers.length;
        } catch (errorPack) {
            console.error('[SPACK] Pack nativo no soportado por tu Baileys:', errorPack?.message || errorPack);
            modo = 'bloque';
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
            '╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n' +
            '┃\n' +
            '┃ ✅ *Pack enviado*\n' +
            `┃ 🎨 ${truncarTexto(pack.titulo)}\n` +
            `┃ 📤 Enviados: *${enviados}*\n` +
            `┃ 📦 Modo: *${modo}*\n` +
            '┃\n' +
            `┃ 🔗 Ver más: ${pack.url}\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};