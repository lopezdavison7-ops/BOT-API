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

            // 🔥 CAMBIO CLAVE: PUBLICAR DIRECTAMENTE EN EL GRUPO, NO EN status@broadcast
            // WhatsApp interpretará esto como un "Estado de Grupo" y lo pondrá en la cabecera.

            // 1. CASO: SOLO TEXTO (pantalla completa, fondo oscuro)
            if (!quotedMsg && textoEscrito) {
                await sock.sendMessage(remoteJid, {
                    text: textoEscrito,
                    // Sin contextInfo especial, solo el texto en el grupo.
                });

                // Confirmación en el chat
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

                // Reenviar al grupo directamente como estado
                await sock.sendMessage(remoteJid, {
                    forward: {
                        key: {
                            remoteJid: remoteJid,
                            fromMe: false,
                            id: quotedId,
                            participant: quotedParticipant
                        },
                        message: quotedMsg
                    }
                });

                // Confirmación en el chat
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