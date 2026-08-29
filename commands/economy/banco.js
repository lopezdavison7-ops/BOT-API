// ============================================================
// COMANDO BANCO (.banco)
// ============================================================

import { getDB, getUser, obtenerMencionesFijas, formatMoney, getPrestamosDisponibles, NEGOCIOS_BASE } from './utilsEconomia.js';

export default {
    nombre: 'banco',
    categoria: 'Economía',
    alias: ['bank', 'eco', 'economia'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            const prestamos = getPrestamosDisponibles(user.historialCrediticio);

            let texto = `👋 ¡Hola @${num}! ✨
`;
            if (txtMenciones) texto += `
👥 ${txtMenciones}
`;
            texto += `
`;

            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           ₍ᐢ..ᐢ₎  *BANCO*  ₍ᐢ..ᐢ₎
`;
            texto += `        · · ·  𝐸𝒞𝒪𝒩𝒪𝑀Í𝒜  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;

            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            texto += `         💰  *TU CUENTA*  💰
`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  💵  Dinero    ▸  ${formatMoney(user.dinero)}
`;
            texto += `  🏦  Banco     ▸  ${formatMoney(user.banco)}
`;
            texto += `  📉  Deuda     ▸  ${formatMoney(user.deuda)}
`;
            texto += `  📊  Crédito   ▸  ${user.historialCrediticio}/100
`;
            texto += `  ${user.moroso ? '🔴  Estado    ▸  MOROSO' : '🟢  Estado    ▸  Al día'}

`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            texto += `         ⛁  *PRÉSTAMOS*  ⛁
`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            for (const p of prestamos) {
                const total = Math.floor(p.monto * (1 + p.interes));
                const cuota = Math.floor(total / p.cuotas);
                texto += `  ◇ *${p.nombre}* ▸ ${formatMoney(p.monto)}
`;
                texto += `  > ${p.cuotas} cuotas de ${formatMoney(cuota)}
`;
                texto += `  > Interés: ${(p.interes * 100).toFixed(0)}% | Total: ${formatMoney(total)}

`;
            }
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
            texto += `         🏢  *NEGOCIOS*  🏢
`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            for (const n of NEGOCIOS_BASE) {
                texto += `  ◇ *${n.nombre}*
`;
                texto += `  > Costo: ${formatMoney(n.costo)} | Renta: ${formatMoney(n.renta)}/h

`;
            }
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

            texto += `  💡  Usa *${prefijo}credito <tipo>* para solicitar
`;
            texto += `  💡  Usa *${prefijo}negocio* para comprar negocios

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[BANCO] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
