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

function num(v) { 
    const n = Number(v); 
    return Number.isFinite(n) ? n : 0; 
}

const fmt = n => '$' + n.toLocaleString('en-US');

async function obtenerMencion(sock, jid) {
    // Intentar resolver LID a número de teléfono
    let jidReal = jid;
    
    if (jid.endsWith('@lid')) {
        try {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
                if (pn) {
                    jidReal = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                }
            }
        } catch (e) {
            console.log('[BALTOP] No se pudo resolver LID:', jid);
        }
    }
    
    // Extraer número limpio
    const numero = jidReal.split('@')[0].replace(/\D/g, '');
    
    return {
        token: '@' + numero,
        jid: jidReal
    };
}

export default {
    nombre: 'baltop',
    categoria: 'Economy',
    alias: ['topbanco', 'banktop', 'topbank', 'tops'],
    descripcion: 'Ranking de TOTAL de coins con menciones reales',
    uso: '.baltop',
    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const usuarios = cargarDB();

            const callerId = msg.key.participant || msg.key.remoteJid;
            if (usuarios[callerId] && msg.pushName && usuarios[callerId].nombre !== msg.pushName) {
                usuarios[callerId].nombre = msg.pushName;
                try { guardarDB(usuarios); } catch (e) {}
            }

            const top = Object.entries(usuarios)
                .filter(([jid, u]) => (num(u.banco) + num(u.dinero)) > 0)
                .sort((a, b) => (num(b[1].banco) + num(b[1].dinero)) - (num(a[1].banco) + num(a[1].dinero)))
                .slice(0, 10);

            if (!top.length) {
                return await responder.texto(
                    '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n┃\n┃ 👑 Aún no hay nadie con dinero\n┃ 🏦 en el banco. ¡Sé el primero!\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const medallas = ['👑', '🥈', '🥉'];
            const menciones = [];
            let txt = '╭━━〔 💎 𝐓𝐎𝐏 𝐁𝐀𝐍𝐂𝐎 💎 〕━━⬣\n\n┃  𝐑𝐀𝐍𝐊𝐈𝐍𝐆 𝐃𝐄 𝐁𝐀𝐍𝐂𝐎\n┃\n';

            for (let i = 0; i < top.length; i++) {
                const [jid, u] = top[i];
                const mencion = await obtenerMencion(sock, jid);
                
                // Agregar JID al array de menciones
                if (!menciones.includes(mencion.jid)) {
                    menciones.push(mencion.jid);
                }

                const total = num(u.banco) + num(u.dinero);
                const posicion = medallas[i] || `${i + 1}.`;

                txt += '┃ ' + posicion + ' ' + mencion.token + '\n';
                txt += '┃    💰 Total › *' + fmt(total) + '*\n';
                txt += '┃\n';
            }

            txt += '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

            await sock.sendMessage(msg.key.remoteJid, { 
                text: txt, 
                mentions: menciones 
            }, { quoted: msg });
        } catch (error) {
            console.error('[BALTOP] Error:', error);
            await responder.texto('❌ Error al leer el ranking del banco.');
        }
    }
};