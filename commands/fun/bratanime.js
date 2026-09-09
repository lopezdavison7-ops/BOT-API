// commands/fun/bratanime.js — 🎌 Sticker meme usando memegen.link (sin API key)
import fetch from 'node-fetch';
import sharp from 'sharp';

// Templates que SÍ existen en memegen.link
const TEMPLATES = {
    drake:      { id: 'drake',      nombre: 'Drake Hotline' },
    spongebob:  { id: 'spongebob',  nombre: 'Mocking Spongebob' },
    stonks:     { id: 'stonks',     nombre: 'Stonks' },
    brain:      { id: 'brain',      nombre: 'Expanding Brain' },
    doge:       { id: 'doge',       nombre: 'Doge' },
    distracted: { id: 'distracted', nombre: 'Distracted Boyfriend' },
    buzz:       { id: 'buzz',       nombre: 'Buzz Lightyear' },
    woah:       { id: 'woah',       nombre: 'Woah' },
    change:     { id: 'change',     nombre: 'Change My Mind' },
    sad:        { id: 'sad',        nombre: 'Sad Pablo' }
};

export default {
    nombre: 'bratanime',
    categoria: 'Stickers',
    alias: ['memesticker', 'memememe', 'memecartel'],
    descripcion: 'Genera sticker meme sin API key',
    uso: '.bratanime [estilo] <texto>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const args = String(argumento || '').trim().split(/\s+/);
            if (!args[0]) {
                return await responder.texto(
                    '╭━━〔 🎌 𝐁𝐑𝐀𝐓 𝐌𝐄𝐌𝐄 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Uso: .bratanime [estilo] <texto>\n' +
                    '┃\n' +
                    '┃ Ejemplos:\n' +
                    '┃  • .bratanime hola mundo\n' +
                    '┃  • .bratanime drake no/si\n' +
                    '┃  • .bratanime stonks subió mi bal\n' +
                    '┃\n' +
                    '┃ Estilos: drake (default), spongebob,\n' +
                    '┃ stonks, brain, doge, distracted,\n' +
                    '┃ buzz, woah, change, sad\n' +
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
                template = TEMPLATES.drake;  // Default: drake
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
            const url = topText 
                ? `https://api.memegen.link/images/${template.id}/${topEncoded}/${bottomEncoded}.png`
                : `https://api.memegen.link/images/${template.id}/_/${bottomEncoded}.png`;

            console.log('[BRATANIME] URL:', url);

            // Descargar la imagen
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('API respondió ' + resp.status + ' - Template no válido');
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
            await responder.texto('❌ Error generando sticker: ' + (error.message || error));
        }
    }
};