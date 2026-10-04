import fetch from 'node-fetch';

const API_URL = 'https://ntphwaiqleggrlqkshiw.supabase.co/functions/v1/smart-task';

export default {
    nombre: 'rch2',
    categoria: 'Utilidades',
    alias: ['reactionchannel', 'reaccionarcanal', 'channelpost'],
    descripcion: 'Envía reacciones con emojis a posts de canales de WhatsApp',
    uso: '.rch2 <link del canal> <emojis>',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const args = String(argumento || '').trim().split(/\s+/);
        const link = args[0];
        const emojiInput = args.slice(1).join('');

        if (!link) {
            return await responder.texto(
                '╭━━〔 📢 𝐑𝐄𝐀𝐂𝐓𝐈𝐎𝐍 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el link del canal\n' +
                '┃\n' +
                '┃ 💡 Uso:\n' +
                '┃ .rch2 <link> <emojis>\n' +
                '┃\n' +
                '┃ 📝 Ejemplo:\n' +
                '┃ .rch2 https://whatsapp.com/channel/xxxxx/123 🔥👍🙏\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (!emojiInput) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐅𝐀𝐋𝐓𝐀𝐍 𝐄𝐌𝐎𝐉𝐈𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ No especificaste emojis\n' +
                '┃\n' +
                '┃ 💡 Ejemplo:\n' +
                '┃ .rch2 https://whatsapp.com/channel/xxxxx/123 🔥👍🙏\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const emojis = [...emojiInput];

        await sock.sendMessage(jid, {
            react: {
                text: '⏳',
                key: msg.key
            }
        });

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Origin': 'https://reactionsaluranwa.iwaw.my.id',
                    'Referer': 'https://reactionsaluranwa.iwaw.my.id/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36'
                },
                body: JSON.stringify({
                    link,
                    emojis
                }),
                signal: AbortSignal.timeout(120000)
            });

            if (!res.ok) {
                throw new Error('API respondió HTTP ' + res.status);
            }

            const data = await res.json();

            const respuesta =
                typeof data === 'string'
                    ? data
                    : '✅ *Reacción exitosa!*\n\n' + JSON.stringify(data, null, 2);

            await sock.sendMessage(jid, { text: respuesta }, { quoted: msg });

            await sock.sendMessage(jid, {
                react: {
                    text: '✅',
                    key: msg.key
                }
            });

        } catch (error) {
            console.error('[RCH2] Error:', error?.message || error);

            await sock.sendMessage(jid, {
                react: {
                    text: '❌',
                    key: msg.key
                }
            });

            let mensaje = error?.message || 'Error desconocido';

            if (mensaje.includes('timeout') || mensaje.includes('aborted')) {
                mensaje = 'La operación tardó demasiado.\n┃    Intenta de nuevo.';
            }

            await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ ' + mensaje + '\n' +
                '┃\n' +
                '┃ 💡 Verifica que el link sea\n' +
                '┃    válido y los emojis existan\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }
    }
};