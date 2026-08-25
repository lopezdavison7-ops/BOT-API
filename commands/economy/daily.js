
// commands/economy/daily.js
import {
    obtenerUsuario,
    modificarDinero,
    guardarUsuario
} from '../../database/economia.js';

const COOLDOWN_DAILY =
    24 * 60 * 60 * 1000;

function formatearTiempo(ms) {
    const totalMinutos =
        Math.ceil(ms / 60000);

    const horas =
        Math.floor(totalMinutos / 60);

    const minutos =
        totalMinutos % 60;

    if (horas > 0 && minutos > 0) {
        return `${horas} hora(s) y ${minutos} minuto(s)`;
    }

    if (horas > 0) {
        return `${horas} hora(s)`;
    }

    return `${minutos} minuto(s)`;
}

export default {
    nombre: 'daily',

    categoria: 'economia',

    alias: [
        'diario',
        'recompensa'
    ],

    descripcion:
        'Obtén tu recompensa diaria.',

    ejecutar: async ({
        msg,
        responder
    }) => {

        const id =
            msg.key.participant ||
            msg.key.remoteJid;

        const usuario =
            obtenerUsuario(id);

        const ahora =
            Date.now();

        const ultimoDaily =
            Number(
                usuario.ultimoDaily || 0
            );

        const transcurrido =
            ahora - ultimoDaily;

        // ----------------------------------------------------
        // COMPROBAR COOLDOWN
        // ----------------------------------------------------

        if (
            ultimoDaily &&
            transcurrido < COOLDOWN_DAILY
        ) {

            const restante =
                COOLDOWN_DAILY -
                transcurrido;

            await responder.texto(
                `⏳ *DAILY EN COOLDOWN*\n\n` +
                `Ya reclamaste tu recompensa diaria.\n\n` +
                `🎁 Podrás volver a usar *.daily* en:\n` +
                `⏱️ *${formatearTiempo(restante)}*`
            );

            return;
        }

        // ----------------------------------------------------
        // RECOMPENSA
        // ----------------------------------------------------

        const cantidad =
            Math.floor(
                Math.random() * 5001
            ) + 500;

        usuario.ultimoDaily =
            ahora;

        guardarUsuario(
            id,
            usuario
        );

        modificarDinero(
            id,
            cantidad
        );

        // ----------------------------------------------------
        // RESPUESTA
        // ----------------------------------------------------

        await responder.texto(
            `╭〔 🎁 𝐃𝐀𝐈𝐋𝐘 〕⬣\n` +
            `┃\n` +
            `┃ 💰 Recompensa recibida:\n` +
            `┃\n` +
            `┃ 💵 *$${cantidad.toLocaleString()}*\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `🍀 ¡Vuelve mañana por otra recompensa!\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
    }
};