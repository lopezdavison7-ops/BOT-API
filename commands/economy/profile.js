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

const TTL_FOTO = 5 * 60 * 1000;
const TIMEOUT_FOTO = 2500;

if (!global.picCache) global.picCache = {};

function conTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise(resolve => setTimeout(() => resolve(null), ms))
    ]);
}

async function obtenerFotoUrl(sock, id) {
    const cache = global.picCache[id];
    if (cache && Date.now() - cache.t < TTL_FOTO) return cache.url;
    try {
        const url = await sock.profilePictureUrl(id, 'image');
        if (url) {
            global.picCache[id] = { url, t: Date.now() };
            return url;
        }
    } catch {}
    return null;
}

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
        msg
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

        const mentions = [id];

        let lineaNombre = '';
        let lineaBio = '';
        let lineaEdad = '';
        let lineaGenero = '';
        let lineaPareja = '';

        if (perfil.nombre) {
            lineaNombre =
                `┃ 📛 Nombre › *${perfil.nombre}*\n`;
        }

        if (perfil.desc) {
            lineaBio =
                `┃ 📝 Bio › ${perfil.desc}\n`;
        }

        if (perfil.fechaNacimiento) {
            lineaEdad =
                `┃ 🎂 Edad › *${calcularEdad(perfil.fechaNacimiento)} años*\n`;
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

        const texto =
`
╭〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
┃
┃ 👤 𝐏𝐄𝐑𝐅𝐈𝐋
┃
┃ 🆔 Usuario › @${numero}
${lineaNombre}${lineaBio}┃
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
┃ 💡 Edita con:
┃ ➪ .setmyname / .setdesc
┃
╰━━━━━━━━━━━━━━━━⬣
`;

        const fotoUrl =
            await conTimeout(
                obtenerFotoUrl(sock, id),
                TIMEOUT_FOTO
            );

        if (fotoUrl) {
            try {
                await sock.sendMessage(
                    chatJid,
                    {
                        image: { url: fotoUrl },
                        caption: texto,
                        mentions
                    },
                    {
                        quoted: msg
                    }
                );
                return;
            } catch {}
        }

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
};