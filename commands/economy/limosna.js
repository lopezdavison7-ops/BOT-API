import {
    obtenerUsuario,
    modificarDinero,
    guardarUsuario
} from '../../database/economia.js';

const COOLDOWN_LIMOSNA = 12 * 60 * 60 * 1000; // 12 horas

function formatearTiempo(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms % 3600000 / 60000);
    return `${h} hora(s) y ${m} minuto(s)`;
}

export default {
    nombre: 'limosna',
    categoria: 'economia',
    alias: ['beg', 'mendigar'],
    descripcion: 'Pide limosna cada 12 horas.',
    ejecutar: async ({ msg, responder }) => {
        const id = msg.key.participant || msg.key.remoteJid;
        const usuario = obtenerUsuario(id);
        const ahora = Date.now();
        const ultimo = Number(usuario.ultimoLimosna || 0);
        const transcurrido = ahora - ultimo;

        if (ultimo && transcurrido < COOLDOWN_LIMOSNA) {
            const restante = COOLDOWN_LIMOSNA - transcurrido;
            return await responder.texto(
                `⏳ *LIMOSNA EN COOLDOWN*\n\n` +
                `🎁 Podrás pedir otra vez en:\n` +
                `⏱️ *${formatearTiempo(restante)}*`
            );
        }

        const cantidad = Math.floor(Math.random() * 91) + 10;
        
        usuario.ultimoLimosna = ahora;
        guardarUsuario(id, usuario);
        modificarDinero(id, cantidad);

        await responder.texto(
            `╭〔 🙏 𝐋𝐈𝐌𝐎𝐒𝐍𝐀 〕⬣\n` +
            `┃\n` +
            `┃ 💰 Alguien te dio:\n` +
            `┃\n` +
            `┃ 💵 *$${cantidad.toLocaleString()}*\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `🍀 Vuelve en 12 horas\n\n` +
            `╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`
        );
    }
};