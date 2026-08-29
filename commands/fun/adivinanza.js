// commands/fun/adivinanza.js
import {
    hayPartidaActiva,
    crearAcertijo
} from '../../lib/adivinanza.js';

export default {
    nombre: 'adivinanza',

    categoria: 'Diversión',

    alias: [
        'acertijo'
    ],

    descripcion:
        'Inicia un acertijo. El primero en adivinar gana monedas.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const chatJid =
            msg.key.remoteJid;

        if (hayPartidaActiva(chatJid)) {

            await responder.texto(
                '╭〔 ⚠️ 𝐀𝐃𝐈𝐕𝐈𝐍𝐀𝐍𝐙𝐀 〕⬣\n' +
                '┃\n' +
                '┃ Ya hay un acertijo activo\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '┃ 📌 Cancélalo con *.adivinanzacancelar*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        await crearAcertijo(sock, chatJid, msg);
    }
};
