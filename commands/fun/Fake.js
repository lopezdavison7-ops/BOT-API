// ============================================================
// COMANDO: FAKE V2 - Más agresivo
// ============================================================

export default {
    nombre: 'fake',
    categoria: 'DIVERSIÓN',
    alias: ['fakemsg', 'destroy', 'suplantar'],
    descripcion: 'Crea mensajes falsos',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const contexto = msg?.message?.extendedTextMessage?.contextInfo;
            const mencionados = contexto?.mentionedJid || [];
            const respondido = contexto?.participant || contexto?.participantAlt;
            
            const targetJid = mencionados[0] || respondido || null;
            
            if (!targetJid) {
                await responder.texto('❌ Menciona a alguien.\n\nUso: `.fake @usuario mensaje`');
                return;
            }

            const textoCompleto = msg?.message?.conversation || 
                                   msg?.message?.extendedTextMessage?.text || '';
            
            let mensajeFalso = textoCompleto
                .replace(/^\.(fake|fakemsg|destroy|suplantar)\s*/i, '')
                .replace(/@\d+/g, '')
                .trim();

            if (!mensajeFalso) {
                await responder.texto('❌ Escribe el mensaje.');
                return;
            }

            // Crear mensaje con contextInfo manipulado
            const messageContent = {
                extendedTextMessage: {
                    text: mensajeFalso,
                    contextInfo: {
                        participant: targetJid,
                        mentionedJid: [targetJid],
                        remoteJid: msg.key.remoteJid,
                        quotedMessage: null
                    }
                }
            };

            // Enviar como si fuera de ese usuario
            await sock.sendMessage(msg.key.remoteJid, messageContent, {
                quoted: null,
                ephemeralExpiration: 0
            });

        } catch (error) {
            console.error('[FAKE] Error:', error);
            await responder.texto('❌ Error.');
        }
    }
};