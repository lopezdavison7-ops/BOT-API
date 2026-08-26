// commands/fun/ttt.js
import {
    hayPartidaActiva,
    crearPartida,
    guardarMessageKey,
    formatearTablero
} from '../../lib/ttt.js';

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
            mencionados[0];

        if (jugadorO === jugadorX) {

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
            jugadorX,
            jugadorO
        );

        const texto =
            `⚔️ @${jugadorX.split('@')[0]} ha retado a ` +
            `@${jugadorO.split('@')[0]}\n\n` +
            `Turno de @${jugadorX.split('@')[0]} (❌)\n\n` +
            formatearTablero(
                Array(9).fill(null)
            ) +
            '\n\nManda un número (1-9) para jugar tu casilla.';

        const enviado =
            await sock.sendMessage(
                chatJid,
                {
                    text: texto,
                    mentions: [jugadorX, jugadorO]
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
