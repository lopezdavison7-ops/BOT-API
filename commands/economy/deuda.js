// ============================================================
// COMANDO DEUDA (.deuda)
// ============================================================

import { getDB, getUser, obtenerMencionesFijas, formatMoney } from './utilsEconomia.js';

export default {
    nombre: 'deuda',
    categoria: 'Economía',
    alias: ['loanstatus', 'prestamo'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           📉  *DEUDA*  📉
`;
            texto += `        · · ·  𝐸𝒮𝒯𝒜𝒟𝒪  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;

            if (user.deuda <= 0) {
                texto += `  🟢  *No tienes deudas activas*

`;
                texto += `  > Estás al día con el banco.
`;
                texto += `  > Puedes solicitar un crédito cuando quieras.

`;
            } else {
                const pagado = user.totalPagado || 0;
                const original = pagado + user.deuda;
                const porcentaje = Math.floor((pagado / original) * 100);
                const barra = '█'.repeat(Math.floor(porcentaje / 10)) + '░'.repeat(10 - Math.floor(porcentaje / 10));

                texto += `  📉  Deuda restante ▸ ${formatMoney(user.deuda)}
`;
                texto += `  📋  Cuotas faltan  ▸ ${user.cuotasPendientes}
`;
                texto += `  💸  Cuota mensual  ▸ ${formatMoney(user.cuotaMonto)}
`;
                texto += `  📊  Progreso        ▸ ${barra} ${porcentaje}%

`;
                texto += `  💵  Ya pagado      ▸ ${formatMoney(pagado)}
`;
                texto += `  📈  Total original  ▸ ${formatMoney(original)}

`;
            }

            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  💡  Usa *${prefijo}pagar* para abonar cuota
`;
            texto += `  💡  Usa *${prefijo}credito* para nuevo préstamo

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[DEUDA] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
