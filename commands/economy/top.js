// commands/economy/baltop.js — v2 a prueba de balas
import fs from 'fs';
import path from 'path';

const RUTAS = [
    'database/users.json',
    'database/usuarios.json',
    'database/economia.json',
    'database/economy.json',
    'database/db.json',
    'database/bank.json',
    'database/banco.json'
];

function leerJson(ruta) {
    try {
        const abs = path.join(process.cwd(), ruta);
        if (!fs.existsSync(abs)) return null;
        return JSON.parse(fs.readFileSync(abs, 'utf8'));
    } catch (e) { return null; }
}

function desempacar(data) {
    if (!data || typeof data !== 'object') return {};
    if (Array.isArray(data)) return data;
    const claves = ['usuarios', 'users', 'data', 'economia', 'economy'];
    for (const k of claves) {
        if (data[k] && typeof data[k] === 'object') return data[k];
    }
    return data;
}

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

const CLAVES_BANCO = ['banco', 'bank', 'banca', 'balanceBanco', 'bankBalance', 'enBanco'];
const CLAVES_MANO = ['dinero', 'money', 'cash', 'balance', 'enMano'];

function buscarCampo(u, claves) {
    if (!u || typeof u !== 'object') return 0;
    for (const k of claves) if (k in u) return num(u[k]);
    // Un nivel anidado: u.economia.banco, u.datos.banco, etc.
    for (const sub of Object.values(u)) {
        if (sub && typeof sub === 'object' && !Array.isArray(sub)) {
            for (const k of claves) if (k in sub) return num(sub[k]);
        }
    }
    return 0;
}
const bancoDe = u => buscarCampo(u, CLAVES_BANCO);
const manoDe = u => buscarCampo(u, CLAVES_MANO);
const nombreDe = (u, jid) => (u && (u.nombre || u.name || u.username || u.nick)) || jid.split('@')[0];
const fmt = n => '$' + n.toLocaleString('en-US');

function cargarDB() {
    for (const ruta of RUTAS) {
        const data = leerJson(ruta);
        if (data !== null) return { ruta, data: desempacar(data) };
    }
    return { ruta: null, data: {} };
}

function aLista(data) {
    const lista = [];
    if (Array.isArray(data)) {
        data.forEach((u, i) => lista.push({ jid: (u && (u.jid || u.id)) || String(i), u: u || {} }));
    } else if (data && typeof data === 'object') {
        Object.entries(data).forEach(([jid, u]) => lista.push({ jid, u: u || {} }));
    }
    return lista;
}

export default {
    nombre: 'baltop',
    categoria: 'Economy',
    alias: ['topbanco', 'banktop', 'topbank'],
    descripcion: 'Ranking de banco + modo debug (.baltop debug)',
    uso: '.baltop',
    ejecutar: async ({ argumento, responder }) => {
        try {
            const { ruta, data } = cargarDB();
            const lista = aLista(data);

            // ---------- MODO DEBUG ----------
            if ((argumento || '').toLowerCase().includes('debug')) {
                const existentes = RUTAS.filter(r => {
                    try { return fs.existsSync(path.join(process.cwd(), r)); } catch (e) { return false; }
                });
                const muestra = lista[0];
                let txt = '╭━━〔  𝐃𝐄𝐁𝐔𝐆 𝐁𝐀𝐋𝐓𝐎𝐏 〕━━⬣\n┃\n';
                txt += '┃ 📂 Rutas que existen:\n┃ ' + (existentes.join(', ') || 'NINGUNA') + '\n┃\n';
                txt += '┃  Ruta usada: ' + (ruta || 'NINGUNA') + '\n';
                txt += '┃ 👥 Usuarios leídos: ' + lista.length + '\n┃\n';
                if (muestra) {
                    txt += '┃  JID muestra: ' + muestra.jid + '\n';
                    txt += '┃  Claves: ' + Object.keys(muestra.u).join(', ').slice(0, 200) + '\n';
                    txt += '┃ 🏦 bancoDe(): ' + bancoDe(muestra.u) + '\n';
                    txt += '┃ 💵 manoDe(): ' + manoDe(muestra.u) + '\n';
                } else {
                    txt += '┃ ⚠️ La DB está vacía o no se pudo leer\n';
                }
                txt += '┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
                return await responder.texto(txt);
            }

            // ---------- TOP NORMAL ----------
            const top = lista
                .filter(x => bancoDe(x.u) > 0)
                .sort((a, b) => bancoDe(b.u) - bancoDe(a.u))
                .slice(0, 10);

            if (!top.length) {
                return await responder.texto(
                    '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n┃\n┃ 👑 Aún no hay nadie con dinero\n┃ 🏦 en el banco. ¡Sé el primero!\n┃\n┃ 🛠 (usa .baltop debug)\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const medallas = ['👑', '', ''];
            let txt = '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n\n┃  𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐁𝐀𝐍𝐂\n┃\n';
            top.forEach((x, i) => {
                txt += '┃ ' + (medallas[i] || (i + 1) + '.') + ' *' + nombreDe(x.u, x.jid) + '*\n';
                txt += '┃    🏦 Banco › *' + fmt(bancoDe(x.u)) + '*\n';
                txt += '┃    💵 En mano › *' + fmt(manoDe(x.u)) + '*\n┃\n';
            });
            txt += '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';
            await responder.texto(txt);
        } catch (error) {
            console.error('[BALTOP] Error:', error);
            await responder.texto('❌ Error al leer el ranking del banco.');
        }
    }
};