import fetch from 'node-fetch';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Lista de APIs que funcionan (en orden de prioridad)
const APIS = [
    // API 1: Ryzendesu (muy estable)
    (e1, e2) => `https://api.ryzendesu.vip/api/tools/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
    // API 2: David Cyril Tech
    (e1, e2) => `https://api.davidcyriltech.my.id/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`,
    // API 3: Tenor (con clave pública, por si acaso)
    (e1, e2) => `https://tenor.googleapis.com/v2/featured?key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=${e1}_${e2}`
];

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
                '╭━━〔 🔀 𝐌𝐎𝐉𝐈𝐌𝐈𝐗 〕━━⬣\n' +
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
            // Limpiar emojis de caracteres invisibles de WhatsApp
            const [emoji1, emoji2] = texto
                .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
                .split('+')
                .map(e => e.trim())
                .filter(e => e.length > 0);

            console.log(`[EMOJIMIX] Emojis recibidos: "${emoji1}" + "${emoji2}"`);

            if (!emoji1 || !emoji2) {
                await reaccion('❌');
                return await responder.texto('❌ Formato inválido. Usa dos emojis válidos separados por +.');
            }

            const pushName = msg.pushName || msg.key.participant.split('@')[0];
            const packname = '⚡ BOT-API ⚡';
            const author = `© DevLuis | @${pushName}`;

            let imageBuffer = null;
            let apiUsada = '';

            // Probar cada API en orden hasta que una funcione
            for (let i = 0; i < APIS.length; i++) {
                const url = APIS[i](emoji1, emoji2);
                console.log(`[EMOJIMIX] Intentando API ${i + 1}: ${url}`);

                try {
                    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
                    
                    if (!res.ok) {
                        console.log(`[EMOJIMIX] API ${i + 1} respondió con status ${res.status}`);
                        continue;
                    }

                    const contentType = res.headers.get('content-type') || '';
                    
                    // Si la respuesta es una imagen directamente
                    if (contentType.includes('image')) {
                        imageBuffer = Buffer.from(await res.arrayBuffer());
                        apiUsada = `API ${i + 1} (imagen directa)`;
                        console.log(`[EMOJIMIX] ✅ API ${i + 1} funcionó (imagen directa, ${imageBuffer.length} bytes)`);
                        break;
                    }

                    // Si es JSON, buscar la URL de la imagen
                    if (contentType.includes('json')) {
                        const data = await res.json();
                        console.log(`[EMOJIMIX] API ${i + 1} respondió JSON:`, JSON.stringify(data).slice(0, 200));

                        // Buscar URL en diferentes formatos de respuesta
                        const imageUrl = 
                            data.result || 
                            data.url || 
                            data.image || 
                            data.data?.url ||
                            data.results?.[0]?.url ||
                            null;

                        if (imageUrl) {
                            console.log(`[EMOJIMIX] URL encontrada: ${imageUrl}`);
                            const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
                            if (imgRes.ok) {
                                imageBuffer = Buffer.from(await imgRes.arrayBuffer());
                                apiUsada = `API ${i + 1} (JSON -> imagen)`;
                                console.log(`[EMOJIMIX] ✅ API ${i + 1} funcionó (JSON, ${imageBuffer.length} bytes)`);
                                break;
                            }
                        }
                    }
                } catch (e) {
                    console.log(`[EMOJIMIX] API ${i + 1} falló:`, e.message);
                }
            }

            if (!imageBuffer || imageBuffer.length === 0) {
                await reaccion('❌');
                return await responder.texto(
                    '❌ No se pudo obtener el sticker.\n' +
                    '💡 Las APIs están caídas temporalmente. Intenta más tarde.'
                );
            }

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
            
            await img.load(imageBuffer);
            img.exif = exif;
            const stickerFinal = await img.save(null);

            await sock.sendMessage(jid, { sticker: stickerFinal }, { quoted: msg });
            await reaccion('✅');
            console.log(`[EMOJIMIX] ✅ Sticker enviado usando ${apiUsada}`);

        } catch (error) {
            console.error('[EMOJIMIX] Error general:', error?.message || error);
            await reaccion('❌');
            await responder.texto('❌ Ocurrió un error al mezclar los emojis.\n\n⚠️ Detalle: ' + (error?.message || 'Error de conexión'));
        }
    }
};