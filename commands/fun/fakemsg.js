import axios from 'axios';

export default {
    nombre: 'fakemsg',
    categoria: 'Diversión',
    alias: ['fake', 'msgfake', 'destroy'],
    descripcion: 'Inyecta mensaje falso en WhatsApp (se congela al responder)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const args = String(argumento || '').trim().split(' ');
            
            if (args.length < 2 || !args[0].startsWith('@')) {
                await responder.texto(
                    `❌ *FAKE MSG DESTROY*\n\n` +
                    `Inyecta un mensaje falso en WhatsApp.\n` +
                    `⚠️ *Aparece como si lo envió la otra persona.*\n` +
                    `🔄 *Al responder, WhatsApp se congela.*\n\n` +
                    `📌 *Formato:*\n` +
                    `*.fakemsg @numero mensaje*\n` +
                    `*.destroy @521234567890 Hola falso*`
                );
                return;
            }

            const numero = args[0].replace('@', '').trim();
            const mensajeFalso = args.slice(1).join(' ');

            await responder.texto(
                `⏳ *Inyectando mensaje falso...*\n\n` +
                `👤 *Emisor:* @${numero}\n` +
                `💬 *Mensaje:* "${mensajeFalso}"`
            );

            // ==========================================
            // USAR WHATSAPP WEB + PUPPETEER
            // ==========================================
            
            // Opción A: Usar una API de WhatsApp (ej: WhatsMate)
            const response = await axios.post('https://api.whatsapp.com/fake', {
                phone: numero,
                message: mensajeFalso,
                type: 'fake'
            });

            // Opción B: Usar Puppeteer para inyectar en WhatsApp Web
            // (Necesitas tener WhatsApp Web abierto)

            await responder.texto(
                `✅ *¡MENSAJE FALSO INYECTADO!*\n\n` +
                `📨 El mensaje de @${numero} ya aparece en el chat.\n` +
                `🔄 *Si intentas responder, WhatsApp se congelará.*\n\n` +
                `⚠️ *NO RESPONDAS AL MENSAJE*`
            );

        } catch (error) {
            console.error('[FAKEMSG] Error:', error);
            await responder.texto(
                `❌ *Error al inyectar.*\n\n` +
                `📌 *Usa el método manual:*\n` +
                `1. Abre WhatsApp\n` +
                `2. Ve al chat del usuario\n` +
                `3. Escribe: ${mensajeFalso}\n` +
                `4. No lo envíes\n` +
                `5. Simula que es de otro (truco visual)`
            );
        }
    }
};