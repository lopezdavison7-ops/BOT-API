// commands/system/afk.js
// ============================================================
// COMANDO: AFK
// ============================================================
//
// Uso:
// .afk
// .afk estoy ocupado
//
// El usuario queda AFK en el chat actual hasta que vuelva a
// escribir. Cuando regresa, BOT-API lo anuncia automáticamente.
// ============================================================

import { marcarAfk } from '../../lib/afk.js';

export default {
    nombre: 'afk',
    categoria: 'Interacción',
    alias: ['ausente', 'away'],
    descripcion: 'Te pone en modo AFK hasta que vuelvas a escribir.',

    ejecutar: async ({ sock, msg, jid, argumento, responder }) => {
        const razon = argumento?.trim() || '';
        const datos = marcarAfk({
            jid,
            msg,
            razon
        });

        if (!datos) {
            await responder.texto('❌ No pude identificar al usuario.');
            return;
        }

        const mencionado = msg?.key?.participant || msg?.key?.remoteJid;
        const numero = String(mencionado || datos.usuario)
            .split('@')[0]
            .split(':')[0]
            .replace(/\D/g, '');

        let texto =
            `╭━━〔 💤 *MODO AFK* 〕━━⬣\n` +
            `┃\n` +
            `┃ 💤 @${numero || 'usuario'} se fue a AFK.\n`;

        if (razon) {
            texto += `┃ 💬 Motivo: *${razon}*\n`;
        }

        texto +=
            `┃\n` +
            `┃ 🌑 Volverá cuando escriba\n` +
            `┃ nuevamente en este chat.\n` +
            `┃\n` +
            `╰━━━━━━━━━━━━━━━━⬣`;

        await sock.sendMessage(jid, {
            text: texto,
            mentions: numero ? [`${numero}@s.whatsapp.net`] : []
        }, { quoted: msg });
    }
};
