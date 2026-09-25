
export default {
    nombre: 'say',
    categoria: 'Utilidades',
    alias: ['decir', 'repetir', 'send'],
    descripcion: 'Reenvía cualquier mensaje (foto, video, sticker, audio) con texto extra',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {

            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
            const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
            const textoEscrito = String(argumento || '').trim();

            if (!quotedMsg && textoEscrito) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoEscrito
                }, { quoted: msg });
                console.log('[SAY] Texto enviado.');
                return;
            }

            if (!quotedId) {
                await responder.texto('❌ No se pudo obtener el mensaje citado. Intenta responder directamente al mensaje.');
                return;
            }

            if (quotedMsg) {

                let mentions = [];
                if (textoEscrito) {
                    const mentionPattern = /@(\d+)/g;
                    const matches = textoEscrito.match(mentionPattern);
                    if (matches) {
                        mentions = matches.map(m => `${m.replace('@', '')}@s.whatsapp.net`);
                    }
                }

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

                    text: textoEscrito || undefined,
                    mentions: mentions
                }, { quoted: msg });

                console.log('[SAY] Mensaje reenviado correctamente.');
                return;
            }

            await responder.texto('❌ No se pudo reenviar el mensaje.');

        } catch (error) {
            console.error('[SAY] Error:', error);
            await responder.texto('❌ Error al reenviar el mensaje.');
        }
    }
};