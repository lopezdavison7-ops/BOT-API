// commands/economy/deposit.js
import {
    obtenerUsuario,
    depositar
} from '../../database/economia.js';

export default {
    nombre: 'deposit',

    categoria: 'economia',

    alias: [
        'depositar',
        'dep'
    ],

    descripcion:
        'Guarda dinero en el banco (protegido de .rob). Uso: .deposit <cantidad|all>',

    ejecutar: async ({
        msg,
        responder,
        argumento
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const texto =
            (argumento || '').trim().toLowerCase();

        if (!texto) {

            await responder.texto(
                '╭━━〔 ⚠️ 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Indica cuánto depositar.\n' +
                '┃\n' +
                '┃ 📌 Uso: .deposit <cantidad>\n' +
                '┃ 📌 Uso: .deposit all\n' +
                '┃\n' +
                `┃ 💵 En mano › *$${usuario.dinero.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const cantidad =
            texto === 'all' ||
            texto === 'todo'
                ? usuario.dinero
                : Number(texto);

        if (
            !Number.isFinite(cantidad) ||
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {

            await responder.texto(
                '╭━━〔 ❌ 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ Cantidad inválida.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (cantidad > usuario.dinero) {

            await responder.texto(
                '╭━━〔 ❌ 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ No tienes esa cantidad en mano.\n' +
                '┃\n' +
                `┃ 💵 En mano › *$${usuario.dinero.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const actualizado =
            depositar(
                id,
                cantidad
            );

        await responder.texto(
            '╭〔 🏦 𝐃𝐄𝐏𝐎𝐒𝐈𝐓 〕⬣\n' +
            '┃\n' +
            `┃ ✅ Depositaste › *$${cantidad.toLocaleString()}*\n` +
            '┃\n' +
            `┃ 💵 En mano › *$${actualizado.dinero.toLocaleString()}*\n` +
            `┃ 🏦 En banco › *$${actualizado.banco.toLocaleString()}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
