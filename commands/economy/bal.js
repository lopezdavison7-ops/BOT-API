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

        await responder.texto(
            `💰 *TU SALDO*\n\n` +
            `💵 Dinero: *$${usuario.dinero.toLocaleString()}*\n` +
            `🎴 Personajes: *${usuario.personajes.length}*`
        );
    }
};