// commands/grupos/tumbar.js
import { esGrupo } from '../../lib/grupos.js';

const EMOJIS = ['🔥', '⚡', '💥', '🚀'];

export default {
    nombre: 'tumbar',
    categoria: 'grupos',
    alias: ['spam', 'flood'],
    descripcion: 'Tumba el grupo a puro spam de mensajes. Uso: .tumbar [cantidad] [texto]',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const chatId = msg.key.remoteJid;

        if (!esGrupo(chatId)) {
            return responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );
        }

        const partes = String(argumento || '').trim().split(/\s+/);

        const cantidad = Math.min(
            Math.max(parseInt(partes[0]) || 30, 1),
            500
        );

        const texto = partes.slice(1).join(' ') || null;

        try {
            // SPAM: todos los mensajes disparados de golpe, sin esperar
            await Promise.all(
                Array.from({ length: cantidad }, (_, i) =>
                    sock.sendMessage(chatId, {
                        text: texto
                            ? texto
                            : `${EMOJIS[i % EMOJIS.length]} ${i + 1}`
                    })
                )
            );

            await responder.texto(
                `✅ Grupo tumbado con *${cantidad}* mensaje(s).`
            );

        } catch (error) {
            console.error(
                '[TUMBAR]',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '⚠️ No se pudo tumbar el grupo.'
            );
        }
    }
};