// ============================================================
// COMANDO COBRAR (.cobrar)
// ============================================================

import { getDB, saveDB, getUser, obtenerMencionesFijas, formatMoney, NEGOCIOS_BASE } from './utilsEconomia.js';

export default {
    nombre: 'cobrar',
    categoria: 'Economía',
    alias: ['recaudar', 'renta', 'collect'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            if (user.negocios.length === 0) {
                return await sock.sendMessage(jid, {
                    text: `❌ *No tienes negocios*

> Compra uno con *${prefijo}negocio*`
                }, { quoted: msg });
            }

            const ahora = Date.now();
            const ultima = user.ultimaCobranza || 0;
            const tiempoPaso = ahora - ultima;
            const horas = Math.floor(tiempoPaso / 3600000);

            if (horas < 1) {
                const minutos = Math.ceil((3600000 - tiempoPaso) / 60000);
                return await sock.sendMessage(jid, {
                    text: `⏳ *Espera un poco*

> Faltan ${minutos} minutos para cobrar

💡 Las rentas se cobran cada hora.`
                }, { quoted: msg });
            }

            let totalRenta = 0;
            for (const n of user.negocios) {
                const info = NEGOCIOS_BASE.find(nb => nb.id === n.id);
                if (info) {
                    totalRenta += info.renta * horas;
                }
            }

            user.dinero += totalRenta;
            user.ultimaCobranza = ahora;
            saveDB(db);

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           💰  *RECAUDADO*  💰
`;
            texto += `        · · ·  𝑅𝐸𝒩𝒯𝒜𝒮  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `  ⏱️  Horas acumuladas ▸ ${horas}h
`;
            texto += `  💰  Total recaudado  ▸ ${formatMoney(totalRenta)}
`;
            texto += `  💵  Dinero actual     ▸ ${formatMoney(user.dinero)}

`;

            for (const n of user.negocios) {
                const info = NEGOCIOS_BASE.find(nb => nb.id === n.id);
                if (info) {
                    texto += `  ◇ ${info.nombre} ▸ ${formatMoney(info.renta * horas)}
`;
                }
            }

            texto += `
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  💡  Vuelve en 1 hora para cobrar de nuevo

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[COBRAR] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
