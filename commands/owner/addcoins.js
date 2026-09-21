// commands/owner/addcoins.js — 💰 Agregar/quitar coins (SOLO OWNER)
import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'economia.json');
const RUTA_OWNERS = path.join(process.cwd(), 'database', 'owner.json');

// ---------- CARGAR / GUARDAR ECONOMÍA ----------
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
    fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });
    fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2));
}
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
const fmt = n => '$' + Math.abs(n).toLocaleString('en-US');

// ---------- FILTRO DE OWNER (multi-fuente) ----------
function esOwner(fromMe, senderJid) {
    // 1) Si el mensaje viene del propio número del bot
    if (fromMe) return true;

    const senderNum = senderJid.split('@')[0].replace(/\D/g, '');
    const owners = new Set();

    // 2) Variable de entorno OWNER (acepta "504xxx,504yyy")
    (process.env.OWNER || '').split(',').forEach(n => {
        const c = n.replace(/\D/g, '');
        if (c) owners.add(c);
    });

    // 3) database/owner.json (array, objeto o { owners: [] })
    try {
        const raw = JSON.parse(fs.readFileSync(RUTA_OWNERS, 'utf8'));
        const lista = Array.isArray(raw) ? raw : (raw.owners || raw.owner || Object.keys(raw));
        lista.forEach(o => {
            const s = typeof o === 'string' ? o : (o.jid || o.numero || o.number || '');
            const c = String(s).replace(/\D/g, '');
            if (c) owners.add(c);
        });
    } catch (e) { /* sin archivo de owners */ }

    return owners.has(senderNum);
}

// ---------- MENCION LIMPIA ----------
async function datosMencion(sock, jid) {
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { token: '@' + pj.split('@')[0], jids: [pj] };
            }
        }
    } catch (e) {}
    return { token: '@' + jid.split('@')[0], jids: [jid] };
}

export default {
    nombre: 'addcoins',
    categoria: 'owner',
    alias: ['addc', 'sumcoins', 'darcoins'],
    descripcion: 'Agrega o quita coins a un usuario (SOLO OWNER)',
    uso: '.addcoins <cantidad> @user | .addcoins @user <cantidad> | .addcoins -500 @user',
    ejecutar: async ({ sock, msg, argumento, responder, fromMe }) => {
        const senderJid = msg.key.participant || msg.key.remoteJid;

        // ---------- FILTRO: SOLO OWNER ----------
        if (!esOwner(fromMe, senderJid)) {
            return await responder.texto(
                '╭━━〔 🛡️ 𝐑𝐄𝐒𝐓𝐑𝐈𝐍𝐆𝐈𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃  Este comando es *SOLO OWNER*.\n' +
                '┃ 🚫 Tu intento quedó registrado.\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }

        // ---------- PARSEAR ARGUMENTOS ----------
        const texto = (argumento || '').trim();
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        let target = ctx?.mentionedJid?.[0] || ctx?.participant || null;

        const nums = texto.match(/-?\d+/g) || [];
        let cantidad = null;

        if (target) {
            // .addcoins 5000 @user  |  .addcoins @user 5000
            cantidad = nums.length ? parseInt(nums[0]) : null;
        } else {
            // .addcoins 5000 50499999999  |  .addcoins 50499999999 5000
            const phone = nums.find(n => n.replace('-', '').length >= 7);
            if (phone) {
                target = phone.replace(/\D/g, '') + '@s.whatsapp.net';
                const resto = nums.filter(n => n !== phone);
                cantidad = resto.length ? parseInt(resto[0]) : null;
            } else if (nums.length) {
                // .addcoins 5000 → se lo da a sí mismo
                target = senderJid;
                cantidad = parseInt(nums[0]);
            }
        }

        if (!target || cantidad === null || isNaN(cantidad) || cantidad === 0) {
            return await responder.texto(
                '╭━━〔 💰 𝐀𝐃 𝐂𝐈𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 📋 Uso correcto:\n' +
                '┃ ➪ .addcoins 5000 @user\n' +
                '┃ ➪ .addcoins @user 5000\n' +
                '┃ ➪ .addcoins -500 @user (quitar)\n' +
                '┃ ➪ .addcoins 5000 (a ti mismo)\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐈  〕━━'
            );
        }

        // ---------- APLICAR CAMBIO ----------
        try {
            const db = cargarDB();
            if (!db[target] || typeof db[target] !== 'object') {
                db[target] = { dinero: 0, banco: 0 };
            }
            const antes = num(db[target].dinero);
            db[target].dinero = antes + cantidad;
            const despues = num(db[target].dinero);
            guardarDB(db);

            const t = await datosMencion(sock, target);
            const o = await datosMencion(sock, senderJid);
            const positivo = cantidad > 0;

            const txt =
                '╭━━〔 💰 𝐀𝐃𝐃 𝐂𝐎𝐈𝐍𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ 👤 Usuario: ' + t.token + '\n' +
                '┃ ' + (positivo ? '➕ Agregado' : '➖ Quitado') + ': *' + fmt(cantidad) + '*\n' +
                '┃  Saldo anterior: *' + fmt(antes) + '*\n' +
                '┃ 💰 Nuevo saldo: *' + fmt(despues) + '*\n' +
                '┃\n' +
                '┃ 🛡️ Ejecutado por: ' + o.token + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣';

            await sock.sendMessage(msg.key.remoteJid, { text: txt, mentions: [...t.jids, ...o.jids] }, { quoted: msg });

            console.log('[ADDCOINS] ' + senderJid + ' modificó ' + target + ': ' + (positivo ? '+' : '') + cantidad);
        } catch (e) {
            console.error('[ADDCOINS] Error:', e);
            await responder.texto('❌ Error al modificar coins: ' + e.message);
        }
    }
};