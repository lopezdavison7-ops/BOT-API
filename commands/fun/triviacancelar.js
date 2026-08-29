// commands/fun/triviacancelar.js
import {
    cancelarPartida
} from '../../lib/trivia.js';

export default {
    nombre: 'triviacancelar',

    categoria: 'Diversión',

    alias: [
        'cancelartrivia'
    ],

    descripcion:
        'Cancela la pregunta de trivia activa en el chat.',

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
                '╭〔 ⚠️ 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n' +
                '┃\n' +
                '┃ No hay ninguna pregunta activa\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        await responder.texto(
            '╭〔 🛑 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n' +
            '┃\n' +
            '┃ Pregunta cancelada.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
