// ============================================================
// COMANDO DUELO (.duelo)
// ============================================================

import { getDB, saveDB, getUser, obtenerMencionesFijas, formatMoney } from './utilsEconomia.js';

const DUEL_TIMEOUT = 60000; // 60 segundos para aceptar
const activeDuels = new Map();

export default {
    nombre: 'duelo',
    categoria: 'Economía',
    alias: ['vs', 'apostar', 'bet'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();

            // Si responde a un duelo activo
            const duelKey = `${jid}_${autorJid}`;
            const activeDuel = activeDuels.get(duelKey) || activeDuels.get(`${jid}_${args[0]?.replace('@', '')}@s.whatsapp.net`);

            if (args[0]?.toLowerCase() === 'aceptar' || args[0]?.toLowerCase() === 'yes') {
                // Buscar duelo pendiente donde este usuario es el retado
                let foundDuel = null;
                let foundKey = null;
                for (const [key, duel] of activeDuels) {
                    if (duel.retado === autorJid && !duel.aceptado) {
                        foundDuel = duel;
                        foundKey = key;
                        break;
                    }
                }

                if (!foundDuel) {
                    return await sock.sendMessage(jid, {
                        text: `❌ *No tienes duelos pendientes*

> Nadie te ha retado.`
                    }, { quoted: msg });
                }

                const retador = getUser(db, foundDuel.retador);
                const retado = getUser(db, foundDuel.retado);

                if (retado.dinero < foundDuel.monto) {
                    activeDuels.delete(foundKey);
                    return await sock.sendMessage(jid, {
                        text: `❌ *No tienes suficiente dinero*

> Necesitas ${formatMoney(foundDuel.monto)}
> Tienes: ${formatMoney(retado.dinero)}`
                    }, { quoted: msg });
                }

                // RESOLVER DUELO
                const ganador = Math.random() < 0.5 ? foundDuel.retador : foundDuel.retado;
                const perdedor = ganador === foundDuel.retador ? foundDuel.retado : foundDuel.retador;
                const ganadorUser = getUser(db, ganador);
                const perdedorUser = getUser(db, perdedor);

                ganadorUser.dinero += foundDuel.monto;
                perdedorUser.dinero -= foundDuel.monto;
                ganadorUser.duelosGanados = (ganadorUser.duelosGanados || 0) + 1;
                perdedorUser.duelosPerdidos = (perdedorUser.duelosPerdidos || 0) + 1;

                saveDB(db);
                activeDuels.delete(foundKey);

                const gNum = ganador.split('@')[0];
                const pNum = perdedor.split('@')[0];

                let texto = `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `           ⚔️  *DUELO FINALIZADO*  ⚔️
`;
                texto += `        · · ·  𝑅𝐸𝒮𝒰𝐿𝒯𝒜𝒟𝒪  · · ·

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `  🏆  Ganador ▸ @${gNum}
`;
                texto += `  💰  Bote     ▸ ${formatMoney(foundDuel.monto * 2)}
`;
                texto += `  💵  Premio   ▸ ${formatMoney(foundDuel.monto)}

`;
                texto += `  💔  Perdedor ▸ @${pNum}

`;
                texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                texto += `  💡  Usa *${prefijo}duelo @user <monto>* para revancha

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

                return await sock.sendMessage(jid, {
                    text: texto,
                    mentions: [ganador, perdedor, ...menciones]
                }, { quoted: msg });
            }

            // CREAR NUEVO DUELO
            const target = args[0];
            const monto = parseInt(args[1]);

            if (!target || !monto || monto <= 0) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Formato incorrecto*

> Usa: *${prefijo}duelo @user <monto>*

💡 Ejemplo: *${prefijo}duelo @usuario 5000*`
                }, { quoted: msg });
            }

            const targetJid = target.replace('@', '') + '@s.whatsapp.net';
            if (targetJid === autorJid) {
                return await sock.sendMessage(jid, {
                    text: `❌ *No puedes retarte a ti mismo*

> Busca un rival digno.`
                }, { quoted: msg });
            }

            if (user.dinero < monto) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Dinero insuficiente*

> Necesitas ${formatMoney(monto)}
> Tienes: ${formatMoney(user.dinero)}`
                }, { quoted: msg });
            }

            const targetNum = targetJid.split('@')[0];
            const key = `${jid}_${targetJid}`;

            activeDuels.set(key, {
                retador: autorJid,
                retado: targetJid,
                monto: monto,
                aceptado: false,
                time: Date.now()
            });

            // Auto-limpiar después de 60s
            setTimeout(() => {
                if (activeDuels.has(key)) {
                    activeDuels.delete(key);
                    sock.sendMessage(jid, {
                        text: `⏳ *Duelo expirado*

> @${targetNum} no respondió a tiempo.`
                    }).catch(() => {});
                }
            }, DUEL_TIMEOUT);

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           ⚔️  *DUELO*  ⚔️
`;
            texto += `        · · ·  𝒟𝐸𝒮𝐹Í𝒪  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `  🥊  Retador ▸ @${num}
`;
            texto += `  🎯  Retado  ▸ @${targetNum}
`;
            texto += `  💰  Apuesta ▸ ${formatMoney(monto)}
`;
            texto += `  🏆  Bote    ▸ ${formatMoney(monto * 2)}

`;
            texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
            texto += `  @${targetNum} escribe *${prefijo}duelo aceptar*
`;
            texto += `  ⏱️  Tienes 60 segundos para aceptar

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, {
                text: texto,
                mentions: [autorJid, targetJid, ...menciones]
            }, { quoted: msg });

        } catch (error) {
            console.error('[DUELO] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
