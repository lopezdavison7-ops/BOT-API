// commands/fun/tetriscancelar.js
import {
    cancelarPartida
} from '../../lib/tetris.js';

export default {
    nombre: 'tetriscancelar',

    categoria: 'Diversión',

    alias: [
        'cancelartetris'
    ],

    descripcion:
        'Cancela la partida de Tetris activa en el chat.',

    ejecutar: async ({
        msg,
        jid,
        responder
    }) => {

        const chatJid = jid || msg.key.remoteJid;
        const cancelada = cancelarPartida(chatJid);

        if (!cancelada) {
            await responder.texto(
                '╭〔 ⚠️ 𝐓𝐄𝐓𝐑𝐈𝐒 〕⬣\n' +
                '┃\n' +
                '┃ No hay ninguna partida activa\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        await responder.texto(
            '╭〔 🛑 𝐓𝐄𝐓𝐑𝐈𝐒 〕⬣\n' +
            '┃\n' +
            '┃ Partida cancelada.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
