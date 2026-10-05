export default {
    nombre: 'rch2',
    categoria: 'Utilidades',
    alias: ['rch2', 'reactch', 'reactionchannel', 'reaccionarcanal'],
    descripcion: 'Envía reacciones con emojis a posts de canales de WhatsApp (sin API externa)',
    uso: '.rch <link del canal> [id_mensaje] <emojis>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const args = String(argumento || '').trim().split(/\s+/);
        const link = args[0];
        
        if (!link) {
            return await responder.texto(
                '╭━━〔 📢 𝐑𝐄𝐀𝐂𝐓𝐈𝐎𝐍 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el link del canal\n' +
                '┃\n' +
                '┃ 💡 Uso:\n' +
                '┃ .rch <link> [id_mensaje] <emojis>\n' +
                '┃\n' +
                '┃ 📝 Ejemplos:\n' +
                '┃ .rch https://whatsapp.com/channel/0029Vaxxx/120 🔥❤️\n' +
                '┃ .rch https://whatsapp.com/channel/0029Vaxxx 🔥👍\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Intentar extraer ID del canal y opcionalmente ID del mensaje
        let match = link.match(/channel\/([A-Za-z0-9]+)(?:\/(\d+))?/);
        
        if (!match) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐋𝐈𝐍𝐊 𝐈𝐍𝐕𝐀́𝐋𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ El link debe ser tipo:\n' +
                '┃ https://whatsapp.com/channel/XXXX\n' +
                '┃ https://whatsapp.com/channel/XXXX/123\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const channelId = match[1] + '@newsletter';
        let messageId = match[2];
        
        // Si no hay ID de mensaje en el link, buscarlo en los argumentos
        if (!messageId) {
            // Buscar un número en los argumentos que pueda ser el ID
            for (let i = 1; i < args.length; i++) {
                if (/^\d+$/.test(args[i])) {
                    messageId = args[i];
                    args.splice(i, 1); // Remover de args para no confundirlo con emoji
                    break;
                }
            }
        }

        // Si aún no hay ID, obtener el último mensaje del canal
        if (!messageId) {
            await sock.sendMessage(jid, {
                react: {
                    text: '⏳',
                    key: msg.key
                }
            });

            try {
                // Obtener mensajes recientes del canal
                const messages = await sock.newsletterFetchMessages(channelId, 1);
                if (messages && messages.length > 0) {
                    messageId = messages[0].server_id || messages[0].id;
                } else {
                    return await responder.texto(
                        '╭━━〔 ❌ 𝐒𝐈𝐍 𝐌𝐄𝐍𝐒𝐀𝐉𝐄𝐒 〕━━⬣\n' +
                        '┃\n' +
                        '┃ ⚠️ No se encontraron mensajes\n' +
                        '┃    en el canal\n' +
                        '┃\n' +
                        '┃ 💡 Especifica el ID del mensaje:\n' +
                        '┃ .rch ' + link + ' <id_mensaje> <emojis>\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                    );
                }
            } catch (error) {
                return await responder.texto(
                    '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ⚠️ No se pudo obtener mensajes\n' +
                    '┃\n' +
                    '┃ 💡 Especifica el ID del mensaje:\n' +
                    '┃ .rch ' + link + ' <id_mensaje> <emojis>\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }
        }

        // Extraer emojis de los argumentos restantes
        const emojiInput = args.slice(1).join('') || '🔥';
        const emojis = [...emojiInput];

        await sock.sendMessage(jid, {
            react: {
                text: '⏳',
                key: msg.key
            }
        });

        try {
            for (let i = 0; i < emojis.length; i++) {
                const emoji = emojis[i];
                await sock.newsletterReactMessage(channelId, messageId, emoji);
                
                if (i < emojis.length - 1) {
                    await new Promise(r => setTimeout(r, 800));
                }
            }

            const respuesta =
                '╭━━〔 ✅ 𝐑𝐄𝐀𝐂𝐂𝐈𝐎𝐍𝐄𝐒 𝐄𝐍𝐕𝐈𝐀𝐃𝐀𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 📢 Canal › *' + channelId + '*\n' +
                '┃ 💬 Mensaje › *' + messageId + '*\n' +
                '┃ 😀 Emojis › ' + emojis.join(' ') + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(jid, { text: respuesta }, { quoted: msg });

            await sock.sendMessage(jid, {
                react: {
                    text: '✅',
                    key: msg.key
                }
            });

        } catch (error) {
            console.error('[RCH] Error:', error?.message || error);

            await sock.sendMessage(jid, {
                react: {
                    text: '❌',
                    key: msg.key
                }
            });

            let mensaje = error?.message || 'Error desconocido';

            if (mensaje.includes('not joined') || mensaje.includes('not following')) {
                mensaje = 'El bot no está siguiendo el canal.\n┃    Debe darle a "Seguir" primero.';
            }

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + mensaje + '\n' +
                '┃\n' +
                '┃ 💡 Asegúrate que el bot esté\n' +
                '┃    siguiendo el canal\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};