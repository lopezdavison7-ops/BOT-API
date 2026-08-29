// ============================================================
// COMANDO CREDITO (.credito)
// ============================================================

import { getDB, saveDB, getUser, obtenerMencionesFijas, formatMoney, getPrestamosDisponibles } from './utilsEconomia.js';

export default {
    nombre: 'credito',
    categoria: 'Economía',
    alias: ['prestamo', 'loan'],

    async ejecutar({ sock, msg, args, prefijo }) {
        const jid = msg?.key?.remoteJid;
        const autorJid = msg?.key?.participant || msg?.key?.remoteJid;
        const num = autorJid.split('@')[0];

        try {
            const db = getDB();
            const user = getUser(db, autorJid);
            const { jids: menciones, texto: txtMenciones } = await obtenerMencionesFijas();
            const mencionesTotal = [...new Set([autorJid, ...menciones])];

            if (user.deuda > 0) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Ya tienes una deuda activa*

> Debes pagar tu préstamo actual antes de solicitar otro.

💡 Usa *${prefijo}deuda* para ver detalles.`
                }, { quoted: msg });
            }

            const tipo = args[0]?.toLowerCase();
            const prestamos = getPrestamosDisponibles(user.historialCrediticio);

            if (!tipo) {
                let texto = `👋 ¡Hola @${num}! ✨

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `           ⛁  *CRÉDITOS*  ⛁
`;
                texto += `        · · ·  𝒫𝑅É𝒮𝒯𝒜𝑀𝒪𝒮  · · ·

`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
                texto += `  📊  Tu crédito: ${user.historialCrediticio}/100

`;
                for (const p of prestamos) {
                    const total = Math.floor(p.monto * (1 + p.interes));
                    const cuota = Math.floor(total / p.cuotas);
                    texto += `  ◇ *${p.nombre}* ▸ ${formatMoney(p.monto)}
`;
                    texto += `  > Cuotas: ${p.cuotas} de ${formatMoney(cuota)}
`;
                    texto += `  > Total a pagar: ${formatMoney(total)}
`;
                    texto += `  > Usa: *${prefijo}credito ${p.nombre.toLowerCase()}*

`;
                }
                texto += `  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
                texto += `  💡  Escribe *${prefijo}credito <tipo>*
`;
                texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;
                return await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });
            }

            const seleccion = prestamos.find(p => p.nombre.toLowerCase() === tipo);
            if (!seleccion) {
                return await sock.sendMessage(jid, {
                    text: `❌ *Tipo de crédito no válido*

> Opciones: pequeño, mediano, grande

💡 Usa *${prefijo}credito* para ver disponibles.`
                }, { quoted: msg });
            }

            const total = Math.floor(seleccion.monto * (1 + seleccion.interes));
            const cuota = Math.floor(total / seleccion.cuotas);

            user.dinero += seleccion.monto;
            user.deuda = total;
            user.cuotasPendientes = seleccion.cuotas;
            user.cuotaMonto = cuota;
            user.totalPrestamos += 1;

            saveDB(db);

            let texto = `👋 ¡Hola @${num}! ✨

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `           ✅  *APROBADO*  ✅
`;
            texto += `        · · ·  𝒫𝑅É𝒮𝒯𝒜𝑀𝒪  · · ·

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰

`;
            texto += `  💵  Monto recibido ▸ ${formatMoney(seleccion.monto)}
`;
            texto += `  📉  Deuda total    ▸ ${formatMoney(total)}
`;
            texto += `  📋  Cuotas         ▸ ${seleccion.cuotas}
`;
            texto += `  💸  Cuota mensual  ▸ ${formatMoney(cuota)}

`;
            texto += `  💡  Usa *${prefijo}deuda* para ver progreso
`;
            texto += `  💡  Usa *${prefijo}pagar* para abonar

`;
            texto += `▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰`;

            await sock.sendMessage(jid, { text: texto, mentions: mencionesTotal }, { quoted: msg });

        } catch (error) {
            console.error('[CREDITO] Error:', error);
            await sock.sendMessage(jid, { text: `❌ Error: ${error.message}` }, { quoted: msg });
        }
    }
};
