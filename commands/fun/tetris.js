// commands/fun/tetris.js
import {
    hayPartidaActiva,
    crearPartida
} from '../../lib/tetris.js';

export default {
    nombre: 'tetris',

    categoria: 'Diversión',

    alias: [],

    descripcion:
        'Inicia una partida de Tetris. Se juega mandando texto (izq/der/rot/baj/caer) sin el punto del bot.',

    ejecutar: async ({
        sock,
        msg,
        jid,
        responder
    }) => {

        const chatJid = jid || msg.key.remoteJid;

        if (hayPartidaActiva(chatJid)) {
            await responder.texto(
                '╭〔 ⚠️ 𝐓𝐄𝐓𝐑𝐈𝐒 〕⬣\n' +
                '┃\n' +
                '┃ Ya hay una partida activa en\n' +
                '┃ este chat.\n' +
                '┃\n' +
                '┃ 📌 Cancélala con *.tetriscancelar*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        const jugador = msg.key.participant || msg.key.remoteJid;

        await crearPartida(sock, chatJid, msg, jugador);
    }
};
