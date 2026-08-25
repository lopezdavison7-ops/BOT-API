// commands/economy/divorcio.js
import {
    divorciar
} from '../../database/perfiles.js';

import {
    resolverMencionable
} from '../../lib/simple.js';

export default {
    nombre: 'divorcio',

    categoria: 'economia',

    alias: [
        'divorciarme',
        'divorce'
    ],

    descripcion:
        'Termina tu matrimonio actual. Uso: .divorcio',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const jidChat =
            msg.key.remoteJid;

        const exPareja =
            divorciar(id);

        if (!exPareja) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐃𝐈𝐕𝐎𝐑𝐂𝐈𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ No estás casado con nadie.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

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

        const exParejaMencion =
            resolverMencionable(
                exPareja,
                participantes
            );

        await responder.texto(
            '╭〔 💔 𝐃𝐈𝐕𝐎𝐑𝐂𝐈𝐎 〕⬣\n' +
            '┃\n' +
            `┃ Te divorciaste de\n` +
            `┃ @${exParejaMencion.split('@')[0]}\n` +
            '┃\n' +
            '┃ Ambos vuelven a estar solteros.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣',
            {
                mentions: [exParejaMencion]
            }
        );
    }
};
