// commands/fun/ttt.js
import {
    hayPartidaActiva,
    crearPartida,
    guardarMessageKey,
    formatearTablero
} from '../../lib/ttt.js';

import { resolverJidReal } from '../../lib/resolverJid.js';

export default {
    nombre: 'ttt',

    categoria: 'Diversión',

    alias: [
        'tresenraya',
        'tatetí'
    ],

    descripcion:
        'Reta a alguien a tres en raya. Uso: .ttt @rival',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const chatJid =
            msg.key.remoteJid;

        const jugadorX =
            msg.key.participant ||
            msg.key.remoteJid;

        const mencionados =
            msg.message?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid || [];

        if (mencionados.length === 0) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐓𝐓𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona a tu rival.\n' +
                '┃\n' +
                '┃ 📌 Uso: .ttt @usuario\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const jugadorO =
            await resolverJidReal(
                sock,
                chatJid,
                mencionados[0]
            );

        const jugadorXResuelto =
            await resolverJidReal(
                sock,
                chatJid,
                jugadorX
            );

        if (jugadorO === jugadorXResuelto) {

            await responder.texto(
                '╭━━〔 ❌ 𝐓𝐓𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No puedes retarte a ti mismo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (hayPartidaActiva(chatJid)) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐓𝐓𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ Ya hay una partida en curso\n' +
                '┃ en este chat.\n' +
                '┃\n' +
                '┃ 📌 Cancélala con *.tttcancelar*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        crearPartida(
            chatJid,
            jugadorXResuelto,
            jugadorO
        );

        const texto =
            `⚔️ @${jugadorXResuelto.split('@')[0]} ha retado a ` +
            `@${jugadorO.split('@')[0]}\n\n` +
            `Turno de @${jugadorXResuelto.split('@')[0]} (❌)\n\n` +
            formatearTablero(
                Array(9).fill(null)
            ) +
            '\n\nManda un número (1-9) para jugar tu casilla.';

        const enviado =
            await sock.sendMessage(
                chatJid,
                {
                    text: texto,
                    mentions: [jugadorXResuelto, jugadorO]
                },
                {
                    quoted: msg
                }
            );

        guardarMessageKey(
            chatJid,
            enviado.key
        );
    }
};
