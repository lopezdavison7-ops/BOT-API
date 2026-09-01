// ============================================================
// COMANDO: FAKE / DESTROY
// ============================================================
// Crea mensajes falsos que aparecen como si fueran de otro usuario
// en el chat. Cuando intentan responder, WhatsApp dice que no existe.
// 
// Uso: .fake @usuario mensaje
// Ejemplo: .fake @521234567890 Hola soy un crack
// ============================================================

export default {
    nombre: 'fake',
    categoria: 'DIVERSIÓN',
    alias: ['fakemsg', 'destroy', 'suplantar'],
    descripcion: 'Crea mensajes falsos que parecen ser de otro usuario',
    ejecutar: async ({ sock, msg, responder, args }) => {
        try {
            // Obtener el JID del usuario a suplantar
            const contexto = msg?.message?.extendedTextMessage?.contextInfo;
            const mencionados = contexto?.mentionedJid || [];
            const respondido = contexto?.participant || contexto?.participantAlt;
            
            const targetJid = mencionados[0] || respondido || null;
            
            if (!targetJid) {
                await responder.texto('❌ Menciona a alguien o responde a su mensaje.\n\nUso: `.fake @usuario mensaje`');
                return;
            }

            // Obtener el texto del mensaje falso
            const textoCompleto = msg?.message?.conversation || 
                                   msg?.message?.extendedTextMessage?.text || '';
            
            let mensajeFalso = textoCompleto
                .replace(/^\.(fake|fakemsg|destroy|suplantar)\s*/i, '')
                .replace(/@\d+/g, '')
                .trim();

            if (!mensajeFalso) {
                await responder.texto('❌ Escribe el mensaje falso.\n\nEjemplo: `.fake @usuario Soy el mejor`');
                return;
            }

            // Crear el mensaje con el participant manipulado
            // Esto hace que parezca que targetJid envió el mensaje
            const fakeMessage = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    fromMe: false,
                    id: '3EB0' + Date.now().toString(16).toUpperCase() + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    participant: targetJid // El truco - el "remitente" falso
                },
                message: {
                    conversation: mensajeFalso
                },
                messageTimestamp: Math.floor(Date.now() / 1000),
                participant: targetJid,
                status: 1
            };

            // Usar relayMessage para insertar el mensaje sin modificarlo
            await sock.relayMessage(msg.key.remoteJid, fakeMessage.message, {
                messageId: fakeMessage.key.id,
                participant: targetJid
            });

            // Borrar el mensaje del comando para que no se vea
            // (opcional, si quieres que solo se vea el mensaje falso)
            try {
                await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
            } catch (e) {
                // Si no puede borrar, no pasa nada
            }

        } catch (error) {
            console.error('[FAKE] Error:', error);
            await responder.texto('❌ Error al crear el mensaje falso.');
        }
    }
};