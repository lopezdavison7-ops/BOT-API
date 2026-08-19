// commands/gstatus.js
import { 
  generateWAMessageContent, 
  generateWAMessageFromContent, 
  jidNormalizedUser,
  downloadMediaMessage
} from "@whiskeysockets/baileys";
import fs from 'fs/promises';

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

            // 🔥 FUNCIÓN INTERNA PARA SUBIR EL ESTADO (GROUP STATUS V2)
            const sendGroupStatus = async (text, media, type, caption) => {
                // Configuración del contexto del estado
                const contextInfo = {
                    statusSourceType: 0,
                    isGroupStatus: true,
                    statusAttributions: [{ AttributionData: null, type: 10 }],
                    statusAudienceMetadata: { audienceType: 2, listName: "Grupo", listEmoji: "⭐" }
                };

                let innerMessage;

                // CASO: TEXTO
                if (type === 'text') {
                    innerMessage = {
                        extendedTextMessage: {
                            text: text || 'Estado del grupo',
                            textArgb: 4292401368, // Color blanco
                            backgroundArgb: 4283453520, // Fondo oscuro
                            font: 5,
                            previewType: 0,
                            contextInfo
                        }
                    };
                } 
                // CASO: MULTIMEDIA (Foto, Video, Audio, Sticker)
                else {
                    if (!sock.waUploadToServer) {
                        throw new Error('El servidor de carga no está disponible.');
                    }

                    const contentInput = { [type]: media };
                    if (caption && ['image', 'video'].includes(type)) {
                        contentInput.caption = caption;
                    }

                    const content = await generateWAMessageContent(contentInput, {
                        upload: sock.waUploadToServer,
                    });

                    const messageKey = `${type}Message`;
                    if (!content?.[messageKey]) {
                        throw new Error(`No se pudo generar el mensaje de tipo ${type}`);
                    }

                    content[messageKey].contextInfo = contextInfo;
                    innerMessage = { [messageKey]: content[messageKey] };
                }

                // Generar y enviar el mensaje de estado
                const senderJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : undefined;
                const message = generateWAMessageFromContent(
                    remoteJid,
                    { groupStatusMessageV2: { message: innerMessage } },
                    { userJid: senderJid }
                );

                await sock.relayMessage(remoteJid, message.message, {
                    messageId: message.key.id,
                });
                return message;
            };

            // 1. CASO: SOLO TEXTO
            if (!quotedMsg && textoEscrito) {
                await sendGroupStatus(textoEscrito, null, 'text', null);
                await responder.texto(`✅ *ESTADO PUBLICADO*\n\n📝 Texto subido a la cabecera del grupo.`);
                return;
            }

            // 2. CASO: MULTIMEDIA (RESPONDIENDO A UN ARCHIVO)
            if (quotedMsg) {
                const type = Object.keys(quotedMsg)[0];
                const mediaType = type.replace('Message', '').toLowerCase();

                // Tipos soportados
                const allowedTypes = ['image', 'video', 'audio', 'sticker', 'document'];
                if (!allowedTypes.includes(mediaType)) {
                    await responder.texto('❌ El archivo respondido no es compatible con estados de grupo.');
                    return;
                }

                // Descargar el archivo del mensaje citado
                let buffer;
                try {
                    const quotedCtx = msg.message?.extendedTextMessage?.contextInfo;
                    buffer = await downloadMediaMessage(
                        {
                            key: {
                                remoteJid: remoteJid,
                                id: quotedCtx?.stanzaId,
                                participant: quotedCtx?.participant,
                                fromMe: false
                            },
                            message: quotedMsg
                        },
                        'buffer',
                        {},
                        { logger: console, reuploadRequest: sock.updateMediaMessage }
                    );
                } catch (err) {
                    console.error('[GSTATUS] Error descargando:', err);
                    await responder.texto('❌ No se pudo descargar el archivo del mensaje citado.');
                    return;
                }

                const caption = textoEscrito || quotedMsg[type]?.caption || '';
                
                // Subir el estado
                await sendGroupStatus(null, buffer, mediaType, caption);
                await responder.texto(`✅ *ESTADO PUBLICADO*\n\n📤 ${mediaType.toUpperCase()} subido a la cabecera del grupo.`);
                return;
            }

        } catch (error) {
            console.error('[GSTATUS] Error:', error);
            await responder.texto(`❌ *ERROR*\n\nNo se pudo publicar el estado. Verifica que el bot tenga permisos.`);
        }
    }
};