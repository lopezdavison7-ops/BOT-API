// commands/economy/divorcio.js
import {
    divorciar
} from '../../database/perfiles.js';

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
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
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

        await responder.texto(
            '╭〔 💔 𝐃𝐈𝐕𝐎𝐑𝐂𝐈𝐎 〕⬣\n' +
            '┃\n' +
            `┃ Te divorciaste de\n` +
            `┃ @${exPareja.split('@')[0]}\n` +
            '┃\n' +
            '┃ Ambos vuelven a estar solteros.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣',
            {
                mentions: [exPareja]
            }
        );
    }
};
