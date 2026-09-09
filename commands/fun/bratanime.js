// commands/fun/bratanime.js — 🎌 Sticker anime con memegen.link (sin API key)
import fetch from 'node-fetch';
import sharp from 'sharp';

// Templates con vibe anime/meme disponibles en memegen.link
const TEMPLATES = {
    anime:    { id: 'anime',    nombre: 'Anime Sign' },
    drake:    { id: 'drake',    nombre: 'Drake Hotline' },
    spongebob: { id: 'spongebob', nombre: 'Spongebob Mocking' },
    stonks:   { id: 'stonks',   nombre: 'Stonks' },
    brain:    { id: 'brain',    nombre: 'Expanding Brain' },
    doge:     { id: 'doge',     nombre: 'Doge' },
    distracted: { id: 'distracted', nombre: 'Distracted Boyfriend' }
};

export default {
    nombre: 'bratanime',
    categoria: 'Stickers',
    alias: ['animesticker', 'animememe', 'animecartel'],
    descripcion: 'Genera sticker meme anime sin API key',
    uso: '.bratanime [estilo] <texto>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const args = String(argumento || '').trim().split(/\s+/);
            if (!args[0]) {
                return await responder.texto(
                    '╭━━〔 🎌 𝐁𝐑𝐀𝐓 𝐀𝐍𝐈𝐌𝐄 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Uso: .bratanime [estilo] <texto>\n' +
                    '┃\n' +
                    '┃ Ejemplos:\n' +
                    '┃  • .bratanime hola mundo\n' +
                    '┃  • .bratanime anime soy otaku\n' +
                    '┃  • .bratanime drake no/si\n' +
                    '┃\n' +
                    '┃ Estilos: anime, drake, spongebob,\n' +
                    '┃ stonks, brain, doge, distracted\n' +
                    '┃\n' +
                    '┃ Tip: usa "/" para separar arriba/abajo\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            // Parseo: primer token puede ser estilo
            const primer = args[0].toLowerCase();
            let template;
            let texto;
            
            if (TEMPLATES[primer]) {
                template = TEMPLATES[primer];
                texto = args.slice(1).join(' ');
            } else {
                template = TEMPLATES.anime;
                texto = args.join(' ');
            }

            if (!texto) {
                return await responder.texto('❌ Falta el texto. Ejemplo: .bratanime hola');
            }

            // Separar texto en top/bottom si tiene "/"
            let topText = '';
            let bottomText = texto;
            if (texto.includes('/')) {
                const parts = texto.split('/');
                topText = parts[0].trim();
                bottomText = parts.slice(1).join('/').trim();
            }

            // Codificar textos para URL (memegen.link usa "_" como espacio)
            const encodeText = (t) => encodeURIComponent(t.replace(/\s+/g, '_'));
            const topEncoded = encodeText(topText);
            const bottomEncoded = encodeText(bottomText);

            // Construir URL de memegen.link
            // Formato: https://api.memegen.link/images/{template}/{top}/{bottom}.png
            const url = topText 
                ? `https://api.memegen.link/images/${template.id}/${topEncoded}/${bottomEncoded}.png`
                : `https://api.memegen.link/images/${template.id}/_/${bottomEncoded}.png`;

            console.log('[BRATANIME] URL:', url);

            // Descargar la imagen
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('API respondió ' + resp.status);
            const buffer = await resp.arrayBuffer();

            // Convertir a WebP (sticker) 512x512
            const stickerBuffer = await sharp(Buffer.from(buffer))
                .resize(512, 512, { 
                    fit: 'contain', 
                    background: { r: 0, g: 0, b: 0, alpha: 0 } 
                })
                .webp({ quality: 85 })
                .toBuffer();

            // Enviar como sticker
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