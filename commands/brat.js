// commands/brat.js
import fetch from 'node-fetch';

export default {
    nombre: 'brat',
    categoria: 'Multimedia',
    alias: ['bratwhite', 'bratblanco'],
    descripcion: 'Genera un sticker BRAT en color blanco',
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

            const apiUrl = `https://apiyosoyyo-ofc.onrender.com/api/brat?text=${encodeURIComponent(texto)}&color=${color}&apiKey=yosoyyo_sk_gincmnk3`;

            console.log(`[BRAT] Solicitando: ${apiUrl}`);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API respondió con ${response.status}`);
            }

            const data = await response.json();
            
            if (!data || !data.data || !data.data.url) {
                throw new Error('La API no devolvió una URL válida.');
            }

            const imageUrl = `https://apiyosoyyo-ofc.onrender.com${data.data.url}`;
            console.log(`[BRAT] URL de imagen: ${imageUrl}`);

            // Descargar la imagen
            const imgResponse = await fetch(imageUrl);
            const buffer = await imgResponse.buffer();

            // ✅ Enviar el sticker con el crédito en el caption
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: buffer,
                caption: `⚡ Creado por *Bot-API* ⚡`
            }, { quoted: msg });

            console.log('[BRAT] ✓ Sticker enviado con créditos.');

        } catch (error) {
            console.error('[BRAT] Error:', error);
            await responder.texto('❌ *BRAT*\n\nNo se pudo generar el sticker. Inténtalo nuevamente.');
        }
    }
};