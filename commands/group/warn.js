import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUTA_WARN = path.join(__dirname, '..', '..', 'database', 'warns.json');
const MAX_WARNS = 3;

function leerWarns() {
    try {
        const datos = JSON.parse(fs.readFileSync(RUTA_WARN, 'utf8'));
        return datos && typeof datos === 'object' ? datos : {};
    } catch {
        return {};
    }
}

function guardarWarns(db) {
    fs.mkdirSync(path.dirname(RUTA_WARN), { recursive: true });
    fs.writeFileSync(RUTA_WARN, JSON.stringify(db, null, 2), 'utf8');
}

function obtenerObjetivo(msg) {
    const ctx =
        msg?.message?.extendedTextMessage?.contextInfo ||
        msg?.message?.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ||
        null;

    const mencion = ctx?.mentionedJid?.[0] || null;
    const citado = ctx?.quotedMessage
        ? (ctx.participant || ctx.participantAlt || null)
        : null;

    return mencion || citado || null;
}

async function esAdminDeGrupo(sock, jid, userJid) {
    try {
        const meta = await sock.groupMetadata(jid);
        const limpio = String(userJid).split('@')[0].split(':')[0];
        const p = (meta?.participants || []).find(
            x => String(x?.id || '').split('@')[0].split(':')[0] === limpio
        );
        return Boolean(p?.admin);
    } catch {
        return false;
    }
}

export default {
    nombre: 'warn',
    categoria: 'Grupos',
    alias: ['advertencia', 'advertir'],
    descripcion: 'Advierte a un usuario. Al llegar a 3 warns es expulsado.',

    ejecutar: async ({ sock, msg, argumento, responder, isGroup, jid, fromMe }) => {

        if (!isGroup) {
            await responder.texto('❌ *WARN*\n\nEste comando es solo para grupos.');
            return;
        }

        const remitente =
            msg.key.participant ||
            msg.key.senderPn ||
            msg.key.participantAlt ||
            msg.key.remoteJid;

        const esOwner = Boolean(fromMe || msg.esOwnerAutomatico);

        if (!esOwner && !(await esAdminDeGrupo(sock, jid, remitente))) {
            await responder.texto('❌ *WARN*\n\nSolo los admins del grupo pueden advertir.');
            return;
        }

        const objetivo = obtenerObjetivo(msg);

        if (!objetivo) {
            await responder.texto(
                '╭━━〔 ⚠️ 𝐖𝐀𝐑𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona o responde al\n' +
                '┃    usuario que quieres advertir.\n' +
                '┃\n' +
                '┃ Ejemplo:\n' +
                '┃ › .warn @usuario spam\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        try {
            const db = leerWarns();
            if (!db[jid]) db[jid] = {};
            if (!db[jid][objetivo]) db[jid][objetivo] = { count: 0, razones: [] };

            const razon = String(argumento || '').trim() || 'Sin razón';

            db[jid][objetivo].count += 1;
            db[jid][objetivo].razones.push(razon);
            db[jid][objetivo].ultimo = Date.now();
            guardarWarns(db);

            const count = db[jid][objetivo].count;
            const mencionTexto = '@' + String(objetivo).split('@')[0].replace(/\D/g, '');

            if (count >= MAX_WARNS) {
                db[jid][objetivo] = { count: 0, razones: [] };
                guardarWarns(db);

                let lineaExtra = '┃ ⚠️ Llegó a 3 warns pero\n┃    no pude expulsarlo.\n';
                try {
                    await sock.groupParticipantsUpdate(jid, [objetivo], 'remove');
                    lineaExtra = '┃ 🚪 Expulsado por acumular\n┃    3 advertencias.\n';
                } catch {}

                await sock.sendMessage(jid, {
                    text:
                        '╭━━〔 ⚠️ 𝐖𝐀𝐑𝐍 〕━━⬣\n' +
                        '┃\n' +
                        `┃ 👤 ${mencionTexto}\n` +
                        `┃ 📝 Razón: ${razon}\n` +
                        `┃ 🔢 Warns: 3/${MAX_WARNS}\n` +
                        '┃\n' +
                        lineaExtra +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣',
                    mentions: [objetivo]
                }, { quoted: msg });
                return;
            }

            await sock.sendMessage(jid, {
                text:
                    '╭━━〔 ⚠️ 𝐖𝐀𝐑𝐍 〕━━⬣\n' +
                    '┃\n' +
                    `┃ 👤 ${mencionTexto}\n` +
                    `┃ 📝 Razón: ${razon}\n` +
                    `┃ 🔢 Warns: ${count}/${MAX_WARNS}\n` +
                    '┃\n' +
                    '┃  Al llegar a 3 será\n' +
                    '┃    expulsado del grupo.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━',
                mentions: [objetivo]
            }, { quoted: msg });

        } catch (error) {
            console.error('[WARN] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '❌ Error al agregar advertencia.\n\n' +
                '⚠️ Detalle: ' + (error?.message || String(error))
            );
        }
    }
};