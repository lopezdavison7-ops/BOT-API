// ============================================================
// COMANDO: FAKE (FAKEMSG)
// ============================================================
// Crea mensajes falsos que parecen ser de otro usuario.
// Uso: .fake @usuario texto del mensaje falso
// Ejemplo: .fake @521234567890 Hola soy un tonto
// ============================================================

export default {
    nombre: 'fake',
    categoria: 'DIVERSIÓN',
    alias: ['fakemsg', 'faketext', 'destroy'],
    descripcion: 'Crea mensajes falsos. Ejemplo: .fake @usuario mensaje',
    ejecutar: async ({ sock, msg, responder, args }) => {
        try {
            // Obtener el JID del usuario a suplantar (por mención o reply)
            const contexto = msg?.message?.extendedTextMessage?.contextInfo;
            const mencionados = contexto?.mentionedJid || [];
            const respondido = contexto?.participant || contexto?.participantAlt;
            
            // El usuario a suplantar (primera mención o el respondido)
            const targetJid = mencionados[0] || respondido || null;
            
            if (!targetJid) {
                await responder.texto('❌ Debes mencionar a alguien o responder a su mensaje.\n\nUso: `.fake @usuario mensaje falso`');
                return;
            }

            // Obtener el texto del mensaje falso
            const textoCompleto = msg?.message?.conversation || 
                                   msg?.message?.extendedTextMessage?.text || '';
            
            // Remover el comando y la mención para quedarse solo con el mensaje
            let mensajeFalso = textoCompleto
                .replace(/^\.(fake|fakemsg|faketext|destroy)\s*/i, '')
                .replace(/@\d+/g, '') // Remover @numero
                .trim();

            if (!mensajeFalso) {
                await responder.texto('❌ Escribe el mensaje falso.\n\nEjemplo: `.fake @usuario Hola soy increíble`');
                return;
            }

            // Extraer número del JID para el @mención
            const numeroTarget = targetJid.split('@')[0].split(':')[0];
            
            // Crear el mensaje falso manipulando el quoted
            // Esto hace que parezca que el targetJid envió ese mensaje
            const fakeQuoted = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    fromMe: false,
                    id: 'FAKE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    participant: targetJid // Aquí está el truco - el "remitente" falso
                },
                message: {
                    conversation: mensajeFalso
                },
                participant: targetJid
            };

            // Enviar el mensaje citando el mensaje falso
            // Esto hace que aparezca en el chat como si targetJid hubiera dicho eso
            await sock.sendMessage(msg.key.remoteJid, {
                text: `😈 Mensaje falsificado de @${numeroTarget}`,
                mentions: [targetJid]
            }, {
                quoted: fakeQuoted
            });

        } catch (error) {
            console.error('[FAKE] Error:', error);
            await responder.texto('❌ Error al crear el mensaje falso.');
        }
    }
};