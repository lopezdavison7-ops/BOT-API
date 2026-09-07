// commands/economy/baltop.js — vFINAL2: mención limpia + guardado de nombres
import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'economia.json');

function cargarDB() {
    try {
        if (!fs.existsSync(RUTA_DB)) return {};
        const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
        return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
        console.error('[BALTOP] Error leyendo economia.json:', e);
        return {};
    }
}
function guardarDB(db) {
    fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2));
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
const fmt = n => '$' + n.toLocaleString('en-US');

// Mención LIMPIA: o el PN real resuelto por Baileys, o el @lid puro. NADA de JIDs inventados.
async function datosMencion(sock, jid) {
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { token: '@' + pj.split('@')[0], jids: [pj] };
            }
        }
    } catch (e) { /* sin mapeo local, usamos el lid puro */ }
    return { token: '@' + jid.split('@')[0], jids: [jid] };
}

export default {
    nombre: 'baltop',
    categoria: 'Economy',
    alias: ['topbanco', 'banktop', 'topbank'],
    descripcion: 'Ranking de banco con mención real',
    uso: '.baltop',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const usuarios = cargarDB();

            // Guarda tu nombre (pushName) en la DB para futuras vistas bonitas
            const callerId = msg.key.participant || msg.key.remoteJid;
            if (usuarios[callerId] && msg.pushName && usuarios[callerId].nombre !== msg.pushName) {
                usuarios[callerId].nombre = msg.pushName;
                try { guardarDB(usuarios); } catch (e) {}
            }

            const top = Object.entries(usuarios)
                .filter(([jid, u]) => num(u.banco) > 0)
                .sort((a, b) => num(b[1].banco) - num(a[1].banco))
                .slice(0, 10);

            if (!top.length) {
                return await responder.texto(
                    '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n┃\n┃ 👑 Aún no hay nadie con dinero\n┃ 🏦 en el banco. ¡Sé el primero!\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const medallas = ['👑', '', ''];
            const menciones = [];
            let txt = '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n\n┃  𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐁𝐀𝐍𝐂𝐎\n┃\n';

            for (let i = 0; i < top.length; i++) {
                const [jid, u] = top[i];
                const m = await datosMencion(sock, jid);
                m.jids.forEach(j => { if (!menciones.includes(j)) menciones.push(j); });

                // Si prefieres nombre guardado en vez de mención, usa esta línea:
                // txt += '┃ ' + (medallas[i] || (i + 1) + '.') + ' *' + (u.nombre || m.token) + '*\n';
                txt += '┃ ' + (medallas[i] || (i + 1) + '.') + ' ' + m.token + '\n';
                txt += '┃    🏦 Banco › *' + fmt(num(u.banco)) + '*\n';
                txt += '┃    💵 En mano › *' + fmt(num(u.dinero)) + '*\n';
                txt += '┃\n';
            }

            txt += '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(msg.key.remoteJid, { text: txt, mentions: menciones }, { quoted: msg });
        } catch (error) {
            console.error('[BALTOP] Error:', error);
            await responder.texto('❌ Error al leer el ranking del banco.');
        }
    }
};