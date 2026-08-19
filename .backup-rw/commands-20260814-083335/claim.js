import {
    obtenerUsuario,
    guardarUsuario
} from '../database/economia.js';

export default {
    nombre: 'claim',

    categoria: 'economia',

    alias: [
        'reclamar',
        'reclamo'
    ],

    descripcion:
        'Reclama la carta obtenida mediante .rw.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        // ----------------------------------------------------
        // COMPROBAR CARTA PENDIENTE
        // ----------------------------------------------------

        if (!usuario.cartaPendiente) {

            await responder.texto(
                `❌ *NO TIENES NINGUNA CARTA PENDIENTE*\n\n` +
                `Usa *.rw* para obtener una recompensa aleatoria.`
            );

            return;
        }

        const carta =
            usuario.cartaPendiente;

        // ----------------------------------------------------
        // ASEGURAR COLECCIÓN
        // ----------------------------------------------------

        if (!Array.isArray(usuario.personajes)) {
            usuario.personajes = [];
        }

        // ----------------------------------------------------
        // AGREGAR CARTA
        // ----------------------------------------------------

        usuario.personajes.push(carta);

        // ----------------------------------------------------
        // ELIMINAR PENDIENTE
        // ----------------------------------------------------

        delete usuario.cartaPendiente;

        guardarUsuario(
            id,
            usuario
        );

        // ----------------------------------------------------
        // RESPUESTA
        // ----------------------------------------------------

        await responder.texto(
            `╭〔 ✨ 𝐂𝐀𝐑𝐓𝐀 𝐑𝐄𝐂𝐋𝐀𝐌𝐀𝐃𝐀 〕⬣\n` +
            `┃\n` +
            `┃ 👤 𝐍𝐎𝐌𝐁𝐑𝐄 › ${carta.nombre}\n` +
            `┃ ⚥ 𝐆É𝐍𝐄𝐑𝐎 › ${carta.genero}\n` +
            `┃ 📖 𝐒𝐄𝐑𝐈𝐄 › ${carta.serie}\n` +
            `┃ 💴 𝐕𝐀𝐋𝐎𝐑 › ¥${Number(carta.valor || 0).toLocaleString()}\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `> ✅ Carta añadida a tu colección.\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
    }
};
