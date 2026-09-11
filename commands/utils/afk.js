// commands/utils/afk.js
// ============================================================
// COMANDO: AFK (sistema autónomo)
// ============================================================
import fs from 'fs';
import path from 'path';

const RUTA_AFK = path.join(process.cwd(), 'database', 'afk.json');

function leer() {
    try { return JSON.parse(fs.readFileSync(RUTA_AFK, 'utf8')); } catch (e) { return {}; }
}
function guardar(db) {
    fs.mkdirSync(path.dirname(RUTA_AFK), { recursive: true });
    fs.writeFileSync(RUTA_AFK, JSON.stringify(db, null, 2), 'utf8');
}
function jidDe(msg) {
    return msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;
}
function fmtTiempo(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + sec + 's';
    return sec + 's';
}

export default {
    nombre: 'afk',
    categoria: 'Utils',
    alias: ['ausente', 'away', 'afkoff'],
    descripcion: 'Marca tu estado AFK con razón y aviso automático',
    uso: '.afk [razón] · .afk off',
    ejecutar: async ({ msg, argumento, responder }) => {
        const sender = jidDe(msg);
        const db = leer();
        const accion = String(argumento || '').trim();

        // Quitar AFK manual
        if (/^(off|salir|volver)$/i.test(accion)) {
            if (!db[sender]) return await responder.texto('⚠️ No estabas AFK.');
            const data = db[sender];
            delete db[sender];
            guardar(db);
            return await responder.texto(
                '╭━━〔 🔙 𝐀𝐅𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ AFK desactivado\n' +
                '┃ ⏱️ Duraste: *' + fmtTiempo(Date.now() - data.tiempo) + '*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Ya estaba AFK
        if (db[sender]) {
            return await responder.texto(
                '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ⚠️ Ya estás AFK:\n' +
                '┃ 📝 ' + db[sender].razon + '\n' +
                '┃\n' +
                '┃ Usa .afk off para volver\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // Marcar AFK
        db[sender] = {
            razon: accion || 'Sin razón',
            tiempo: Date.now(),
            nombre: msg.pushName || ''
        };
        guardar(db);

        return await responder.texto(
            '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
            '┃\n' +
            '┃ 💤 @' + sender.split('@')[0] + ' ahora está AFK\n' +
            '┃ 📝 Razón: ' + db[sender].razon + '\n' +
            '┃\n' +
            '┃ Se avisará a quien te mencione,\n' +
            '┃ te responda o escriba tu nombre\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
        );
    }
};