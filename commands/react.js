// commands/react.js
export default {
    nombre: 'react',
    categoria: 'Multimedia',
    alias: ['view', 'capturar', 'ver'],
    descripcion: 'Captura y reenvía fotos/videos de una sola vista',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Verificar si respondió a un mensaje
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMsg) {
                await responder.texto(
                    `❌ *REACT*\n\n` +
                    `Responde a una foto o video de "una sola vista".\n\n` +
                    `📌 Ejemplo:\n` +
                    `(Responde a la foto) *.react*`
                );
                return;
            }

            // ✅ CAPTURAR IMAGEN DE UNA SOLA VISTA
            if (quotedMsg.imageMessage) {
                const imageBuffer = quotedMsg.imageMessage.file;
                const caption = quotedMsg.imageMessage.caption || '🖼️ Foto de una sola vista capturada';

                if (!imageBuffer) {
                    await responder.texto('❌ No se pudo obtener la imagen del mensaje.');
                    return;
                }

                await sock.sendMessage(msg.key.remoteJid, {
                    image: imageBuffer,
                    caption: `${caption}\n\n⚡ Capturado por Bot-API`
                }, { quoted: msg });

                console.log('[REACT] Imagen de una sola vista capturada y reenviada.');
                return;
            }

            // ✅ CAPTURAR VIDEO DE UNA SOLA VISTA
            if (quotedMsg.videoMessage) {
                const videoBuffer = quotedMsg.videoMessage.file;
                const caption = quotedMsg.videoMessage.caption || '🎥 Video de una sola vista capturado';

                if (!videoBuffer) {
                    await responder.texto('❌ No se pudo obtener el video del mensaje.');
                    return;
                }

                await sock.sendMessage(msg.key.remoteJid, {
                    video: videoBuffer,
                    caption: `${caption}\n\n⚡ Capturado por Bot-API`
                }, { quoted: msg });

                console.log('[REACT] Video de una sola vista capturado y reenviado.');
                return;
            }

            // ❌ Si no es imagen ni video
            await responder.texto('❌ El mensaje respondido no contiene una foto o video de "una sola vista".');

        } catch (error) {
            console.error('[REACT] Error:', error);
            await responder.texto('❌ Error al capturar el archivo.');
        }
    }
};