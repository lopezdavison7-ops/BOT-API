// commands/economy/hunt.js
// ============================================================
// BOT-API
// COMANDO: HUNT
// ============================================================

import {
    obtenerUsuario,
    guardarUsuario
} from '../../database/economia.js';

const COOLDOWN = 30 * 60 * 1000;

const resultados = [
    {
        texto: '🏹 Encontraste una presa y conseguiste una buena recompensa.',
        min: 500,
        max: 2500
    },
    {
        texto: '🌲 Después de buscar por el bosque encontraste algo valioso.',
        min: 800,
        max: 3500
    },
    {
        texto: '🦌 Tu expedición fue todo un éxito.',
        min: 1200,
        max: 4500
    },
    {
        texto: '🍀 Tuviste mucha suerte durante la cacería.',
        min: 2000,
        max: 6000
    }
];

export default {
    nombre: 'hunt',

    categoria: 'economia',

    alias: [
        'cazar',
        'caza'
    ],

    descripcion:
        'Sal de cacería y consigue una recompensa.',

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
                usuario.ultimoHunt || 0
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
                        `⏳ *HUNT*\n\n` +
                        `Ya saliste de cacería recientemente.\n\n` +
                        `🏹 Podrás volver a cazar en aproximadamente *${minutos} minutos*.`
                },
                {
                    quoted: msg
                }
            );

            return;
        }

        usuario.ultimoHunt =
            ahora;

        const resultado =
            resultados[
                Math.floor(
                    Math.random() *
                    resultados.length
                )
            ];

        const recompensa =
            Math.floor(
                Math.random() *
                (
                    resultado.max -
                    resultado.min +
                    1
                )
            ) +
            resultado.min;

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
                    `╭━━〔 🏹 *HUNT* 〕━━⬣\n` +
                    `┃\n` +
                    `┃ ${resultado.texto}\n` +
                    `┃\n` +
                    `┃ 💰 Ganaste › *$${recompensa.toLocaleString()}*\n` +
                    `┃ 💵 Saldo › *$${Number(usuario.dinero).toLocaleString()}*\n` +
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