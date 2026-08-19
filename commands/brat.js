// commands/brat.js
import fetch from 'node-fetch';

export default {
    nombre: 'brat',
    categoria: 'Multimedia',
    alias: ['bratwhite', 'bratblanco'],
    descripcion: 'Genera un sticker BRAT en color blanco usando YO SOY YO',
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

            // 🔥 URL directa a la imagen (sin esperar JSON)
            const apiUrl = `https://apiyosoyyo-ofc.onrender.com/api/brat?text=${encodeURIComponent(texto)}&color=${color}&apiKey=${apiKey}`;

            console.log(`[BRAT] Solicitando: ${apiUrl}`);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`API respondió con ${response.status}`);
            }

            // ✅ Aquí el cambio clave: usamos .buffer() directamente
            const buffer = await response.buffer();

            // Enviar como sticker con crédito
            await sock.sendMessage(msg.key.remoteJid, {
                sticker: buffer,
                caption: `⚡ Creado por *Bot-API* ⚡`
            }, { quoted: msg });

            console.log('[BRAT] ✓ Sticker enviado correctamente.');

        } catch (error) {
            console.error('[BRAT] Error:', error);
            await responder.texto('❌ *BRAT*\n\nNo se pudo generar el sticker. Inténtalo nuevamente.');
        }
    }
};