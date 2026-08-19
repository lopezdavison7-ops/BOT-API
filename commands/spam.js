// commands/spam.js
export default {
    nombre: 'spam',
    categoria: 'Utilidades',
    alias: ['repetir', 'masivo'],
    descripcion: 'Spam de texto, stickers, imágenes, videos y audios',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // 1. Separar argumentos
            const args = String(argumento || '').trim().split(' ');
            
            if (args.length < 1) {
                await responder.texto(
                    `❌ *SPAM*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Escribe: *.spam [cantidad] [texto]*\n` +
                    `2️⃣ Responde a un sticker/imagen/video: *.spam [cantidad]*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.spam 20 Hola a todos*\n` +
                    `*.spam 15* (respondiendo a un sticker)\n\n` +
                    `⚠️ Máximo: 30 mensajes para archivos, 50 para texto.`
                );
                return;
            }

            // 2. Obtener cantidad
            const cantidad = parseInt(args[0]);
            if (isNaN(cantidad) || cantidad < 1 || cantidad > 50) {
                await responder.texto('❌ La cantidad debe ser entre 1 y 50.');
                return;
            }

            // 3. Detectar si respondió a un mensaje con archivo
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            let tipoArchivo = 'texto';
            let bufferArchivo = null;
            let mimeArchivo = null;
            let captionArchivo = null;

            // Si respondió a un sticker
            if (quotedMsg?.stickerMessage) {
                tipoArchivo = 'sticker';
                // Para sticker, Baileys no envía buffer directo, pero podemos enviar el mismo sticker usando el ID del mensaje original o el buffer si lo tenemos
                // Esta versión mejorada usa el buffer desde el mensaje citado si es posible
                if (quotedMsg.stickerMessage.file) {
                    bufferArchivo = quotedMsg.stickerMessage.file;
                }
            }

            // Si respondió a una imagen
            if (quotedMsg?.imageMessage) {
                tipoArchivo = 'imagen';
                if (quotedMsg.imageMessage.file) {
                    bufferArchivo = quotedMsg.imageMessage.file;
                    captionArchivo = quotedMsg.imageMessage.caption || '';
                }
            }

            // Si respondió a un video
            if (quotedMsg?.videoMessage) {
                tipoArchivo = 'video';
                if (quotedMsg.videoMessage.file) {
                    bufferArchivo = quotedMsg.videoMessage.file;
                    captionArchivo = quotedMsg.videoMessage.caption || '';
                }
            }

            // Si respondió a un audio
            if (quotedMsg?.audioMessage) {
                tipoArchivo = 'audio';
                if (quotedMsg.audioMessage.file) {
                    bufferArchivo = quotedMsg.audioMessage.file;
                    mimeArchivo = quotedMsg.audioMessage.mimetype;
                }
            }

            // 4. Texto adicional (para acompañar el spam de archivos)
            let textoAdicional = args.slice(1).join(' ');
            let mentions = [];

            // Detectar menciones en el texto adicional
            if (textoAdicional) {
                const mentionPattern = /@(\d+)/g;
                const matches = textoAdicional.match(mentionPattern);
                if (matches) {
                    mentions = matches.map(m => `${m.replace('@', '')}@s.whatsapp.net`);
                }
            }

            // 5. Si es spam de texto normal (no respondió a un archivo)
            if (tipoArchivo === 'texto' && !quotedMsg) {
                // Si no hay texto escrito, error
                if (!textoAdicional && !args.slice(1).join(' ')) {
                    await responder.texto('❌ Escribe un texto para spamear.');
                    return;
                }
                // Si hay texto, usar el texto
                if (textoAdicional) {
                    // Ya está en textoAdicional
                } else {
                    textoAdicional = args.slice(1).join(' ');
                }

                for (let i = 0; i < cantidad; i++) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: textoAdicional,
                        mentions: mentions
                    }, { quoted: msg });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                await responder.texto(`✅ *SPAM DE TEXTO COMPLETADO*\n\n📩 ${cantidad} mensajes enviados.`);
                return;
            }

            // 6. Si es spam de archivo (sticker/imagen/video/audio)
            if (!bufferArchivo) {
                await responder.texto('❌ No se pudo obtener el archivo del mensaje citado.');
                return;
            }

            // Límite más estricto para archivos (evita saturar)
            if (cantidad > 30) {
                await responder.texto('❌ Para archivos, el máximo es 30 repeticiones.');
                return;
            }

            // 7. Enviar el spam de archivo
            for (let i = 0; i < cantidad; i++) {
                if (tipoArchivo === 'sticker') {
                    await sock.sendMessage(msg.key.remoteJid, {
                        sticker: bufferArchivo
                    }, { quoted: msg });
                } else if (tipoArchivo === 'imagen') {
                    await sock.sendMessage(msg.key.remoteJid, {
                        image: bufferArchivo,
                        caption: textoAdicional || captionArchivo || '',
                        mentions: mentions
                    }, { quoted: msg });
                } else if (tipoArchivo === 'video') {
                    await sock.sendMessage(msg.key.remoteJid, {
                        video: bufferArchivo,
                        caption: textoAdicional || captionArchivo || '',
                        mentions: mentions
                    }, { quoted: msg });
                } else if (tipoArchivo === 'audio') {
                    await sock.sendMessage(msg.key.remoteJid, {
                        audio: bufferArchivo,
                        mimetype: mimeArchivo || 'audio/mpeg'
                    }, { quoted: msg });
                }
                await new Promise(resolve => setTimeout(resolve, 800)); // Pausa más larga para archivos
            }

            // 8. Mensaje de confirmación
            const tipoNombre = {
                sticker: 'Sticker',
                imagen: 'Imagen',
                video: 'Video',
                audio: 'Audio'
            }[tipoArchivo] || 'Archivo';

            await responder.texto(`✅ *SPAM DE ${tipoNombre.toUpperCase()} COMPLETADO*\n\n📩 ${cantidad} ${tipoNombre}(s) enviados.`);

            console.log(`[SPAM] ${cantidad} ${tipoArchivo}(s) enviados.`);

        } catch (error) {
            console.error('[SPAM] Error:', error);
            await responder.texto('❌ Error al enviar el spam.');
        }
    }
};