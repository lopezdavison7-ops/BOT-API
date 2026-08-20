// commands/group/link.js
// ============================================================
// COMANDO: LINK
// BOT-API
//
// Uso:
// .link
//
// Envía el enlace de invitación del grupo.
// ============================================================

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

        // --------------------------------------------------------
        // COMPROBAR GRUPO
        // --------------------------------------------------------

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

            // ----------------------------------------------------
            // OBTENER ENLACE
            // ----------------------------------------------------

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

            // ----------------------------------------------------
            // RESPUESTA
            // ----------------------------------------------------

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