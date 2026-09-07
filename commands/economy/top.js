// commands/economy/baltop.js — vFINAL: ranking con mención real (@lid resuelto)
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

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
const fmt = n => '$' + n.toLocaleString('en-US');

// Convierte un jid (incluso @lid) en mención que WhatsApp sí renderiza
async function datosMencion(sock, jid) {
    const jids = [jid];
    let pn = null;
    try {
        // 1) Intento pro: resolver el @lid al número real (@s.whatsapp.net)
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn && !pn.includes('@')) pn = pn + '@s.whatsapp.net';
            if (pn) jids.push(pn);
        }
    } catch (e) { pn = null; }
    // 2) Respaldo: mismo número con dominio clásico (el fix que ya usas en el menú)
    if (jid.endsWith('@lid')) jids.push(jid.replace('@lid', '@s.whatsapp.net'));
    const digitos = (pn || jid).split('@')[0];
    return { token: '@' + digitos, jids };
}

export default {
    nombre: 'baltop',
    categoria: 'Economy',
    alias: ['topbanco', 'banktop', 'topbank'],
    descripcion: 'Ranking de banco con menciones reales',
    uso: '.baltop',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const usuarios = cargarDB();

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

                txt += '┃ ' + (medallas[i] || (i + 1) + '.') + ' ' + m.token + '\n';
                txt += '┃     Banco › *' + fmt(num(u.banco)) + '*\n';
                txt += '┃    💵 En mano › *' + fmt(num(u.dinero)) + '*\n';
                txt += '┃\n';
            }

            txt += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            // La clave: el array "mentions" es lo que convierte @número en nombre + ping
            await sock.sendMessage(msg.key.remoteJid, { text: txt, mentions: menciones }, { quoted: msg });
        } catch (error) {
            console.error('[BALTOP] Error:', error);
            await responder.texto('❌ Error al leer el ranking del banco.');
        }
    }
};