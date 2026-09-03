// commands/economy/weekly.js
// ============================================================
// BOT-API
// COMANDO: WEEKLY
// ============================================================

import {
    obtenerUsuario,
    guardarUsuario
} from '../../database/economia.js';

const COOLDOWN = 7 * 24 * 60 * 60 * 1000;

export default {
    nombre: 'weekly',

    categoria: 'economia',

    alias: [
        'semanal'
    ],

    descripcion:
        'Reclama tu recompensa semanal.',

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
                usuario.ultimoWeekly || 0
            );

        const restante =
            COOLDOWN -
            (ahora - ultimo);

        if (restante > 0) {

            const dias =
                Math.floor(
                    restante /
                    (24 * 60 * 60 * 1000)
                );

            const horas =
                Math.floor(
                    (
                        restante %
                        (24 * 60 * 60 * 1000)
                    ) /
                    (60 * 60 * 1000)
                );

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        `⏳ *WEEKLY*\n\n` +
                        `Ya reclamaste tu recompensa semanal.\n\n` +
                        `🕐 Disponible nuevamente en: *${dias}d ${horas}h*`
                },
                {
                    quoted: msg
                }
            );

            return;
        }

        const recompensa =
            Math.floor(
                Math.random() *
                5001
            ) + 10000;

        usuario.dinero =
            Number(
                usuario.dinero || 0
            ) + recompensa;

        usuario.ultimoWeekly =
            ahora;

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
                    `╭━━〔 🎁 *WEEKLY* 〕━━⬣\n` +
                    `┃\n` +
                    `┃ 👤 @${numero}\n` +
                    `┃\n` +
                    `┃ 💰 Recompensa › *$${recompensa.toLocaleString()}*\n` +
                    `┃\n` +
                    `┃ 🎉 ¡Recompensa semanal reclamada!\n` +
                    `┃ 📅 Vuelve la próxima semana.\n` +
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