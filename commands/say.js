// commands/say.js
export default {
    nombre: 'say',
    categoria: 'Utilidades',
    alias: ['decir', 'repetir'],
    descripcion: 'Repite un mensaje (escribe texto o responde a un mensaje)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            let texto = String(argumento || '').trim();
            let mentions = [];

            // FORMA 1: Respondiendo a un mensaje (toma el texto del mensaje citado)
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && quotedMsg.conversation) {
                texto = quotedMsg.conversation;
            } else if (quotedMsg && quotedMsg.extendedTextMessage) {
                texto = quotedMsg.extendedTextMessage.text;
            }

            // FORMA 2: Si respondió y además escribió texto, usa lo que escribió
            if (argumento && argumento.trim()) {
                texto = argumento.trim();
            }

            // Si no hay texto, mostrar ayuda
            if (!texto) {
                await responder.texto(
                    `❌ *SAY*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Escribe el texto: *.say Hola*\n` +
                    `2️⃣ Responde a un mensaje: *.say* (sin texto)\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.say Buenos días*\n` +
                    `*.say* (respondiendo a un mensaje)`
                );
                return;
            }

            // Detectar menciones (@usuario) en el texto
            const mentionPattern = /@(\d+)/g;
            const matches = texto.match(mentionPattern);
            if (matches) {
                mentions = matches.map(m => `${m.replace('@', '')}@s.whatsapp.net`);
            }

            // Enviar el mensaje con texto + menciones
            await sock.sendMessage(msg.key.remoteJid, {
                text: texto,
                mentions: mentions
            }, { quoted: msg });

            console.log('[SAY] Mensaje enviado correctamente.');

        } catch (error) {
            console.error('[SAY] Error:', error);
            await responder.texto('❌ Error al enviar el mensaje.');
        }
    }
};