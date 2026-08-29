// ============================================================
// COMANDO MOROSOS (.morosos)
// ============================================================

import { getDB, obtenerMencionesFijas, formatMoney } from './utilsEconomia.js';

export default {
    nombre: 'morosos',
    categoria: 'Economía',
    alias: ['deudores', 'moroso'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            const morosos = Object.entries(db.usuarios)
                .filter(([_, u]) => u.deuda > 0)
                .sort((a, b) => b[1].deuda - a[1].deuda);

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           🔴  *MOROSOS*  🔴
`;
            texto += `        · · ·  𝐿𝐼𝒮𝒯𝒜  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;

            if (morosos.length === 0) {
                texto += `  🟢  *No hay deudores*

`;
                texto += `  > Todos están al día con el banco.

`;
            } else {
                for (let i = 0; i < Math.min(10, morosos.length); i++) {
                    const [id, u] = morosos[i];
                    const n = id.split('@')[0];
                    texto += `  ${i + 1}. @${n}
`;
                    texto += `  > Debe: ${formatMoney(u.deuda)} | Cuotas: ${u.cuotasPendientes}

`;
                    mencionesTotal.push(id);
                }
            }

            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  💡  Usa *${prefijo}deuda* para ver tu estado

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: [...new Set(mencionesTotal)] }, { quoted: msg });

        } catch (error) {
            console.error('[MOROSOS] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
