// commands/fun/tttcancelar.js
import {
    cancelarPartida
} from '../../lib/ttt.js';

export default {
    nombre: 'tttcancelar',

    categoria: 'Diversión',

    alias: [
        'cancelarttt'
    ],

    descripcion:
        'Cancela la partida de tres en raya activa en el chat.',

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
                '╭━━〔 ⚠️ 𝐓𝐓𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No hay ninguna partida activa\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        await responder.texto(
            '╭━━〔 🛑 𝐓𝐓𝐓 〕━━⬣\n' +
            '┃\n' +
            '┃ Partida cancelada.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
