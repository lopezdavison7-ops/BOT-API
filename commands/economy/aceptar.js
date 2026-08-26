// commands/economy/aceptar.js
import {
    obtenerPropuestaPendiente,
    aceptarPropuesta
} from '../../database/perfiles.js';

export default {
    nombre: 'aceptar',

    categoria: 'economia',

    alias: [
        'asectar',
        'accept'
    ],

    descripcion:
        'Acepta una propuesta de matrimonio pendiente. Uso: .aceptar',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const receptor =
            msg.key.participant ||
            msg.key.remoteJid;

        const pendiente =
            obtenerPropuestaPendiente(
                receptor
            );

        if (!pendiente) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No tienes ninguna propuesta de\n' +
                '┃ matrimonio pendiente.\n' +
                '┃\n' +
                '┃ 📌 Pide que te propongan con:\n' +
                '┃ *.marry @tu_bot_api*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const pareja =
            aceptarPropuesta(
                receptor
            );

        if (!pareja) {

            // Se resolvió justo entre el chequeo y el aceptar
            // (poco probable, pero por seguridad).
            await responder.texto(
                '╭━━〔 ⚠️ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ Esa propuesta ya no está disponible.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        await responder.texto(
            '╭〔 💒 ¡𝐁𝐎𝐃𝐀! 〕⬣\n' +
            '┃\n' +
            `┃ @${pareja.split('@')[0]} y\n` +
            `┃ @${receptor.split('@')[0]}\n` +
            '┃ ahora están casados 💍💕\n' +
            '┃\n' +
            '┃ ¡Felicidades!\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣',
            {
                mentions: [pareja, receptor]
            }
        );
    }
};
