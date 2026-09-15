// commands/economy/monthly.js
// ============================================================
// BOT-API — MONTHLY (recompensa mensual)
// ============================================================
// .monthly → Obtén tu recompensa mensual (cada 30 días)
// ============================================================

import {
    obtenerUsuario,
    modificarDinero,
    guardarUsuario
} from '../../database/economia.js';

const COOLDOWN_MONTHLY = 30 * 24 * 60 * 60 * 1000; // 30 días en milisegundos

function formatearTiempo(ms) {
    const totalMinutos = Math.ceil(ms / 60000);
    const dias = Math.floor(totalMinutos / (60 * 24));
    const horas = Math.floor((totalMinutos % (60 * 24)) / 60);
    const minutos = totalMinutos % 60;

    if (dias > 0 && horas > 0) {
        return `${dias} día(s) y ${horas} hora(s)`;
    }

    if (dias > 0) {
        return `${dias} día(s)`;
    }

    if (horas > 0 && minutos > 0) {
        return `${horas} hora(s) y ${minutos} minuto(s)`;
    }

    if (horas > 0) {
        return `${horas} hora(s)`;
    }

    return `${minutos} minuto(s)`;
}

export default {
    nombre: 'monthly',
    categoria: 'Economía',
    alias: ['mensual', 'recompensamensual', 'mes'],
    descripcion: 'Obtén tu recompensa mensual (cada 30 días)',
    ejecutar: async ({ msg, responder }) => {
        const id = msg.key.participant || msg.key.remoteJid;
        const usuario = obtenerUsuario(id);
        const ahora = Date.now();
        const ultimoMonthly = Number(usuario.ultimoMonthly || 0);
        const transcurrido = ahora - ultimoMonthly;

        // ----------------------------------------------------
        // COMPROBAR COOLDOWN
        // ----------------------------------------------------
        if (ultimoMonthly && transcurrido < COOLDOWN_MONTHLY) {
            const restante = COOLDOWN_MONTHLY - transcurrido;

            await responder.texto(
                `╭〔 ⏳ 𝐌𝐎𝐍𝐓𝐇𝐋𝐘 〕⬣\n` +
                `┃\n` +
                `┃ Ya reclamaste tu recompensa mensual.\n` +
                `┃\n` +
                `┃ 🎁 Podrás volver a usar *.monthly* en:\n` +
                `┃ ⏱️ *${formatearTiempo(restante)}*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━⬣`
            );
            return;
        }

        // ----------------------------------------------------
        // RECOMPENSA (entre $50,000 y $100,000)
        // ----------------------------------------------------
        const cantidad = Math.floor(Math.random() * 50001) + 50000;

        usuario.ultimoMonthly = ahora;
        guardarUsuario(id, usuario);
        modificarDinero(id, cantidad);

        // ----------------------------------------------------
        // RESPUESTA
        // ----------------------------------------------------
        await responder.texto(
            `╭〔 🎁 𝐌𝐎𝐍𝐓𝐇𝐋𝐘 〕⬣\n` +
            `┃\n` +
            `┃ 💰 ¡Recompensa mensual recibida!\n` +
            `┃\n` +
            `┃ 💵 *$${cantidad.toLocaleString()}*\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `🍀 ¡Vuelve en 30 días por otra recompensa!\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕⬣`
        );
    }
};