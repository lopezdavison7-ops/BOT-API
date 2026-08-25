// commands/economy/setbirth.js
import {
    validarFechaNacimiento,
    setFechaNacimiento
} from '../../database/perfiles.js';

export default {
    nombre: 'setbirth',

    categoria: 'economia',

    alias: [
        'setnacimiento',
        'setedad'
    ],

    descripcion:
        'Configura tu fecha de nacimiento. Uso: .setbirth DD/MM/AAAA',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        if (!argumento) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐒𝐄𝐓𝐁𝐈𝐑𝐓𝐇 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta la fecha.\n' +
                '┃\n' +
                '┃ 📌 Uso: .setbirth DD/MM/AAAA\n' +
                '┃ 📌 Ejemplo: .setbirth 15/08/2001\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const resultado =
            validarFechaNacimiento(
                argumento
            );

        if (!resultado.valido) {

            await responder.texto(
                '╭━━〔 ❌ 𝐒𝐄𝐓𝐁𝐈𝐑𝐓𝐇 〕━━⬣\n' +
                '┃\n' +
                `┃ ${resultado.error}\n` +
                '┃\n' +
                '┃ 📌 Formato: DD/MM/AAAA\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        setFechaNacimiento(
            id,
            resultado.fecha.toISOString()
        );

        await responder.texto(
            '╭〔 🎂 𝐒𝐄𝐓𝐁𝐈𝐑𝐓𝐇 〕⬣\n' +
            '┃\n' +
            '┃ ✅ Fecha de nacimiento guardada.\n' +
            '┃\n' +
            `┃ 🎂 Edad › *${resultado.edad} años*\n` +
            '┃\n' +
            '┃ Se mostrará en tu .profile\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
