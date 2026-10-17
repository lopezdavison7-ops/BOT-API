import fetch from 'node-fetch';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default {
    nombre: 'emojimix',
    categoria: 'Stickers',
    alias: ['mixemoji', 'em', 'mix'],
    descripcion: 'Mezcla dos emojis y crea un sticker único.',

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
                '┃ 💡 Ejemplo: .emojimix 😂+😍\n' +
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

            let imageUrl = null;

            // ── INTENTO 1: Tenor API (formato corregido sin encodeURIComponent en el underscore) ──
            try {
                const url1 = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${emoji1}_${emoji2}`;
                const res1 = await fetch(url1);
                const data1 = await res1.json();
                if (data1.results && data1.results.length > 0) {
                    imageUrl = data1.results[0].url;
                }
            } catch (e) {
                console.log('[EMOJIMIX] Tenor falló, probando respaldo...');
            }

            // ── INTENTO 2: API de Respaldo (Akuari) ──
            if (!imageUrl) {
                try {
                    const url2 = `https://api.akuari.my.id/tools/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`;
                    const res2 = await fetch(url2);
                    const data2 = await res2.json();
                    if (data2.status && data2.result) {
                        imageUrl = data2.result;
                    }
                } catch (e) {
                    console.log('[EMOJIMIX] API de respaldo también falló:', e.message);
                }
            }

            // ── VERIFICACIÓN FINAL ──
            if (!imageUrl) {
                await reaccion('❌');
                return await responder.texto(
                    '❌ No se encontraron stickers para esa combinación.\n' +
                    '💡 Prueba con otra (ej: 😂+😍, 🔥+💧, 🥺+👉👈).'
                );
            }

            // ── DESCARGA Y CONVERSIÓN A STICKER ──
            const imgRes = await fetch(imageUrl);
            const buffer = Buffer.from(await imgRes.arrayBuffer());

            // Agregar EXIF (marca de agua)
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