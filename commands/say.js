// commands/say.js
export default {
    nombre: 'say',
    categoria: 'Utilidades',
    alias: ['decir', 'repetir', 'send'],
    descripcion: 'Envía texto, fotos, vídeos, stickers o audios (responde o escribe)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // 1. Obtener el mensaje citado (si existe)
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const textoEscrito = String(argumento || '').trim();
            let textoFinal = textoEscrito;

            // 2. Si NO respondió a nada y solo escribió texto
            if (!quotedMsg && textoEscrito) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoEscrito
                }, { quoted: msg });
                console.log('[SAY] Texto enviado.');
                return;
            }

            // 3. Si respondió a un mensaje y no escribió nada, usa el texto del mensaje citado
            if (quotedMsg && !textoEscrito) {
                if (quotedMsg.conversation) {
                    textoFinal = quotedMsg.conversation;
                } else if (quotedMsg.extendedTextMessage) {
                    textoFinal = quotedMsg.extendedTextMessage.text;
                } else {
                    textoFinal = '📎 Mensaje reenviado';
                }
            }

            // 4. Detectar menciones en el texto (@usuario)
            let mentions = [];
            if (textoFinal) {
                const mentionPattern = /@(\d+)/g;
                const matches = textoFinal.match(mentionPattern);
                if (matches) {
                    mentions = matches.map(m => `${m.replace('@', '')}@s.whatsapp.net`);
                }
            }

            // 5. Si respondió a un sticker
            if (quotedMsg?.stickerMessage) {
                const stickerBuffer = quotedMsg.stickerMessage.file;
                if (stickerBuffer) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        sticker: stickerBuffer
                    }, { quoted: msg });
                    console.log('[SAY] Sticker enviado.');
                    return;
                }
            }

            // 6. Si respondió a una imagen
            if (quotedMsg?.imageMessage) {
                const imageBuffer = quotedMsg.imageMessage.file;
                const captionOriginal = quotedMsg.imageMessage.caption || '';
                if (imageBuffer) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        image: imageBuffer,
                        caption: textoFinal || captionOriginal,
                        mentions: mentions
                    }, { quoted: msg });
                    console.log('[SAY] Imagen enviada.');
                    return;
                }
            }

            // 7. Si respondió a un video
            if (quotedMsg?.videoMessage) {
                const videoBuffer = quotedMsg.videoMessage.file;
                const captionOriginal = quotedMsg.videoMessage.caption || '';
                if (videoBuffer) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        video: videoBuffer,
                        caption: textoFinal || captionOriginal,
                        mentions: mentions
                    }, { quoted: msg });
                    console.log('[SAY] Video enviado.');
                    return;
                }
            }

            // 8. Si respondió a un audio
            if (quotedMsg?.audioMessage) {
                const audioBuffer = quotedMsg.audioMessage.file;
                const mimetype = quotedMsg.audioMessage.mimetype || 'audio/mpeg';
                if (audioBuffer) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        audio: audioBuffer,
                        mimetype: mimetype
                    }, { quoted: msg });
                    console.log('[SAY] Audio enviado.');
                    return;
                }
            }

            // 9. Si respondió a un mensaje de texto pero no había imagen/video/sticker
            if (quotedMsg && textoFinal) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoFinal,
                    mentions: mentions
                }, { quoted: msg });
                console.log('[SAY] Texto del mensaje citado reenviado.');
                return;
            }

            // 10. Si no se pudo hacer nada
            await responder.texto('❌ *SAY*\n\nNo se pudo enviar el contenido. Asegúrate de responder a un mensaje válido.');

        } catch (error) {
            console.error('[SAY] Error:', error);
            await responder.texto('❌ Error al enviar el mensaje.');
        }
    }
};