// commands/fun/bratanime.js — 🌸 Sticker anime con sistema de fallback (3 APIs)
import fetch from 'node-fetch';
import sharp from 'sharp';

// Sistema de fallback: si una API falla, prueba la siguiente
const API_SOURCES = [
    {
        name: 'waifu.pics',
        getUrl: (cat) => `https://api.waifu.pics/sfw/${cat}`,
        parse: (data) => data.url,
        cats: { waifu: 'waifu', chica: 'waifu', neko: 'neko', shinobu: 'shinobu', megumin: 'megumin' }
    },
    {
        name: 'waifu.im',
        getUrl: (cat) => {
            const tags = { waifu: 'waifu', chica: 'waifu', neko: 'neko', shinobu: 'waifu', megumin: 'waifu' };
            return `https://api.waifu.im/search?included_tags=${tags[cat] || 'waifu'}&is_nsfw=false`;
        },
        parse: (data) => data.images && data.images[0] && data.images[0].url,
        cats: { waifu: 'waifu', chica: 'waifu', neko: 'neko' }
    },
    {
        name: 'nekos.life',
        getUrl: (cat) => {
            const eps = { waifu: 'waifu', chica: 'waifu', neko: 'neko', shinobu: 'waifu', megumin: 'waifu' };
            return `https://nekos.life/api/v2/img/${eps[cat] || 'waifu'}`;
        },
        parse: (data) => data.url,
        cats: { waifu: 'waifu', chica: 'waifu', neko: 'neko' }
    }
];

const DEFAULT_CAT = 'waifu';

function escapeXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function wrapText(text, maxChars) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
        else cur = (cur ? cur + ' ' : '') + w;
    }
    if (cur) lines.push(cur);
    return lines.slice(0, 3);
}

// Intenta obtener imagen de varias APIs hasta que una funcione
async function obtenerAnime(cat) {
    const errores = [];
    for (const src of API_SOURCES) {
        if (!src.cats[cat]) continue; // Esta fuente no soporta esta categoría
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const resp = await fetch(src.getUrl(cat), { signal: controller.signal });
            clearTimeout(timeout);
            if (!resp.ok) throw new Error('HTTP ' + resp.status);
            const data = await resp.json();
            const url = src.parse(data);
            if (!url) throw new Error('No devolvió URL');
            console.log('[BRATANIME] ✅', src.name, '→', url.slice(0, 80));
            return { url, source: src.name };
        } catch (e) {
            errores.push(src.name + ': ' + (e.message || e));
            console.log('[BRATANIME] ❌', src.name, 'falló:', e.message);
        }
    }
    throw new Error('Todas las APIs fallaron:\n' + errores.join('\n'));
}

export default {
    nombre: 'bratanime',
    categoria: 'Stickers',
    alias: ['waifusticker', 'animebrat', 'nekosticker'],
    descripcion: 'Sticker de chica anime random con texto estilo brat',
    uso: '.bratanime [categoria] <texto>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const args = String(argumento || '').trim().split(/\s+/);
            if (!args[0]) {
                return await responder.texto(
                    '╭━━〔 🌸 𝐑𝐓 𝐍𝐌 〕━━\n' +
                    '┃\n' +
                    '┃ Uso: .bratanime [cat] <texto>\n' +
                    '┃\n' +
                    '┃ Ejemplos:\n' +
                    '┃  • .bratanime hola seño\n' +
                    '┃  • .bratanime neko buenas noches\n' +
                    '┃  • .bratanime shinobu te amo\n' +
                    '┃\n' +
                    '┃ Cats: waifu/chica (default), neko,\n' +
                    '┃ shinobu, megumin\n' +
                    '┃\n' +
                    '┃ Cada uso = chica anime RANDOM 🎲\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const primer = args[0].toLowerCase();
            let cat = DEFAULT_CAT;
            let texto;
            const todasCats = {};
            API_SOURCES.forEach(s => Object.assign(todasCats, s.cats));
            if (todasCats[primer]) {
                cat = todasCats[primer];
                texto = args.slice(1).join(' ');
            } else {
                texto = args.join(' ');
            }

            if (!texto) {
                return await responder.texto('❌ Falta el texto. Ejemplo: .bratanime hola');
            }

            // 1) Obtener imagen con fallback automático
            const { url, source } = await obtenerAnime(cat);

            // 2) Descargar la imagen
            const imgResp = await fetch(url);
            if (!imgResp.ok) throw new Error('No se pudo descargar la imagen (' + imgResp.status + ')');
            const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

            // 3) Recortar a cuadrado 512x512
            const base = await sharp(imgBuffer)
                .resize(512, 512, { fit: 'cover', position: 'centre' })
                .png()
                .toBuffer();

            // 4) Texto estilo brat: barra oscura + texto blanco con blur
            const lines = wrapText(texto, 18);
            const fontSize = (Math.max(...lines.map(l => l.length)) > 24) ? 28 : (Math.max(...lines.map(l => l.length)) > 16 ? 34 : 42);
            const barH = lines.length * 46 + 26;
            const textosSvg = lines.map((l, i) =>
                '<text x="256" y="' + (512 - barH + 42 + i * 46) + '" font-family="Arial Black, Arial, sans-serif" font-size="' + fontSize + '" font-style="italic" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#blur)">' + escapeXml(l) + '</text>'
            ).join('');

            const svg = '<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">' +
                '<defs><filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1"/></filter></defs>' +
                '<rect x="0" y="' + (512 - barH) + '" width="512" height="' + barH + '" fill="rgba(0,0,0,0.55)"/>' +
                textosSvg +
                '</svg>';

            // 5) Componer y convertir a sticker WebP
            const stickerBuffer = await sharp(base)
                .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
                .webp({ quality: 85 })
                .toBuffer();

            // 6) Enviar como sticker
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: stickerBuffer,
                mimetype: 'image/webp'
            }, { quoted: msg });

        } catch (error) {
            console.error('[BRATANIME] Error:', error);
            await responder.texto('❌ Error generando sticker anime: ' + (error.message || error));
        }
    }
};