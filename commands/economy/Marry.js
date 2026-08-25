// commands/economy/marry.js
import {
    estaCasado,
    obtenerPareja,
    obtenerPropuestaPendiente,
    crearPropuesta
} from '../../database/perfiles.js';

import {
    resolverMencionable
} from '../../lib/simple.js';

export default {
    nombre: 'marry',

    categoria: 'economia',

    alias: [
        'casar',
        'casarse'
    ],

    descripcion:
        'Propón matrimonio a alguien. Uso: .marry @usuario',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        const emisor =
            msg.key.participant ||
            msg.key.remoteJid;

        const jidChat =
            msg.key.remoteJid;

        // ---------------------------------------------------
        // PARTICIPANTES DEL GRUPO (para resolver LID -> JID
        // normal en las menciones; en privado no aplica).
        // ---------------------------------------------------

        let participantes = [];

        if (jidChat?.endsWith('@g.us')) {

            try {

                const metadata =
                    await sock.groupMetadata(
                        jidChat
                    );

                participantes =
                    metadata?.participants || [];

            } catch {
                // Si falla, se sigue con el jid original.
            }

        }

        const mencionados =
            msg.message?.extendedTextMessage
                ?.contextInfo
                ?.mentionedJid || [];

        if (mencionados.length === 0) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐌𝐀𝐑𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona a la persona.\n' +
                '┃\n' +
                '┃ 📌 Uso: .marry @usuario\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const receptor =
            mencionados[0];

        if (receptor === emisor) {

            await responder.texto(
                '╭━━〔 ❌ 𝐌𝐀𝐑𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ No puedes proponerte matrimonio a\n' +
                '┃ ti mismo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (estaCasado(emisor)) {

            const parejaActual =
                obtenerPareja(emisor);

            const parejaMencion =
                resolverMencionable(
                    parejaActual,
                    participantes
                );

            await responder.texto(
                '╭━━〔 ❌ 𝐌𝐀𝐑𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ Ya estás casado con\n' +
                `┃ @${parejaMencion.split('@')[0]}\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣',
                {
                    mentions: [parejaMencion]
                }
            );

            return;

        }

        if (estaCasado(receptor)) {

            await responder.texto(
                '╭━━〔 ❌ 𝐌𝐀𝐑𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ Esa persona ya está casada.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (
            obtenerPropuestaPendiente(receptor) === emisor
        ) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐌𝐀𝐑𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ Ya le mandaste una propuesta.\n' +
                '┃ Espera a que use *.aceptar*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        crearPropuesta(
            emisor,
            receptor
        );

        const emisorMencion =
            resolverMencionable(
                emisor,
                participantes
            );

        const receptorMencion =
            resolverMencionable(
                receptor,
                participantes
            );

        await responder.texto(
            '╭〔 💍 𝐏𝐑𝐎𝐏𝐔𝐄𝐒𝐓𝐀 𝐃𝐄 𝐌𝐀𝐓𝐑𝐈𝐌𝐎𝐍𝐈𝐎 〕⬣\n' +
            '┃\n' +
            `┃ @${emisorMencion.split('@')[0]} le propone\n` +
            `┃ matrimonio a @${receptorMencion.split('@')[0]} 💕\n` +
            '┃\n' +
            '┃ Para aceptar, escribe:\n' +
            '┃ *.aceptar*\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣',
            {
                mentions: [emisorMencion, receptorMencion]
            }
        );
    }
};
