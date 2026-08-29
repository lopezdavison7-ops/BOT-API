// commands/fun/preguntashot.js
// ============================================================
// COMANDO: PREGUNTAS HOT
// Suelta una pregunta atrevida para quien usó el comando, o
// para la persona mencionada. Cuando esa persona responda con
// su siguiente mensaje (sin el punto del bot), el bot reacciona
// como asustado/en shock.
// Uso: .preguntashot
// Uso: .preguntashot @alguien
// ============================================================

import {
    haySesionActiva,
    iniciarPreguntaHot
} from '../../lib/preguntashot.js';

export default {
    nombre: 'prehot',

    categoria: 'Diversión',

    alias: [
        'hot',
        'preguntahot'
    ],

    descripcion:
        'Pregunta atrevida al azar. El bot reacciona asustado cuando respondes. Uso: .preguntashot o .preguntashot @alguien',

    ejecutar: async ({
        sock,
        msg,
        jid,
        responder
    }) => {

        const chatJid = jid || msg.key.remoteJid;

        if (haySesionActiva(chatJid)) {

            await responder.texto(
                '╭〔 ⚠️ 𝐏𝐑𝐄𝐆𝐔𝐍𝐓𝐀𝐒 𝐇𝐎𝐓 〕⬣\n' +
                '┃\n' +
                '┃ Ya hay una pregunta esperando\n' +
                '┃ respuesta en este chat.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const remitente =
            msg.key.participant ||
            msg.key.remoteJid;

        const mencionado =
            msg.message?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid?.[0];

        const objetivo =
            mencionado || remitente;

        await iniciarPreguntaHot(sock, chatJid, msg, objetivo);
    }
};
