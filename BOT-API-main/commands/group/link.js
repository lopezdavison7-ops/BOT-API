

export default {
    nombre: 'link',

    categoria: 'grupos',

    alias: [
        'enlace',
        'invite'
    ],

    descripcion:
        'Obtiene el enlace de invitación del grupo.',

    ejecutar: async ({
        msg,
        sock,
        responder
    }) => {

        const jid =
            msg?.key?.remoteJid;

        if (
            !jid ||
            !jid.endsWith('@g.us')
        ) {

            await responder.texto(
                '❌ Este comando solo funciona dentro de un grupo.'
            );

            return;
        }

        try {

            const codigo =
                await sock.groupInviteCode(jid);

            if (!codigo) {

                await responder.texto(
                    '❌ No se pudo obtener el enlace del grupo.'
                );

                return;
            }

            const enlace =
                `https://chat.whatsapp.com/${codigo}`;

            await responder.texto(
                `╭〔 🔗 𝐋𝐈𝐍𝐊 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 〕⬣\n` +
                `┃\n` +
                `┃ 🔗 ${enlace}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣\n\n` +
                `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
            );

        } catch (error) {

            console.error(
                '[COMANDO link] Error:',
                error
            );

            await responder.texto(
                '❌ No pude obtener el enlace de invitación de este grupo.'
            );
        }
    }
};