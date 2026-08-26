// commands/economy/profile.js
import {
    obtenerUsuario
} from '../../database/economia.js';

import {
    obtenerPerfil,
    calcularEdad,
    GENEROS
} from '../../database/perfiles.js';

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

        const perfil =
            obtenerPerfil(id);

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

            const url =
                await sock.profilePictureUrl(
                    id,
                    'image'
                );

            if (url) {

                const respuesta =
                    await fetch(url);

                if (respuesta.ok) {

                    // fetch() nativo de Node no tiene .buffer()
                    // (eso es de node-fetch v2). Se usa
                    // arrayBuffer() + Buffer.from, que sí existe.
                    const arrayBuffer =
                        await respuesta.arrayBuffer();

                    fotoBuffer =
                        Buffer.from(arrayBuffer);

                    tieneFoto = true;

                }

            }

        } catch {
            // Si no tiene foto, ignoramos.
        }

        // -------------------------------------------------------
        // LÍNEAS OPCIONALES (edad / género / pareja)
        // -------------------------------------------------------

        let lineaEdad = '';
        let lineaGenero = '';
        let lineaPareja = '';

        const mentions = [id];

        if (perfil.fechaNacimiento) {

            const edad =
                calcularEdad(
                    perfil.fechaNacimiento
                );

            lineaEdad =
                `┃ 🎂 Edad › *${edad} años*\n`;

        } else {

            lineaEdad =
                '┃ 🎂 Edad › *No definida*\n';

        }

        if (perfil.genero && GENEROS[perfil.genero]) {

            const info =
                GENEROS[perfil.genero];

            lineaGenero =
                `┃ ${info.emoji} Género › *${info.etiqueta}*\n`;

        } else {

            lineaGenero =
                '┃ ⚧️ Género › *No definido*\n';

        }

        if (perfil.pareja) {

            lineaPareja =
                `┃ 💍 Pareja › @${perfil.pareja.split('@')[0]}\n`;

            mentions.push(
                perfil.pareja
            );

        } else {

            lineaPareja =
                '┃ 💍 Pareja › *No definida*\n';

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
${lineaEdad}${lineaGenero}${lineaPareja}┃
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
                    mentions
                },
                { quoted: msg }
            );

        } else {

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: texto,
                    mentions
                },
                { quoted: msg }
            );

        }
    }
};
