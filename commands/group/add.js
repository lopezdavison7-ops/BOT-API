// commands/grupos/tumbar.js
import { esGrupo } from '../../lib/grupos.js';

const DEFECTO = 100;
const MAXIMO = 1000;
const LOTE = 50;
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
            Math.max(parseInt(partes[0]) || DEFECTO, 1),
            MAXIMO
        );

        const texto = partes.slice(1).join(' ') || null;

        try {
            // ráfagas paralelas, sin pausa entre tandas
            for (let i = 0; i < cantidad; i += LOTE) {
                const fin = Math.min(i + LOTE, cantidad);

                await Promise.all(
                    Array.from({ length: fin - i }, (_, k) => {
                        const n = i + k + 1;

                        return sock.sendMessage(chatId, {
                            text: texto
                                ? texto
                                : `${EMOJIS[n % EMOJIS.length]} ${n}`
                        });
                    })
                );
            }

            await responder.texto(
                `✅ Tumbado con *${cantidad}* mensaje(s).`
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