// commands/brat.js
import fetch from 'node-fetch';
import sharp from 'sharp';
import { createSticker } from 'webp-sticker'; // Importamos la librería

export default {
    nombre: 'brat',
    categoria: 'Multimedia',
    alias: ['bratwhite', 'bratblanco'],
    descripcion: 'Genera un sticker BRAT con créditos',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const texto = String(argumento || '').trim();
            if (!texto || texto.length > 50) {
                await responder.texto(
                    `❌ *BRAT*\n\n` +
                    `Escribe un texto (máximo 50 caracteres).\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.brat hola mundo*`
                );
                return;
            }

            const color = 'white';
            const apiKey = 'yosoyyo_sk_gincmnk3';
            const apiUrl = `https://apiyosoyyo-ofc.onrender.com/api/brat?text=${encodeURIComponent(texto)}&color=${color}&apiKey=${apiKey}`;

            console.log(`[BRAT] Solicitando: ${apiUrl}`);

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`API error ${response.status}`);

            const pngBuffer = await response.buffer();

            // 1. Hacer la imagen cuadrada y convertirla a WebP con sharp
            const webpBuffer = await sharp(pngBuffer)
                .resize(512, 512, { fit: 'cover', position: 'center' })
                .webp({ quality: 90 })
                .toBuffer();

            // 2. Usar webp-sticker para ponerle los créditos
            const stickerBuffer = await createSticker({
                file: webpBuffer,     // La imagen ya convertida
                pack: 'Bot-API',      // El nombre del pack
                author: '⚡ Bot-API ⚡' // El autor que aparecerá al tocar
            });

            // 3. Enviar el sticker con la info
            await sock.sendMessage(msg.key.remoteJid, { 
                sticker: stickerBuffer 
            }, { quoted: msg });

            console.log('[BRAT] ✓ Sticker con créditos enviado.');

        } catch (error) {
            console.error('[BRAT] Error:', error);
            await responder.texto('❌ *BRAT*\n\nNo se pudo generar el sticker.');
        }
    }
};