import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'economia.json');

const OWNERS_PRINCIPALES = [
    '50578391933',
    '50577455383'
];

function cargarDB() {
    try {
        if (!fs.existsSync(RUTA_DB)) return {};
        const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf8'));
        return (data && typeof data === 'object' && !Array.isArray(data)) ? data : {};
    } catch (e) {
        console.error('[ADDCOINS] Error leyendo economia.json:', e);
        return {};
    }
}

function guardarDB(db) {
    try {
        fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });
        fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('[ADDCOINS] Error guardando:', e);
    }
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

const fmt = n => '$' + n.toLocaleString('en-US');

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

function comandoInvocado(msg) {
    const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || '';
    const limpio = texto.trim().replace(/^\.+\s*/, '');
    return (limpio.split(/\s+/)[0] || '').toLowerCase();
}

async function esOwner(sock, msg) {
    const candidatos = [
        msg.key.participant,
        msg.key.senderPn,
        msg.key.participantAlt,
        msg.key.sender,
        msg.key.remoteJid
    ].filter(Boolean);

    for (const cand of candidatos) {
        if (OWNERS_PRINCIPALES.includes(numeroVisible(cand))) return true;
    }

    try {
        for (const cand of candidatos) {
            if (String(cand).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(cand);
                if (pn && OWNERS_PRINCIPALES.includes(numeroVisible(pn))) return true;
            }
        }
    } catch (e) {}

    return false;
}

export default {
    nombre: 'addcoins',
    categoria: 'Economy',
    alias: ['darcoins', 'sumarcoins', 'quitarcoins', 'restarcoins', 'removecoins'],
    owner: true,
    descripcion: 'Agrega o quita coins (dinero + banco) a un usuario',
    uso: '.addcoins 5000 @user',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        if (!(await esOwner(sock, msg))) {
            return await responder.texto(
                '╭━━〔  𝐀𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Este comando es exclusivo\n' +
                '┃    para el *Owner principal*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const invocado = comandoInvocado(msg);
        const esQuitar = ['quitarcoins', 'restarcoins', 'removecoins'].includes(invocado);

        const tokens = String(argumento || '').trim().split(/\s+/).filter(Boolean);

        let monto = null;
        for (const t of tokens) {
            if (/^[+-]?\d+(\.\d+)?$/.test(t)) {
                monto = parseFloat(t);
                break;
            }
        }

        if (monto === null) {
            return await responder.texto(
                '╭━━〔  𝐀𝐃𝐃 𝐂𝐎𝐈𝐍𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 📋 Uso correcto:\n' +
                '┃ ➪ .addcoins 5000 @user\n' +
                '┃ ➪ .addcoins @user 5000\n' +
                '┃ ➪ .addcoins -500 @user (quitar)\n' +
                '┃ ➪ .quitarcoins 500 @user\n' +
                '┃ ➪ .addcoins 5000 (a ti mismo)\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (esQuitar) monto = -Math.abs(monto);

        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        let target = ctx?.mentionedJid?.[0] || ctx?.participant || null;

        if (!target) {
            for (const t of tokens) {
                if (t.includes('@') && t.includes('.')) {
                    target = t;
                    break;
                }
            }
        }

        if (!target) {
            target = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;
        }

        if (String(target).endsWith('@g.us')) {
            return await responder.texto('❌ No puedes dar coins a un grupo.');
        }

        const db = cargarDB();
        if (!db[target]) db[target] = { dinero: 0, banco: 0, nombre: '' };

        const dineroAntes = num(db[target].dinero);
        const bancoAntes = num(db[target].banco);
        const totalAntes = dineroAntes + bancoAntes;

        let dinero = dineroAntes;
        let banco = bancoAntes;
        const cambio = Math.round(monto);

        if (cambio >= 0) {
            dinero += cambio;
        } else {
            let porQuitar = -cambio;
            const deDinero = Math.min(dinero, porQuitar);
            dinero -= deDinero;
            porQuitar -= deDinero;
            if (porQuitar > 0) {
                banco = Math.max(0, banco - porQuitar);
            }
        }

        db[target].dinero = dinero;
        db[target].banco = banco;
        guardarDB(db);

        const totalDespues = dinero + banco;
        const numTarget = numeroVisible(target);
        const accion = cambio >= 0 ? '➕ Agregaste' : '➖ Quitaste';

        await sock.sendMessage(jid, {
            text:
                '╭━━〔  𝐂𝐈𝐍𝐒 𝐀𝐂𝐓𝐔𝐀𝐋𝐈𝐙𝐀𝐃𝐎𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ ' + accion + ' › *' + fmt(Math.abs(cambio)) + '*\n' +
                '┃  Usuario › @' + numTarget + '\n' +
                '┃\n' +
                '┃ 👛 Dinero › ' + fmt(dineroAntes) + ' → *' + fmt(dinero) + '*\n' +
                '┃ 🏦 Banco › ' + fmt(bancoAntes) + ' → *' + fmt(banco) + '*\n' +
                '┃ 💎 Total › ' + fmt(totalAntes) + ' → *' + fmt(totalDespues) + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: [target]
        }, { quoted: msg });

        console.log(`[ADDCOINS] ${numeroVisible(msg.key.participant || msg.key.remoteJid)} → ${cambio >= 0 ? '+' : ''}${cambio} a @${numTarget} (total: ${totalDespues})`);
    }
};