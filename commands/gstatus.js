// commands/gstatus.js
export default {
    nombre: 'gstatus',
    categoria: 'Utilidades',
    alias: ['estado', 'groupstatus'],
    descripcion: 'Publica un estado real en la cabecera del grupo (pantalla completa)',
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

            // 🔥 TRUCO: Publicar en el estado del grupo usando status@broadcast + contexto del grupo
            const statusJid = 'status@broadcast';

            // 1. CASO: SOLO TEXTO (pantalla completa, fondo oscuro)
            if (!quotedMsg && textoEscrito) {
                await sock.sendMessage(statusJid, {
                    text: textoEscrito,
                    contextInfo: {
                        remoteJid: remoteJid,
                        isGroupStatus: true,
                        statusSourceType: 0,
                        statusAttributions: [{ AttributionData: null, type: 10 }],
                        statusAudienceMetadata: {
                            audienceType: 2,
                            listName: "Mejores Amigos",
                            listEmoji: "⭐"
                        }
                    }
                });

                // ✅ MENSAJE DE CONFIRMACIÓN CON TU NOMBRE: BOT-API
                await sock.sendMessage(remoteJid, {
                    text: `╭〔 ✅ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣\n┃\n┃ 🟢 ESTADO PUBLICADO\n┃\n╰━━━━━━━━━━━━━━━━⬣\n\n┃ > El estado se ha subido correctamente al grupo.\n\n╰〔 ⚡ SYSTEM INFO 〕⬣`
                }, { quoted: msg });

                return;
            }

            // 2. CASO: MULTIMEDIA (foto, video, audio, sticker)
            if (quotedMsg) {
                const quotedId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;
                const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

                if (!quotedId) {
                    await responder.texto('❌ No se pudo obtener el mensaje citado.');
                    return;
                }

                await sock.sendMessage(statusJid, {
                    forward: {
                        key: {
                            remoteJid: remoteJid,
                            fromMe: false,
                            id: quotedId,
                            participant: quotedParticipant
                        },
                        message: quotedMsg
                    },
                    contextInfo: {
                        remoteJid: remoteJid,
                        isGroupStatus: true,
                        statusSourceType: 0,
                        statusAttributions: [{ AttributionData: null, type: 10 }],
                        statusAudienceMetadata: {
                            audienceType: 2,
                            listName: "Mejores Amigos",
                            listEmoji: "⭐"
                        }
                    }
                });

                // ✅ MENSAJE DE CONFIRMACIÓN CON TU NOMBRE: BOT-API
                await sock.sendMessage(remoteJid, {
                    text: `╭〔 ✅ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣\n┃\n┃ 🟢 ESTADO PUBLICADO\n┃\n╰━━━━━━━━━━━━━━━━⬣\n\n┃ > El estado se ha subido correctamente al grupo.\n\n╰〔 ⚡ SYSTEM INFO 〕⬣`
                }, { quoted: msg });

                return;
            }

        } catch (error) {
            console.error('[GSTATUS] Error:', error);
            await responder.texto(`❌ *ERROR*\n\nNo se pudo publicar el estado. Verifica la versión de Baileys.`);
        }
    }
};