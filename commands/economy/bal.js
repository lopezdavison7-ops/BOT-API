// commands/economy/bal.js
import {
    obtenerUsuario
} from '../../database/economia.js';

export default {
    nombre: 'bal',

    categoria: 'economia',

    alias: [
        'balance',
        'saldo'
    ],

    descripcion:
        'Muestra tu saldo.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const total =
            usuario.dinero +
            usuario.banco;

        await responder.texto(
            '╭〔 💰 𝐁𝐀𝐋𝐀𝐍𝐂𝐄 〕⬣\n' +
            '┃\n' +
            `┃ 👛 Cartera › *$${usuario.dinero.toLocaleString()}*\n` +
            `┃ 🏦 Banco › *$${usuario.banco.toLocaleString()}*\n` +
            '┃\n' +
            `┃ 💵 Total › *$${total.toLocaleString()}*\n` +
            `┃ 🎴 Cartas › *${usuario.personajes.length}*\n` +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};