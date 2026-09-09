// commands/fun/bratanime.js — 🌸 Sticker de chica anime con texto estilo brat
import fetch from 'node-fetch';
import sharp from 'sharp';

// Categorías SFW de waifu.pics (sin API key)
const CATS = {
    waifu: 'waifu', chica: 'waifu', girl: 'waifu',
    neko: 'neko', gata: 'neko',
    shinobu: 'shinobu',
    megumin: 'megumin'
};

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

export default {
    nombre: 'bratanime',
    categoria: 'Stickers',
    alias: ['waifusticker', 'animebrat', 'nekosticker'],
    descripcion: 'Sticker de chica anime random con tu texto estilo brat',
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

            // Parseo: primer token puede ser categoría
            const primer = args[0].toLowerCase();
            let cat = 'waifu';
            let texto;
            if (CATS[primer]) {
                cat = CATS[primer];
                texto = args.slice(1).join(' ');
            } else {
                texto = args.join(' ');
            }

            if (!texto) {
                return await responder.texto('❌ Falta el texto. Ejemplo: .bratanime hola');
            }

            // 1) Imagen anime random de waifu.pics (SFW, sin API key)
            const apiResp = await fetch('https://api.waifu.pics/sfw/' + cat);
            if (!apiResp.ok) throw new Error('waifu.pics respondió ' + apiResp.status);
            const apiData = await apiResp.json();
            if (!apiData.url) throw new Error('waifu.pics no devolvió imagen');

            // 2) Descargar la imagen
            const imgResp = await fetch(apiData.url);
            if (!imgResp.ok) throw new Error('No se pudo descargar la imagen');
            const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

            // 3) Recortar a cuadrado 512x512 (cover, centrado)
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

            // 5) Componer imagen + texto y convertir a sticker WebP
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