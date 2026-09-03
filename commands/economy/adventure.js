// commands/economy/adventure.js
// ============================================================
// BOT-API
// COMANDO: ADVENTURE
// ============================================================

import {
    obtenerUsuario,
    guardarUsuario
} from '../../database/economia.js';

const COOLDOWN = 60 * 60 * 1000;

const aventuras = [
    {
        texto:
            '🏰 Entraste a un castillo abandonado y encontraste un cofre lleno de monedas.',
        min: 1500,
        max: 7000
    },
    {
        texto:
            '🗺️ Seguiste un antiguo mapa y encontraste un tesoro escondido.',
        min: 2500,
        max: 9000
    },
    {
        texto:
            '🌴 Exploraste una isla desconocida y encontraste objetos valiosos.',
        min: 2000,
        max: 8000
    },
    {
        texto:
            '⛰️ Llegaste a la cima de una montaña y descubriste una recompensa.',
        min: 3000,
        max: 10000
    },
    {
        texto:
            '💎 Encontraste una pequeña mina de diamantes durante tu aventura.',
        min: 4000,
        max: 12000
    }
];

export default {
    nombre: 'adventure',

    categoria: 'economia',

    alias: [
        'aventura',
        'aventurar'
    ],

    descripcion:
        'Realiza una aventura y consigue una recompensa aleatoria.',

    ejecutar: async ({
        sock,
        msg
    }) => {

        const id =
            msg.key.participant ||
            msg.key.participantAlt ||
            msg.key.remoteJid;

        if (!id) return;

        const usuario =
            obtenerUsuario(id);

        const ahora =
            Date.now();

        const ultimo =
            Number(
                usuario.ultimoAdventure || 0
            );

        const restante =
            COOLDOWN -
            (ahora - ultimo);

        if (restante > 0) {

            const minutos =
                Math.ceil(
                    restante /
                    (60 * 1000)
                );

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        `⏳ *ADVENTURE*\n\n` +
                        `Ya realizaste una aventura recientemente.\n\n` +
                        `🗺️ Podrás volver a aventurarte en aproximadamente *${minutos} minutos*.`
                },
                {
                    quoted: msg
                }
            );

            return;
        }

        usuario.ultimoAdventure =
            ahora;

        const aventura =
            aventuras[
                Math.floor(
                    Math.random() *
                    aventuras.length
                )
            ];

        const recompensa =
            Math.floor(
                Math.random() *
                (
                    aventura.max -
                    aventura.min +
                    1
                )
            ) +
            aventura.min;

        usuario.dinero =
            Number(
                usuario.dinero || 0
            ) + recompensa;

        guardarUsuario(
            id,
            usuario
        );

        const numero =
            String(id)
                .split('@')[0]
                .split(':')[0];

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    `╭━━〔 🗺️ *ADVENTURE* 〕━━⬣\n` +
                    `┃\n` +
                    `┃ ${aventura.texto}\n` +
                    `┃\n` +
                    `┃ 💰 Recompensa › *$${recompensa.toLocaleString()}*\n` +
                    `┃ 💵 Saldo › *$${Number(usuario.dinero).toLocaleString()}*\n` +
                    `┃\n` +
                    `┃ 🎉 ¡Aventura completada!\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━⬣`,
                mentions: [
                    id
                ]
            },
            {
                quoted: msg
            }
        );
    }
};