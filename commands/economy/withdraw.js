// commands/economy/withdraw.js
import {
    obtenerUsuario,
    retirar
} from '../../database/economia.js';

export default {
    nombre: 'withdraw',

    categoria: 'economia',

    alias: [
        'retirar',
        'wd'
    ],

    descripcion:
        'Saca dinero del banco. Uso: .withdraw <cantidad|all>',

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
                '╭━━〔 ⚠️ 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Indica cuánto retirar.\n' +
                '┃\n' +
                '┃ 📌 Uso: .withdraw <cantidad>\n' +
                '┃ 📌 Uso: .withdraw all\n' +
                '┃\n' +
                `┃ 🏦 En banco › *$${usuario.banco.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const cantidad =
            texto === 'all' ||
            texto === 'todo'
                ? usuario.banco
                : Number(texto);

        if (
            !Number.isFinite(cantidad) ||
            !Number.isInteger(cantidad) ||
            cantidad <= 0
        ) {

            await responder.texto(
                '╭━━〔 ❌ 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖 〕━━⬣\n' +
                '┃\n' +
                '┃ Cantidad inválida.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        if (cantidad > usuario.banco) {

            await responder.texto(
                '╭━━〔 ❌ 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖 〕━━⬣\n' +
                '┃\n' +
                '┃ No tienes esa cantidad en el banco.\n' +
                '┃\n' +
                `┃ 🏦 En banco › *$${usuario.banco.toLocaleString()}*\n` +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );

            return;

        }

        const actualizado =
            retirar(
                id,
                cantidad
            );

        await responder.texto(
            '╭〔 🏦 𝐖𝐈𝐓𝐇𝐃𝐑𝐀𝐖 〕⬣\n' +
            '┃\n' +
            `┃ ✅ Retiraste › *$${cantidad.toLocaleString()}*\n` +
            '┃\n' +
            `┃ 💵 En mano › *$${actualizado.dinero.toLocaleString()}*\n` +
            `┃ 🏦 En banco › *$${actualizado.banco.toLocaleString()}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};
