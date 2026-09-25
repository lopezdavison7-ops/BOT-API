

export default {
    nombre: 'fake',
    categoria: 'DIVERSIÓN',
    alias: ['fakemsg', 'faketext', 'destroy'],
    descripcion: 'Crea mensajes falsos. Ejemplo: .fake @usuario mensaje',
    ejecutar: async ({ sock, msg, responder, args }) => {
        try {

            const contexto = msg?.message?.extendedTextMessage?.contextInfo;
            const mencionados = contexto?.mentionedJid || [];
            const respondido = contexto?.participant || contexto?.participantAlt;

            const targetJid = mencionados[0] || respondido || null;

            if (!targetJid) {
                await responder.texto('❌ Debes mencionar a alguien o responder a su mensaje.\n\nUso: `.fake @usuario mensaje falso`');
                return;
            }

            const textoCompleto = msg?.message?.conversation ||
                                   msg?.message?.extendedTextMessage?.text || '';

            let mensajeFalso = textoCompleto
                .replace(/^\.(fake|fakemsg|faketext|destroy)\s*/i, '')
                .replace(/@\d+/g, '')
                .trim();

            if (!mensajeFalso) {
                await responder.texto('❌ Escribe el mensaje falso.\n\nEjemplo: `.fake @usuario Hola soy increíble`');
                return;
            }

            const numeroTarget = targetJid.split('@')[0].split(':')[0];

            const fakeQuoted = {
                key: {
                    remoteJid: msg.key.remoteJid,
                    fromMe: false,
                    id: 'FAKE_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    participant: targetJid
                },
                message: {
                    conversation: mensajeFalso
                },
                participant: targetJid
            };

            await sock.sendMessage(msg.key.remoteJid, {
                text: `😈 Mensaje de @${numeroTarget}`,
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