import fs from 'fs';
import path from 'path';

const RUTA_DB = path.join(process.cwd(), 'database', 'bienvenida.json');

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
        console.error('[SETWELCOME] Error leyendo DB:', e);
        return {};
    }
}

function guardarDB(db) {
    try {
        fs.mkdirSync(path.dirname(RUTA_DB), { recursive: true });
        fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('[SETWELCOME] Error guardando:', e);
    }
}

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
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

async function esAdmin(sock, jid, sender) {
    try {
        const meta = await sock.groupMetadata(jid);
        const participantes = meta.participants || [];
        const senderNum = numeroVisible(sender);

        for (const p of participantes) {
            const pNum = numeroVisible(p.id);
            if (pNum === senderNum) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }

        for (const p of participantes) {
            if (String(p.id).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                try {
                    const pn = await sock.signalRepository.lidMapper.getPNForLid(p.id);
                    if (pn && numeroVisible(pn) === senderNum) {
                        return p.admin === 'admin' || p.admin === 'superadmin';
                    }
                } catch (e) {}
            }
        }
    } catch (e) {
        console.error('[SETWELCOME] Error verificando admin:', e);
    }
    return false;
}

export default {
    nombre: 'setwelcome',
    categoria: 'Grupos',
    alias: ['setwelcome', 'configwelcome', 'bienvenida'],
    descripcion: 'Configura el mensaje de bienvenida del grupo (admins y owner)',
    uso: '.setwelcome <mensaje> | .setwelcome on | .setwelcome off',

    ejecutar: async ({ sock, msg, argumento, responder, jid, isGroup }) => {
        if (!isGroup) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Este comando solo funciona\n' +
                '┃    en grupos\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid;
        const owner = await esOwner(sock, msg);
        const admin = owner ? true : await esAdmin(sock, jid, sender);

        if (!admin) {
            return await responder.texto(
                '╭━━〔  𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Solo *admins del grupo*\n' +
                '┃    o el *Owner* pueden usar\n' +
                '┃    este comando\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const texto = String(argumento || '').trim();
        const db = cargarDB();
        if (!db[jid]) db[jid] = { activa: true, mensaje: null };

        if (!texto) {
            const estado = db[jid].activa ? ' Activada' : ' Desactivada';
            const mensajeActual = db[jid].mensaje || '(mensaje por defecto)';

            return await responder.texto(
                '╭━━〔 👋 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 📌 Estado › ' + estado + '\n' +
                '┃\n' +
                '┃ 📝 Mensaje actual:\n' +
                '┃ ' + mensajeActual + '\n' +
                '┃\n' +
                '┣━━〔 📋 𝐒𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ➪ .setwelcome <mensaje>\n' +
                '┃ ➪ .setwelcome on\n' +
                '┃ ➪ .setwelcome off\n' +
                '┃\n' +
                '┣━━〔 🏷️ 𝐕𝐀𝐑𝐈𝐀𝐁𝐋𝐄𝐒 〕━━⬣\n' +
                '┃\n' +
                '┃ @user → menciona al nuevo\n' +
                '┃ @name → nombre del nuevo\n' +
                '┃ @group → nombre del grupo\n' +
                '┃ @members → total miembros\n' +
                '┃ @date → fecha de hoy\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.toLowerCase() === 'on' || texto.toLowerCase() === 'activar') {
            db[jid].activa = true;
            guardarDB(db);
            return await responder.texto(
                '╭━━〔 ✅ 𝐖𝐄𝐂𝐎𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 🟢 Bienvenida *ACTIVADA*\n' +
                '┃    en este grupo\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.toLowerCase() === 'off' || texto.toLowerCase() === 'desactivar') {
            db[jid].activa = false;
            guardarDB(db);
            return await responder.texto(
                '╭━━〔 ✅ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔴 Bienvenida *DESACTIVADA*\n' +
                '┃    en este grupo\n' +
                '┃\n' +
                '╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.toLowerCase() === 'reset' || texto.toLowerCase() === 'default') {
            db[jid].mensaje = null;
            guardarDB(db);
            return await responder.texto(
                '╭━━〔 ✅ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 〕━━⬣\n' +
                '┃\n' +
                '┃ 🔄 Mensaje restaurado al\n' +
                '┃    *por defecto*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (texto.length > 1000) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐔𝐘 𝐋𝐀𝐑𝐆𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Máximo 1000 caracteres\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        db[jid].mensaje = texto;
        db[jid].activa = true;
        guardarDB(db);

        await responder.texto(
            '╭━━〔 ✅ 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 〕━━⬣\n' +
            '┃\n' +
            '┃ 💾 Mensaje guardado:\n' +
            '┃\n' +
            '┃ ' + texto + '\n' +
            '┃\n' +
            '┃  Bienvenida activada\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );

        console.log(`[SETWELCOME] Grupo ${jid} configurado por ${numeroVisible(sender)}`);
    }
};