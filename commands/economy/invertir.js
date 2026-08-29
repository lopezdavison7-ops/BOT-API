// ============================================================
// COMANDO INVERTIR (.invertir)
// ============================================================

import { getDB, saveDB, getUser, obtenerMencionesFijas, formatMoney } from './utilsEconomia.js';

export default {
    nombre: 'invertir',
    categoria: 'Economía',
    alias: ['inversion', 'apostar', 'riesgo'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            const monto = parseInt(args[0]);
            if (!monto || monto <= 0) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Monto inválido*

> Usa: *${prefijo}invertir <cantidad>*

💡 Ejemplo: *${prefijo}invertir 1000*`
                }, { quoted: msg });
            }

            if (monto > user.dinero) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Dinero insuficiente*

> Necesitas ${formatMoney(monto)}
> Tienes: ${formatMoney(user.dinero)}`
                }, { quoted: msg });
            }

            // 40% pierde, 35% gana poco, 20% gana bien, 5% gana mucho
            const rand = Math.random();
            let resultado, ganancia, mensaje, emoji;

            if (rand < 0.40) {
                ganancia = -monto;
                resultado = 'perdida';
                emoji = '💔';
                mensaje = '¡Perdiste toda la inversión!';
            } else if (rand < 0.75) {
                ganancia = Math.floor(monto * 0.5);
                resultado = 'ganancia';
                emoji = '💰';
                mensaje = 'Ganancia modesta';
            } else if (rand < 0.95) {
                ganancia = Math.floor(monto * 1.5);
                resultado = 'buena';
                emoji = '⭐';
                mensaje = '¡Buena inversión!';
            } else {
                ganancia = monto * 3;
                resultado = 'jackpot';
                emoji = '🎉';
                mensaje = '¡INVERSIONAZA! Jackpot x3';
            }

            user.dinero += ganancia;
            if (user.dinero < 0) user.dinero = 0;
            saveDB(db);

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           ${emoji}  *${mensaje.toUpperCase()}*  ${emoji}
`;
            texto += `        · · ·  𝐼𝒩𝒱𝐸𝑅𝒮𝐼Ó𝒩  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `  💵  Invertido   ▸ ${formatMoney(monto)}
`;
            texto += `  ${ganancia >= 0 ? '💰' : '💸'}  Resultado   ▸ ${ganancia >= 0 ? '+' : ''}${formatMoney(ganancia)}
`;
            texto += `  💵  Dinero      ▸ ${formatMoney(user.dinero)}

`;
            texto += `  📊  Probabilidad ▸ ${(rand * 100).toFixed(1)}%

`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  💡  Usa *${prefijo}invertir* de nuevo

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[INVERTIR] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
