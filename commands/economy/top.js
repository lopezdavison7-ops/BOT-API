// commands/economy/baltop.js
// 💎 TOP BANCO: ranking por dinero depositado (no por dinero en mano)
import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'users.json');

function cargarUsuarios() {
    try {
        if (!fs.existsSync(RUTA_DB)) return {};
        const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
        return (data && typeof data === 'object') ? data : {};
    } catch (e) {
        console.error('[BALTOP] Error leyendo users.json:', e);
        return {};
    }
}

// Lee el banco aceptando varios nombres de campo por si tu DB usa otro
function bancoDe(u) {
    if (!u || typeof u !== 'object') return 0;
    const v = u.banco ?? u.bank ?? u.banca ?? u.balanceBanco ?? 0;
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
}
function manoDe(u) {
    if (!u || typeof u !== 'object') return 0;
    const v = u.dinero ?? u.money ?? u.cash ?? 0;
    return (typeof v === 'number' && isFinite(v)) ? v : 0;
}
function nombreDe(u, jid) {
    return u.nombre || u.name || u.username || jid.split('@')[0];
}
const fmt = n => '$' + n.toLocaleString('en-US');

export default {
    nombre: 'baltop',
    categoria: 'Economy',
    alias: ['topbanco', 'banktop', 'topbank'],
    descripcion: 'Ranking de usuarios con más dinero en el banco',
    uso: '.baltop',
    ejecutar: async ({ responder }) => {
        try {
            const usuarios = cargarUsuarios();
            const lista = [];
            // Soporta DB como objeto {jid: user} o como array [{jid, ...}]
            if (Array.isArray(usuarios)) {
                usuarios.forEach((u, i) => lista.push({ jid: u.jid || u.id || String(i), u }));
            } else {
                Object.entries(usuarios).forEach(([jid, u]) => lista.push({ jid, u }));
            }

            const top = lista
                .filter(x => bancoDe(x.u) > 0)          // ← ANTES filtraba por dinero en mano
                .sort((a, b) => bancoDe(b.u) - bancoDe(a.u)) // ← ANTES ordenaba por dinero en mano
                .slice(0, 10);

            if (!top.length) {
                return await responder.texto(
                    '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 👑 Aún no hay nadie con dinero\n' +
                    '┃ 🏦 en el banco. ¡Sé el primero!\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const medallas = ['👑', '', ''];
            let txt = '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n\n┃  𝐑𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐁𝐀𝐍𝐂𝐎\n┃\n';
            top.forEach((x, i) => {
                txt += '┃ ' + (medallas[i] || (i + 1) + '.') + ' *' + nombreDe(x.u, x.jid) + '*\n';
                txt += '┃    🏦 Banco › *' + fmt(bancoDe(x.u)) + '*\n';
                txt += '┃    💵 En mano › *' + fmt(manoDe(x.u)) + '*\n';
                txt += '┃\n';
            });
            txt += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await responder.texto(txt);
        } catch (error) {
            console.error('[BALTOP] Error:', error);
            await responder.texto('❌ Error al leer el ranking del banco.');
        }
    }
};