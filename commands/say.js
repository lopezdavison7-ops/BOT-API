// commands/say.js
export default {
    nombre: 'say',
    categoria: 'Utilidades',
    alias: ['decir', 'repetir', 'send'],
    descripcion: 'Reenvía cualquier mensaje (foto, video, sticker, audio) con texto extra',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Obtener información del mensaje citado
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            const textoEscrito = String(argumento || '').trim();

            // 1. Si NO respondió a nada y solo escribió texto
            if (!quotedMsg && textoEscrito) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoEscrito
                }, { quoted: msg });
                console.log('[SAY] Texto enviado.');
                return;
            }

            // 2. Si respondió pero no hay ID (error de seguridad)
            if (!quotedId) {
                await responder.texto('❌ No se pudo obtener el mensaje citado. Intenta responder directamente al mensaje.');
                return;
            }

            // 3. Si respondió a un archivo, reenviarlo completo con texto opcional
            if (quotedMsg) {
                // Detectar menciones en el texto escrito
                let mentions = [];
                if (textoEscrito) {
                    const mentionPattern = /@(\d+)/g;
                    const matches = textoEscrito.match(mentionPattern);
                    if (matches) {
                        mentions = matches.map(m => `${m.replace('@', '')}@s.whatsapp.net`);
                    }
                }

                // 🔥 REENVÍO DIRECTO DEL MENSAJE COMPLETO
                await sock.sendMessage(msg.key.remoteJid, {
                    forward: {
                        key: {
                            remoteJid: msg.key.remoteJid,
                            fromMe: false,
                            id: quotedId,
                            participant: quotedParticipant
                        },
                        message: quotedMsg
                    },
                    // Si escribiste texto, se agrega como caption (si es imagen/video) o como mensaje aparte
                    text: textoEscrito || undefined,
                    mentions: mentions
                }, { quoted: msg });

                console.log('[SAY] Mensaje reenviado correctamente.');
                return;
            }

            // 4. Si no se pudo hacer nada
            await responder.texto('❌ No se pudo reenviar el mensaje.');

        } catch (error) {
            console.error('[SAY] Error:', error);
            await responder.texto('❌ Error al reenviar el mensaje.');
        }
    }
};