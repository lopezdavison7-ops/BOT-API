import {
    obtenerUsuario
} from '../database/economia.js';

export default {
    nombre: 'profile',

    categoria: 'economia',

    alias: [
        'perfil',
        'me',
        'yo'
    ],

    descripcion:
        'Muestra tu perfil económico y colección.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const personajes =
            Array.isArray(usuario.personajes)
                ? usuario.personajes
                : [];

        const dinero =
            Number(
                usuario.dinero || 0
            );

        await responder.texto(
            `╭〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣\n` +
            `┃\n` +
            `┃ 👤 𝐏𝐄𝐑𝐅𝐈𝐋\n` +
            `┃\n` +
            `┃ 🆔 Usuario › ${id.split('@')[0]}\n` +
            `┃ 💰 Dinero › *$${dinero.toLocaleString()}*\n` +
            `┃ 🎴 Cartas › *${personajes.length}*\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`
        );
    }
};
