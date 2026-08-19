import {
    obtenerUsuario,
    guardarUsuario,
    modificarDinero
} from '../database/economia.js';

export default {
    nombre: 'sell',

    categoria: 'economia',

    alias: [
        'vender',
        'venta'
    ],

    descripcion:
        'Vende una carta de tu colección. Uso: .sell número',

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

        const personajes =
            Array.isArray(usuario.personajes)
                ? usuario.personajes
                : [];

        if (personajes.length === 0) {

            await responder.texto(
                `❌ *COLECCIÓN VACÍA*\n\n` +
                `No tienes cartas para vender.\n\n` +
                `Usa *.rw* para conseguir una carta.`
            );

            return;
        }

        const numero =
            Number(
                argumento.trim()
            );

        if (
            !Number.isInteger(numero) ||
            numero < 1 ||
            numero > personajes.length
        ) {

            await responder.texto(
                `❌ *CARTA INVÁLIDA*\n\n` +
                `Indica el número de la carta que quieres vender.\n\n` +
                `Ejemplo:\n` +
                `*.sell 1*\n\n` +
                `Usa *.coleccion* para ver tus cartas.`
            );

            return;
        }

        const indice =
            numero - 1;

        const carta =
            personajes[indice];

        const valor =
            Number(carta.valor || 0);

        if (valor <= 0) {

            await responder.texto(
                `❌ Esta carta no tiene un valor válido para vender.`
            );

            return;
        }

        // ----------------------------------------------------
        // ELIMINAR CARTA
        // ----------------------------------------------------

        personajes.splice(
            indice,
            1
        );

        usuario.personajes =
            personajes;

        guardarUsuario(
            id,
            usuario
        );

        // ----------------------------------------------------
        // DAR DINERO
        // ----------------------------------------------------

        modificarDinero(
            id,
            valor
        );

        await responder.texto(
            `╭〔 💰 𝐂𝐀𝐑𝐓𝐀 𝐕𝐄𝐍𝐃𝐈𝐃𝐀 〕⬣\n` +
            `┃\n` +
            `┃ 👤 𝐍𝐎𝐌𝐁𝐑𝐄 › ${carta.nombre || 'Sin nombre'}\n` +
            `┃ 📖 𝐒𝐄𝐑𝐈𝐄 › ${carta.serie || 'Sin serie'}\n` +
            `┃\n` +
            `┃ 💵 RECIBISTE › *$${valor.toLocaleString()}*\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `🎴 Carta eliminada de tu colección.\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
    }
};
