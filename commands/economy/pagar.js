// ============================================================
// COMANDO PAGAR (.pagar)
// ============================================================

import { getDB, saveDB, getUser, obtenerMencionesFijas, formatMoney } from './utilsEconomia.js';

export default {
    nombre: 'pagar',
    categoria: 'Economía',
    alias: ['abonar', 'payloan'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            if (user.deuda <= 0) {
                return await sock.sendMessage(jid, {
                    text: `🟢 *No tienes deudas*

> No hay nada que pagar.

💡 Usa *${prefijo}credito* si necesitas dinero.`
                }, { quoted: msg });
            }

            const montoPagar = parseInt(args[0]) || user.cuotaMonto;

            if (montoPagar > user.dinero) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Dinero insuficiente*

> Necesitas ${formatMoney(montoPagar)}
> Tienes: ${formatMoney(user.dinero)}

💡 Trabaja con *${prefijo}trabajar*`
                }, { quoted: msg });
            }

            if (montoPagar > user.deuda) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Monto excede la deuda*

> Debes: ${formatMoney(user.deuda)}
> Intentaste pagar: ${formatMoney(montoPagar)}`
                }, { quoted: msg });
            }

            user.dinero -= montoPagar;
            user.deuda -= montoPagar;
            user.totalPagado = (user.totalPagado || 0) + montoPagar;

            if (user.deuda <= 0) {
                user.deuda = 0;
                user.cuotasPendientes = 0;
                user.cuotaMonto = 0;
                user.moroso = false;
                user.historialCrediticio = Math.min(100, user.historialCrediticio + 5);
            } else {
                user.cuotasPendientes = Math.max(0, user.cuotasPendientes - 1);
            }

            saveDB(db);

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           ✅  *PAGO REALIZADO*  ✅
`;
            texto += `        · · ·  𝒜𝐵𝒪𝒩𝒪  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `  💸  Pagado        ▸ ${formatMoney(montoPagar)}
`;
            texto += `  📉  Deuda restante ▸ ${formatMoney(user.deuda)}
`;
            texto += `  📋  Cuotas faltan  ▸ ${user.cuotasPendientes}
`;
            texto += `  💵  Dinero actual  ▸ ${formatMoney(user.dinero)}

`;

            if (user.deuda <= 0) {
                texto += `  🎉  *¡Deuda saldada!*
`;
                texto += `  ⭐  Crédito +5 puntos

`;
            }

            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  💡  Usa *${prefijo}deuda* para ver estado

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[PAGAR] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
