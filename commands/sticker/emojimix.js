import fetch from 'node-fetch';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default {
    nombre: 'emojimix',
    categoria: 'Stickers',
    alias: ['mixemoji', 'em', 'mix'],
    descripcion: 'Mezcla dos emojis y crea un sticker.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const reaccion = async (emoji) => {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        };

        const texto = String(argumento || '').trim();

        if (!texto || !texto.includes('+')) {
            await reaccion('❌');
            return await responder.texto(
                '╭━━〔 🔀 𝐄𝐌𝐎𝐉𝐈𝐌𝐈𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Ingresa 2 emojis separados por un +\n' +
                '┃\n' +
                '┃ 💡 Ejemplo: .emojimix 👻+👀\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        await reaccion('🕒');

        try {
            const [emoji1, emoji2] = texto.split('+').map(e => e.trim());

            if (!emoji1 || !emoji2) {
                await reaccion('❌');
                return await responder.texto('❌ Formato inválido. Usa dos emojis válidos separados por +.');
            }

            const pushName = msg.pushName || msg.key.participant.split('@')[0];
            const packname = '⚡ BOT-API ⚡';
            const author = `© DevLuis | @${pushName}`;

            const apiUrl = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
            
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                await reaccion('❌');
                return await responder.texto('❌ No se encontraron stickers para esa combinación.\n💡 Prueba con otra (ej: 😂+😍).');
            }

            const result = data.results[0];
            const imgRes = await fetch(result.url);
            const buffer = Buffer.from(await imgRes.arrayBuffer());

            // Función mini para agregar EXIF (marca de agua) sin depender de archivos externos
            const webp = require('node-webpmux');
            const img = new webp.Image();
            const json = {
                'sticker-pack-id': 'emojimix-botapi',
                'sticker-pack-name': packname,
                'sticker-pack-publisher': author,
                emojis: ['']
            };
            const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
            const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8');
            const exif = Buffer.concat([exifAttr, jsonBuffer]);
            exif.writeUIntLE(jsonBuffer.length, 14, 4);
            
            await img.load(buffer);
            img.exif = exif;
            const stickerFinal = await img.save(null);

            await sock.sendMessage(jid, { sticker: stickerFinal }, { quoted: msg });
            await reaccion('✅');

        } catch (error) {
            console.error('[EMOJIMIX] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto('❌ Ocurrió un error al mezclar los emojis.\n\n⚠️ Detalle: ' + (error?.message || 'Error de conexión'));
        }
    }
};