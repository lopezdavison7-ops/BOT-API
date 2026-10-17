import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RUTA_WARN = path.join(__dirname, '..', '..', 'database', 'warns.json');

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
    nombre: 'delwarn',
    categoria: 'Grupos',
    alias: ['unwarn', 'quitarwarn', 'resetwarn'],
    descripcion: 'Quita una advertencia a un usuario (o todas con "todo").',

    ejecutar: async ({ sock, msg, argumento, responder, isGroup, jid, fromMe }) => {

        if (!isGroup) {
            await responder.texto('❌ *DELWARN*\n\nEste comando es solo para grupos.');
            return;
        }

        const remitente =
            msg.key.participant ||
            msg.key.senderPn ||
            msg.key.participantAlt ||
            msg.key.remoteJid;

        const esOwner = Boolean(fromMe || msg.esOwnerAutomatico);

        if (!esOwner && !(await esAdminDeGrupo(sock, jid, remitente))) {
            await responder.texto('❌ *DELWARN*\n\nSolo los admins del grupo pueden quitar advertencias.');
            return;
        }

        const objetivo = obtenerObjetivo(msg);

        if (!objetivo) {
            await responder.texto(
                '╭━━〔 ⚠️ 𝐄𝐋𝐖𝐀𝐑𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Menciona o responde al\n' +
                '┃    usuario.\n' +
                '┃\n' +
                '┃ Ejemplos:\n' +
                '┃ › .delwarn @usuario\n' +
                '┃ › .delwarn @usuario todo\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        try {
            const db = leerWarns();
            const registro = db[jid]?.[objetivo];

            if (!registro || registro.count <= 0) {
                await responder.texto('✅ Ese usuario no tiene advertencias en este grupo.');
                return;
            }

            const modoTodo = /\b(todo|all|reset)\b/i.test(String(argumento || ''));
            const mencionTexto = '@' + String(objetivo).split('@')[0].replace(/\D/g, '');

            let nuevoCount;

            if (modoTodo) {
                nuevoCount = 0;
                db[jid][objetivo] = { count: 0, razones: [] };
            } else {
                nuevoCount = Math.max(0, registro.count - 1);
                db[jid][objetivo].count = nuevoCount;
                (db[jid][objetivo].razones || []).pop();
            }

            guardarWarns(db);

            await sock.sendMessage(jid, {
                text:
                    '╭━━〔 ✅ 𝐃𝐄𝐋𝐖𝐀𝐑𝐍 〕━━⬣\n' +
                    '┃\n' +
                    `┃ 👤 ${mencionTexto}\n` +
                    `┃ 🗑️ Warns restantes: ${nuevoCount}/3\n` +
                    '┃\n' +
                    (modoTodo
                        ? '┃ ♻️ Se reiniciaron todas sus\n┃    advertencias.\n'
                        : '┃ ➖ Se quitó 1 advertencia.\n') +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣',
                mentions: [objetivo]
            }, { quoted: msg });

        } catch (error) {
            console.error('[DELWARN] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '❌ Error al quitar advertencia.\n\n⚠️ Detalle: ' + (error?.message || String(error))
            );
        }
    }
};