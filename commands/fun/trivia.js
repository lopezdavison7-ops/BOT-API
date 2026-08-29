// commands/fun/trivia.js
import {
    hayPartidaActiva,
    crearPregunta
} from '../../lib/trivia.js';

export default {
    nombre: 'trivia',

    categoria: 'Diversión',

    alias: [
        'preguntados'
    ],

    descripcion:
        'Inicia una pregunta de trivia. Responde con A, B, C o D.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const chatJid =
            msg.key.remoteJid;

        if (hayPartidaActiva(chatJid)) {

            await responder.texto(
                '╭〔 ⚠️ 𝐓𝐑𝐈𝐕𝐈𝐀 〕⬣\n' +
                '┃\n' +
                '┃ Ya hay una pregunta activa\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '┃ 📌 Cancélala con *.triviacancelar*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        await crearPregunta(sock, chatJid, msg);
    }
};
