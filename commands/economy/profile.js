// commands/economy/profile.js
import {
    obtenerUsuario
} from '../../database/economia.js';

export default {
    nombre: 'profile',

    categoria: 'economia',

    alias: [
        'perfil',
        'me',
        'yo'
    ],

    descripcion:
        'Muestra tu perfil económico y colección con foto y mención.',

    ejecutar: async ({
        sock,
        msg,
        responder
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

        const dinero =
            Number(
                usuario.dinero || 0
            );

        const numero =
            id.split('@')[0];

        // -------------------------------------------------------
        // OBTENER FOTO DE PERFIL
        // -------------------------------------------------------

        let fotoBuffer = null;
        let tieneFoto = false;

        try {
            const url = await sock.profilePictureUrl(id, 'image');
            if (url) {
                const respuesta = await fetch(url);
                if (respuesta.ok) {
                    fotoBuffer = await respuesta.buffer();
                    tieneFoto = true;
                }
            }
        } catch {
            // Si no tiene foto, ignoramos
        }

        // -------------------------------------------------------
        // CONSTRUIR MENSAJE
        // -------------------------------------------------------

        const texto = `
╭〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
┃
┃ 👤 𝐏𝐄𝐑𝐅𝐈𝐋
┃
┃ 🆔 Usuario › @${numero}
┃ 💰 Dinero › *$${dinero.toLocaleString()}*
┃ 🎴 Cartas › *${personajes.length}*
┃
╰━━━━━━━━━━━━━━━━⬣
`;

        // -------------------------------------------------------
        // ENVIAR CON FOTO O SOLO TEXTO
        // -------------------------------------------------------

        if (tieneFoto && fotoBuffer) {
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    image: fotoBuffer,
                    caption: texto,
                    mentions: [id]
                },
                { quoted: msg }
            );
        } else {
            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: texto,
                    mentions: [id]
                },
                { quoted: msg }
            );
        }
    }
};