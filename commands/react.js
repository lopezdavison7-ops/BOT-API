// commands/react.js
export default {
    nombre: 'react',
    categoria: 'Multimedia',
    alias: ['view', 'capturar', 'ver'],
    descripcion: 'Reenvía fotos/videos de una sola vista para verlos sin límite',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Verificar si respondió a un mensaje
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

            if (!quotedMsg || !quotedId) {
                await responder.texto(
                    `❌ *REACT*\n\n` +
                    `Responde a una foto o video de "una sola vista".\n\n` +
                    `📌 Ejemplo:\n` +
                    `(Responde a la foto) *.react*`
                );
                return;
            }

            // Verificar si es imagen o video
            const isImage = quotedMsg.imageMessage;
            const isVideo = quotedMsg.videoMessage;

            if (!isImage && !isVideo) {
                await responder.texto('❌ El mensaje respondido no es una foto o video de "una sola vista".');
                return;
            }

            // 🔥 REENVIAR EL MENSAJE ORIGINAL USANDO SU ID
            await sock.sendMessage(msg.key.remoteJid, {
                forward: {
                    key: {
                        remoteJid: msg.key.remoteJid,
                        fromMe: false,
                        id: quotedId,
                        participant: quotedParticipant
                    },
                    message: quotedMsg
                }
            }, { quoted: msg });

            console.log('[REACT] Mensaje de una sola vista reenviado correctamente.');

        } catch (error) {
            console.error('[REACT] Error:', error);
            await responder.texto('❌ Error al reenviar el mensaje.');
        }
    }
};