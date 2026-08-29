// ============================================================
// COMANDO NEGOCIO (.negocio)
// ============================================================

import { getDB, saveDB, getUser, obtenerMencionesFijas, formatMoney, NEGOCIOS_BASE } from './utilsEconomia.js';

export default {
    nombre: 'negocio',
    categoria: 'Economía',
    alias: ['negocios', 'business', 'empresa'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            const accion = args[0]?.toLowerCase();

            // Sin argumentos: mostrar mis negocios y disponibles
            if (!accion) {
                let texto = `👋 ¡Hola @${num}! ✨

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `           🏢  *MIS NEGOCIOS*  🏢
`;
                texto += `        · · ·  𝒫𝒜𝒯𝑅𝐼𝑀𝒪𝒩𝐼𝒪  · · ·

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;

                if (user.negocios.length === 0) {
                    texto += `  📭  *No tienes negocios*

`;
                    texto += `  > Compra uno con *${prefijo}negocio comprar <nombre>*

`;
                } else {
                    let rentaTotal = 0;
                    for (const n of user.negocios) {
                        const info = NEGOCIOS_BASE.find(nb => nb.id === n.id);
                        if (info) {
                            rentaTotal += info.renta;
                            texto += `  ◇ *${info.nombre}*
`;
                            texto += `  > Renta: ${formatMoney(info.renta)}/h

`;
                        }
                    }
                    texto += `  💰  Renta total ▸ ${formatMoney(rentaTotal)}/h

`;
                }

                texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
                texto += `         🏪  *DISPONIBLES*  🏪
`;
                texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                for (const n of NEGOCIOS_BASE) {
                    const tiene = user.negocios.some(un => un.id === n.id);
                    texto += `  ${tiene ? '✅' : '◇'} *${n.nombre}*
`;
                    texto += `  > Costo: ${formatMoney(n.costo)} | Renta: ${formatMoney(n.renta)}/h
`;
                    texto += `  > Comprar: *${prefijo}negocio comprar ${n.id}*

`;
                }

                texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                texto += `  💡  Usa *${prefijo}cobrar* para recaudar

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;
                return await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });
            }

            // COMPRAR
            if (accion === 'comprar' || accion === 'buy') {
                const negId = args[1]?.toLowerCase();
                const negocio = NEGOCIOS_BASE.find(n => n.id === negId);

                if (!negocio) {
                    return await sock.sendMessage(jid, {
                        text: `❌ *Negocio no encontrado*

> Opciones: tiendita, cafe, restaurante, fabrica, casino

💡 Usa *${prefijo}negocio* para ver lista.`
                    }, { quoted: msg });
                }

                if (user.negocios.some(n => n.id === negId)) {
                    return await sock.sendMessage(jid, {
                        text: `❌ *Ya tienes este negocio*

> No puedes comprar el mismo dos veces.`
                    }, { quoted: msg });
                }

                if (user.dinero < negocio.costo) {
                    return await sock.sendMessage(jid, {
                        text: `❌ *Dinero insuficiente*

> Necesitas ${formatMoney(negocio.costo)}
> Tienes: ${formatMoney(user.dinero)}

💡 Trabaja con *${prefijo}trabajar*`
                    }, { quoted: msg });
                }

                user.dinero -= negocio.costo;
                user.negocios.push({ id: negocio.id, comprado: Date.now() });
                saveDB(db);

                let texto = `👋 ¡Hola @${num}! ✨

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `           ✅  *COMPRADO*  ✅
`;
                texto += `        · · ·  𝒩𝐸𝒢𝒪𝒞𝐼𝒪  · · ·

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `  🏢  *${negocio.nombre}* adquirido

`;
                texto += `  💵  Costo    ▸ ${formatMoney(negocio.costo)}
`;
                texto += `  💰  Renta    ▸ ${formatMoney(negocio.renta)}/h
`;
                texto += `  💵  Dinero   ▸ ${formatMoney(user.dinero)}

`;
                texto += `  💡  Usa *${prefijo}cobrar* para recaudar rentas

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;
                return await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });
            }

            // VENDER
            if (accion === 'vender' || accion === 'sell') {
                const negId = args[1]?.toLowerCase();
                const idx = user.negocios.findIndex(n => n.id === negId);
                const negocio = NEGOCIOS_BASE.find(n => n.id === negId);

                if (idx === -1 || !negocio) {
                    return await sock.sendMessage(jid, {
                        text: `❌ *No tienes ese negocio*

💡 Usa *${prefijo}negocio* para ver los tuyos.`
                    }, { quoted: msg });
                }

                const reembolso = Math.floor(negocio.costo * 0.5);
                user.dinero += reembolso;
                user.negocios.splice(idx, 1);
                saveDB(db);

                let texto = `👋 ¡Hola @${num}! ✨

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `           💰  *VENDIDO*  💰
`;
                texto += `        · · ·  𝑅𝐸𝐸𝑀𝐵𝒪𝐿𝒮𝒪  · · ·

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `  🏢  *${negocio.nombre}* vendido

`;
                texto += `  💰  Reembolso ▸ ${formatMoney(reembolso)}
`;
                texto += `  💵  Dinero     ▸ ${formatMoney(user.dinero)}

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;
                return await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });
            }

            return await sock.sendMessage(jid, {
                text: `❌ *Acción no válida*

> Usa: comprar, vender

💡 *${prefijo}negocio comprar tiendita*`
            }, { quoted: msg });

        } catch (error) {
            console.error('[NEGOCIO] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
