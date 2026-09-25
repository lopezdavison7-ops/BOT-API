

import {
    obtenerUsuario
} from '../../database/economia.js';

import {
    obtenerPerfil,
    calcularEdad,
    GENEROS
} from '../../database/perfiles.js';

import {
    obtenerNivel,
    xpNecesaria,
    barraXP,
    porcentajeXP
} from '../../lib/niveles.js';

export default {
    nombre: 'profile',

    categoria: 'economia',

    alias: [
        'perfil',
        'me',
        'yo'
    ],

    descripcion:
        'Muestra tu perfil económico, nivel y colección con foto y mención.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
            msg.key.participantAlt ||
            msg.key.remoteJid ||
            msg.key.remoteJidAlt;

        const chatJid =
            msg.key.remoteJid;

        if (!id || !chatJid) {
            return;
        }

        const usuario =
            obtenerUsuario(id);

        const perfil =
            obtenerPerfil(id);

        const nivel =
            obtenerNivel(
                chatJid,
                id
            );

        const nivelActual =
            nivel?.nivel || 1;

        const xpActual =
            Number(
                nivel?.xp || 0
            );

        const xpNecesariaNivel =
            xpNecesaria(
                nivelActual
            );

        const progreso =
            porcentajeXP(
                nivel
            );

        const barra =
            barraXP(
                nivel,
                10
            );

        const mensajes =
            Number(
                nivel?.mensajes || 0
            );

        const personajes =
            Array.isArray(
                usuario.personajes
            )
                ? usuario.personajes
                : [];

        const dinero =
            Number(
                usuario.dinero || 0
            );

        const numero =
            String(id)
                .split('@')[0]
                .split(':')[0];

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

                    const arrayBuffer =
                        await respuesta.arrayBuffer();

                    fotoBuffer =
                        Buffer.from(
                            arrayBuffer
                        );

                    tieneFoto = true;
                }
            }

        } catch {

        }

        let lineaEdad = '';
        let lineaGenero = '';
        let lineaPareja = '';

        const mentions = [id];

        if (
            perfil.fechaNacimiento
        ) {

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

        if (
            perfil.genero &&
            GENEROS[
                perfil.genero
            ]
        ) {

            const info =
                GENEROS[
                    perfil.genero
                ];

            lineaGenero =
                `┃ ${info.emoji} Género › *${info.etiqueta}*\n`;

        } else {

            lineaGenero =
                '┃ ⚧️ Género › *No definido*\n';
        }

        if (
            perfil.pareja
        ) {

            lineaPareja =
                `┃ 💍 Pareja › @${perfil.pareja.split('@')[0]}\n`;

            mentions.push(
                perfil.pareja
            );

        } else {

            lineaPareja =
                '┃ 💍 Pareja › *No definida*\n';
        }

        const texto =
`
╭〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
┃
┃ 👤 𝐏𝐄𝐑𝐅𝐈𝐋
┃
┃ 🆔 Usuario › @${numero}
┃
┃ 💰 Dinero › *$${dinero.toLocaleString()}*
┃ 🎴 Cartas › *${personajes.length}*
┃
┃ ⭐ Nivel › *${nivelActual}*
┃ ✨ XP › *${xpActual} / ${xpNecesariaNivel}*
┃ 📊 Progreso › *${progreso}%*
┃ ${barra}
┃ 💬 Mensajes › *${mensajes}*
┃
${lineaEdad}${lineaGenero}${lineaPareja}┃
╰━━━━━━━━━━━━━━━━⬣
`;

        if (
            tieneFoto &&
            fotoBuffer
        ) {

            await sock.sendMessage(
                chatJid,
                {
                    image: fotoBuffer,
                    caption: texto,
                    mentions
                },
                {
                    quoted: msg
                }
            );

        } else {

            await sock.sendMessage(
                chatJid,
                {
                    text: texto,
                    mentions
                },
                {
                    quoted: msg
                }
            );
        }
    }
};