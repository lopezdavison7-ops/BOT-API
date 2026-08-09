import { downloadMediaMessage } from 'baileys';

export default {
    nombre: 'perfilbot',
    alias: ['fotobot'],
    owner: true,

    async ejecutar({ sock, msg, responder, argumento }) {
        try {
            let imagen = null;

            // ====================================================
            // 1. IMAGEN CITADA
            // ====================================================

            const citado =
                msg.message?.extendedTextMessage?.contextInfo
                    ?.quotedMessage;

            if (citado?.imageMessage) {
                const mensajeCitado = {
                    key: {
                        remoteJid:
                            msg.key.remoteJid,
                        id:
                            msg.message.extendedTextMessage
                                ?.contextInfo?.stanzaId,
                        fromMe: false
                    },
                    message: citado
                };

                imagen = await downloadMediaMessage(
                    mensajeCitado,
                    'buffer',
                    {},
                    {
                        reuploadRequest:
                            sock.updateMediaMessage
                    }
                );
            }

            // ====================================================
            // 2. IMAGEN ENVIADA DIRECTAMENTE CON EL COMANDO
            // ====================================================

            if (!imagen && msg.message?.imageMessage) {
                imagen = await downloadMediaMessage(
                    msg,
                    'buffer',
                    {},
                    {
                        reuploadRequest:
                            sock.updateMediaMessage
                    }
                );
            }

            // ====================================================
            // 3. ENLACE DE IMAGEN
            // ====================================================

            if (!imagen && argumento) {
                if (
                    /^https?:\/\/\S+$/i.test(argumento)
                ) {
                    imagen = {
                        url: argumento
                    };
                }
            }

            // ====================================================
            // 4. SI NO HAY IMAGEN
            // ====================================================

            if (!imagen) {
                await responder.texto(
                    '🖼️ *PERFIL DEL BOT*\n\n' +
                    'Por favor, cita una imagen o envía un enlace directo a una imagen.\n\n' +
                    'Ejemplos:\n' +
                    '• Cita una imagen y escribe *.perfilbot*\n' +
                    '• *.perfilbot https://ejemplo.com/foto.jpg*'
                );

                return;
            }

            // ====================================================
            // 5. CAMBIAR FOTO DEL BOT
            // ====================================================

            await responder.texto(
                '⏳ Cambiando la foto del perfil del bot...'
            );

            await sock.updateProfilePicture(
                sock.user.id,
                imagen
            );

            await responder.texto(
                '✅ *Foto del bot actualizada correctamente.*'
            );

        } catch (error) {
            console.error(
                '[PERFILBOT]',
                error
            );

            await responder.texto(
                '❌ No pude cambiar la foto del perfil.\n\n' +
                `Error: ${error.message}`
            );
        }
    }
};
