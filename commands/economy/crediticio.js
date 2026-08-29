// ============================================================
// COMANDO CREDITICIO (.crediticio)
// ============================================================

import { getDB, getUser, obtenerMencionesFijas, formatMoney } from './utilsEconomia.js';

export default {
    nombre: 'crediticio',
    categoria: 'Economía',
    alias: ['score', 'historial', 'credito'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            const score = user.historialCrediticio;
            const barra = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
            let estado = score >= 80 ? '🟢 Excelente' : score >= 50 ? '🟡 Regular' : score >= 20 ? '🟠 Bajo' : '🔴 Pésimo';

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           📊  *HISTORIAL*  📊
`;
            texto += `        · · ·  𝒞𝑅𝐸𝒟𝐼𝒯𝐼𝒞𝐼𝒪  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `  📈  Puntaje   ▸ ${score}/100
`;
            texto += `  ${barra}
`;
            texto += `  🏷️  Estado    ▸ ${estado}

`;
            texto += `  📋  Préstamos ▸ ${user.totalPrestamos || 0}
`;
            texto += `  💵  Pagado    ▸ ${formatMoney(user.totalPagado || 0)}
`;
            texto += `  🏆  Duelos G  ▸ ${user.duelosGanados || 0}
`;
            texto += `  💔  Duelos P  ▸ ${user.duelosPerdidos || 0}

`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  ${score >= 80 ? '⭐ Puedes acceder a préstamos GRANDES' : score >= 50 ? '💡 Puedes acceder a préstamos MEDIANOS' : '⚠️ Solo préstamos PEQUEÑOS disponibles'}

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[CREDITICIO] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
