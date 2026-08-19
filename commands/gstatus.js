// commands/gstatus.js
export default {
    nombre: 'gstatus',
    categoria: 'Utilidades',
    alias: ['estado', 'groupstatus'],
    descripcion: 'Publica un estado real en la cabecera del grupo',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            const remoteJid = msg.key.remoteJid;

            // ⚠️ SOLO GRUPOS
            if (!remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            // ✅ Obtener contenido
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const textoEscrito = String(argumento || '').trim();

            // ❌ Si no hay texto ni contenido
            if (!textoEscrito && !quotedMsg) {
                await responder.texto(
                    `❌ *GSTATUS*\n\n` +
                    `Escribe un texto o responde a una foto/video/audio/sticker.\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.gstatus Hola grupo*\n` +
                    `*.gstatus* (respondiendo a una foto)`
                );
                return;
            }

            // 1. CASO: SOLO TEXTO
            if (!quotedMsg && textoEscrito) {
                // Enviar estado de grupo V2 (texto)
                const statusMessage = {
                    groupStatusMessageV2: {
                        message: {
                            extendedTextMessage: {
                                text: textoEscrito,
                                textArgb: 4292401368, // Blanco
                                backgroundArgb: 4283453520, // Fondo oscuro
                                font: 5,
                                previewType: 0,
                                contextInfo: {
                                    isGroupStatus: true,
                                    statusSourceType: 0,
                                    statusAttributions: [{ AttributionData: null, type: 10 }]
                                }
                            }
                        }
                    }
                };

                await sock.sendMessage(remoteJid, statusMessage);
                await responder.texto(`✅ *ESTADO PUBLICADO*\n\n📝 Texto subido a la cabecera del grupo.`);
                return;
            }

            // 2. CASO: MULTIMEDIA (RESPONDIENDO A UN ARCHIVO)
            if (quotedMsg) {
                // Usar el reenvío directo del mensaje citado como estado de grupo
                const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

                if (!quotedId) {
                    await responder.texto('❌ No se pudo obtener el mensaje citado.');
                    return;
                }

                // Construir el mensaje de estado de grupo con el archivo citado
                const statusMessage = {
                    groupStatusMessageV2: {
                        message: quotedMsg
                    }
                };

                await sock.sendMessage(remoteJid, statusMessage);
                await responder.texto(`✅ *ESTADO PUBLICADO*\n\n📤 Archivo subido a la cabecera del grupo.`);
                return;
            }

        } catch (error) {
            console.error('[GSTATUS] Error:', error);
            await responder.texto(`❌ *ERROR*\n\nNo se pudo publicar el estado. Verifica que el bot tenga permisos.`);
        }
    }
};