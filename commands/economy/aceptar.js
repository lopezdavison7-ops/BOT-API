
// commands/economy/aceptar.js
import {
    obtenerPropuestaPendiente,
    aceptarPropuesta
} from '../../database/perfiles.js';

import {
    resolverMencionable
} from '../../lib/simple.js';

export default {
    nombre: 'aceptar',

    categoria: 'economia',

    alias: [
        'asectar',
        'accept'
    ],

    descripcion:
        'Acepta una propuesta de matrimonio pendiente. Uso: .aceptar',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const receptor =
            msg.key.participant ||
            msg.key.remoteJid;

        const jidChat =
            msg.key.remoteJid;

        const pendiente =
            obtenerPropuestaPendiente(
                receptor
            );

        if (!pendiente) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ No tienes ninguna propuesta de\n' +
                '┃ matrimonio pendiente.\n' +
                '┃\n' +
                '┃ 📌 Pide que te propongan con:\n' +
                '┃ *.marry @usuario*\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const pareja =
            aceptarPropuesta(
                receptor
            );

        if (!pareja) {

            // Se resolvió justo entre el chequeo y el aceptar
            // (poco probable, pero por seguridad).
            await responder.texto(
                '╭━━〔 ⚠️ 𝐀𝐂𝐄𝐏𝐓𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ Esa propuesta ya no está disponible.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        // -----------------------------------------------------
        // PARTICIPANTES DEL GRUPO (para resolver LID -> JID
        // normal en las menciones; en privado no aplica).
        // -----------------------------------------------------

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

        const parejaMencion =
            resolverMencionable(
                pareja,
                participantes
            );

        const receptorMencion =
            resolverMencionable(
                receptor,
                participantes
            );

        await responder.texto(
            '╭〔 💒 ¡𝐁𝐎𝐃𝐀! 〕⬣\n' +
            '┃\n' +
            `┃ @${parejaMencion.split('@')[0]} y\n` +
            `┃ @${receptorMencion.split('@')[0]}\n` +
            '┃ ahora están casados 💍💕\n' +
            '┃\n' +
            '┃ ¡Felicidades!\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣',
            {
                mentions: [parejaMencion, receptorMencion]
            }
        );
    }
};
