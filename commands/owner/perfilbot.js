
import { downloadMediaMessage } from 'baileys';

export default {
    nombre: 'perfilbot',
    alias: ['fotobot'],
    owner: true,

    async ejecutar({ sock, msg, responder, argumento }) {
        try {
            let imagen = null;

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

            if (!imagen && argumento) {
                if (
                    /^https?:\/\/\S+$/i.test(argumento)
                ) {
                    imagen = {
                        url: argumento
                    };
                }
            }

            if (!imagen) {
                await responder.texto(
                    `╭━━〔 🖼️ 𝐏𝐄𝐑𝐅𝐈𝐋 𝐃𝐄𝐋 𝐁𝐎𝐓 〕━━⬣\n` +
                    `┃\n` +
                    `┃ Por favor, cita una imagen o envía un enlace directo a una imagen.\n` +
                    `┃\n` +
                    `┃ 📌 Ejemplos:\n` +
                    `┃ • Cita una imagen y escribe *.perfilbot*\n` +
                    `┃ • *.perfilbot https://ejemplo.com/foto.jpg*\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━⬣`
                );

                return;
            }

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