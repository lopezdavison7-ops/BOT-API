// commands/utils/afk.js
// ============================================================
// COMANDO: AFK + detector global (mención real o nombre, nunca lid)
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
function textoDe(msg) {
    return msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || '';
}
function fmtTiempo(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + sec + 's';
    return sec + 's';
}
function limpiarNombre(n) {
    return String(n || '').replace(/[*_~`┃╭╰⬣@\n\r]/g, '').trim().slice(0, 25);
}

// ============================================================
// ¿CÓMO MOSTRAR AL USUARIO? (mención real → nombre → número)
// ============================================================
async function quienEs(sock, jid, nombreGuardado) {
    // 1) Resolver @lid → número real: la mención renderiza el nombre + ping
    try {
        if (jid.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
            const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
            if (pn) {
                const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                return { texto: '@' + pj.split('@')[0], mentions: [pj] };
            }
        }
    } catch (e) { /* sin mapeo */ }
    // 2) Respaldo: el NOMBRE guardado en negrita (nada de lids feos)
    const nombre = limpiarNombre(nombreGuardado);
    if (nombre) return { texto: '*' + nombre + '*', mentions: [jid] };
    // 3) Último recurso
    return { texto: '@' + jid.split('@')[0], mentions: [jid] };
}

// ============================================================
// DETECTOR GLOBAL (handler.js lo llama en CADA mensaje)
// ============================================================
export async function verificarAFK({ sock, msg }) {
    try {
        const db = leer();
        if (!Object.keys(db).length) return;
        const sender = jidDe(msg);
        const texto = textoDe(msg).toLowerCase();
        const ahora = Date.now();

        // 1) Si el usuario AFK escribe → se le quita y se le avisa
        if (db[sender]) {
            const data = db[sender];
            delete db[sender];
            guardar(db);
            const yo = await quienEs(sock, sender, data.nombre || msg.pushName);
            await sock.sendMessage(msg.key.remoteJid, {
                text:
                    '╭━━〔 🔙 𝐀𝐅𝐊 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ✅ ' + yo.texto + ' ya volviste\n' +
                    '┃ ⏱️ Estuviste AFK: ' + fmtTiempo(ahora - data.tiempo) + '\n' +
                    '┃ 📝 Razón: ' + data.razon + '\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐈 ⚡ 〕━━⬣',
                mentions: yo.mentions
            }, { quoted: msg });
            return;
        }

        // 2) Si mencionan / responden / escriben el nombre de un AFK → aviso
        const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
        const mencionados = ctx.mentionedJid || [];
        const citado = ctx.participant || null;

        for (const [jid, data] of Object.entries(db)) {
            if (jid === sender) continue;
            let hit = mencionados.includes(jid) || citado === jid;
            if (!hit && data.nombre && data.nombre.length >= 3 && texto.includes(data.nombre.toLowerCase())) hit = true;
            if (hit) {
                const el = await quienEs(sock, jid, data.nombre);
                await sock.sendMessage(msg.key.remoteJid, {
                    text:
                        '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
                        '┃\n' +
                        '┃ 💤 ' + el.texto + ' está AFK\n' +
                        '┃ 📝 Razón: ' + data.razon + '\n' +
                        '┃ ⏱️ Desde hace: ' + fmtTiempo(ahora - data.tiempo) + '\n' +
                        '┃\n' +
                        '┃ Tranqui, le llegará tu mensaje 😼\n' +
                        '┃\n' +
                        '╰━━〔 ⚡ 𝐎-𝐏 ⚡ 〕━━⬣',
                    mentions: el.mentions
                }, { quoted: msg });
                return;
            }
        }
    } catch (e) { /* silencioso */ }
}

// ============================================================
// COMANDO .afk
// ============================================================
export default {
    nombre: 'afk',
    categoria: 'Utils',
    alias: ['ausente', 'afkoff'],
    descripcion: 'Marca tu estado AFK con razón y aviso automático',
    uso: '.afk [razón] · .afk off',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
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
                '┃ ⏱️ Duraste: ' + fmtTiempo(Date.now() - data.tiempo) + '\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }

        // Ya estaba AFK
        if (db[sender]) {
            return await responder.texto(
                '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
                '┃\n' +
                '┃ ️ Ya estás AFK:\n' +
                '┃  ' + db[sender].razon + '\n' +
                '┃\n' +
                '┃ Usa .afk off para volver\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏 ⚡ 〕━━⬣'
            );
        }

        // Marcar AFK (guarda el nombre para mostrarlo bonito)
        db[sender] = {
            razon: accion || 'Sin razón',
            tiempo: Date.now(),
            nombre: msg.pushName || ''
        };
        guardar(db);
        const yo = await quienEs(sock, sender, msg.pushName);

        return await responder.texto(
            '╭━━〔 💤 𝐀𝐅𝐊 〕━━⬣\n' +
            '┃\n' +
            '┃ 💤 ' + yo.texto + ' ahora está AFK\n' +
            '┃ 📝 Razón: ' + db[sender].razon + '\n' +
            '┃\n' +
            '┃ Se avisará a quien te mencione,\n' +
            '┃ te responda o escriba tu nombre\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐓-𝐏 ⚡ 〕━━⬣'
        );
    }
};