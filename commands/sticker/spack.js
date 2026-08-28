// commands/sticker/spack.js
// ============================================================
// COMANDO: SPACK (Sticker Pack)
// BOT-API
//
// Busca packs de stickers y envía los stickers como álbum.
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

export default {
    nombre: 'spack',

    categoria: 'stickers',

    alias: [
        'stickerpack',
        'stickers',
        'sp'
    ],

    descripcion:
        'Busca y envía un pack de stickers. Uso: .spack <tema>',

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
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const consulta = argumento?.trim();

        if (!consulta) {
            await responder.texto(
                '╭〔 ❌ 𝐒𝐏𝐀𝐂𝐊 〕⬣\n' +
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
                '╭〔 ❌ 𝐒𝐏𝐀𝐂𝐊 〕⬣\n' +
                '┃\n' +
                '┃ No se encontraron packs de stickers.\n' +
                '┃ Intenta con otro tema.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const pack = packs[0];
        const stickers = pack.stickers.slice(0, MAX_STICKERS);

        await responder.texto(
            `╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n` +
            `┃\n` +
            `┃ 🎨 *${truncarTexto(pack.titulo)}*\n` +
            `┃ 👤 @${pack.autor}\n` +
            `┃ 🖼️ ${pack.total} stickers en total\n` +
            `┃ ⬇️ Enviando ${stickers.length} stickers...\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );

        let enviados = 0;
        let fallidos = 0;

        for (let i = 0; i < stickers.length; i++) {
            const stickerUrl = stickers[i];

            try {
                const imgBuffer = await descargarImagen(stickerUrl);
                if (!imgBuffer) {
                    fallidos++;
                    continue;
                }

                const stickerBuffer = await convertirASticker(imgBuffer);
                if (!stickerBuffer) {
                    fallidos++;
                    continue;
                }

                await sock.sendMessage(chatJid, {
                    sticker: stickerBuffer
                }, { quoted: msg });

                enviados++;

                if (i < stickers.length - 1) {
                    await new Promise(r => setTimeout(r, 500));
                }

            } catch (e) {
                console.error(`[SPACK] Error sticker ${i + 1}:`, e.message);
                fallidos++;
            }
        }

        await responder.texto(
            `╭〔 💻𝐁𝐎𝐓-𝐀𝐏𝐈⚡ 〕⬣\n` +
            `┃\n` +
            `┃ ✅ *Pack enviado*\n` +
            `┃ 🎨 ${truncarTexto(pack.titulo)}\n` +
            `┃ ✅ Enviados: *${enviados}*\n` +
            `┃ ❌ Fallidos: *${fallidos}*\n` +
            `┃\n` +
            `┃ 🔗 Ver más: ${pack.url}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );
    }
};
