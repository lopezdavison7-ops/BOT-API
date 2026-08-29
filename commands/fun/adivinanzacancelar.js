// commands/fun/adivinanzacancelar.js
import {
    cancelarPartida
} from '../../lib/adivinanza.js';

export default {
    nombre: 'adivinanzacancelar',

    categoria: 'Diversión',

    alias: [
        'cancelaradivinanza'
    ],

    descripcion:
        'Cancela el acertijo activo en el chat.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const chatJid =
            msg.key.remoteJid;

        const cancelada =
            cancelarPartida(chatJid);

        if (!cancelada) {

            await responder.texto(
                '╭〔 ⚠️ 𝐀𝐃𝐈𝐕𝐈𝐍𝐀𝐍𝐙𝐀 〕⬣\n' +
                '┃\n' +
                '┃ No hay ningún acertijo activo\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        await responder.texto(
            '╭〔 🛑 𝐀𝐃𝐈𝐕𝐈𝐍𝐀𝐍𝐙𝐀 〕⬣\n' +
            '┃\n' +
            '┃ Acertijo cancelado.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
