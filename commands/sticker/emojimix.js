import fetch from 'node-fetch';
import config from '../../config.js';

export default {
    nombre: 'emojimix',
    categoria: 'Stickers',
    alias: ['mixemoji', 'emojicombinar', 'em', 'mix'],
    descripcion: 'Mezcla dos emojis y crea un sticker único.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        // Función de reacción blindada
        const reaccion = async (emoji) => {
            await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        };

        const texto = String(argumento || '').trim();

        // Validar que haya texto y contenga un "+"
        if (!texto || !texto.includes('+')) {
            await reaccion('❌');
            return await responder.texto(
                '╭━━〔 🔀 𝐄𝐌𝐎𝐉𝐈𝐌𝐈𝐗 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Ingresa 2 emojis separados por un +\n' +
                '┃\n' +
                '┃ 💡 Ejemplos:\n' +
                '┃ › .emojimix 👻+👀\n' +
                '┃ › .mix 🔥+💧\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        await reaccion('🕒');

        try {
            const [emoji1, emoji2] = texto.split('+').map(e => e.trim());

            if (!emoji1 || !emoji2) {
                await reaccion('❌');
                return await responder.texto('❌ Formato inválido. Asegúrate de poner dos emojis válidos separados por +.');
            }

            // Obtener metadatos del config o del usuario
            const pushName = msg.pushName || msg.key.participant.split('@')[0];
            const packname = config.packname || '⚡ BOT-API ⚡';
            const author = config.author || `@${pushName}`;

            // URL de la API de Tenor (Emoji Kitchen)
            const apiUrl = `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${encodeURIComponent(emoji1)}_${encodeURIComponent(emoji2)}`;
            
            const res = await fetch(apiUrl);
            const data = await res.json();

            if (!data.results || data.results.length === 0) {
                await reaccion('❌');
                return await responder.texto(
                    '❌ No se encontraron stickers para esa combinación de emojis.\n' +
                    '💡 Prueba con otra combinación (ej: 😂+😍).'
                );
            }

            // Tomar el primer resultado (Emoji Kitchen suele devolver 1)
            const result = data.results[0];
            
            // Descargar la imagen
            const imgRes = await fetch(result.url);
            const buffer = Buffer.from(await imgRes.arrayBuffer());

            // Enviar como sticker
            // Nota: Baileys convierte automáticamente el PNG a WebP al enviarlo como tipo 'sticker'
            await sock.sendMessage(jid, {
                sticker: buffer,
                packname: packname,
                author: author
            }, { quoted: msg });

            await reaccion('✅');

        } catch (error) {
            console.error('[EMOJIMIX] Error:', error?.message || error);
            await reaccion('❌');
            await responder.texto(
                '❌ Ocurrió un error al mezclar los emojis.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error de conexión con la API')
            );
        }
    }
};