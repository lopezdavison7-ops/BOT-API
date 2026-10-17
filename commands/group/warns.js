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

export default {
    nombre: 'warns',
    categoria: 'Grupos',
    alias: ['advertencias', 'listwarns', 'verwarns'],
    descripcion: 'Ver las advertencias de un usuario o de todo el grupo.',

    ejecutar: async ({ sock, msg, responder, isGroup, jid }) => {

        if (!isGroup) {
            await responder.texto('❌ *WARNS*\n\nEste comando es solo para grupos.');
            return;
        }

        try {
            const db = leerWarns();
            const grupo = db[jid] || {};
            const objetivo = obtenerObjetivo(msg);

            if (objetivo) {
                const reg = grupo[objetivo];
                const mencionTexto = '@' + String(objetivo).split('@')[0].replace(/\D/g, '');

                if (!reg || reg.count <= 0) {
                    await sock.sendMessage(jid, {
                        text: `✅ ${mencionTexto} no tiene advertencias en este grupo.`,
                        mentions: [objetivo]
                    }, { quoted: msg });
                    return;
                }

                const razones = (reg.razones || [])
                    .map((r, i) => `┃    ${i + 1}. ${r}`)
                    .join('\n');

                await sock.sendMessage(jid, {
                    text:
                        '╭━━〔 ⚠️ 𝐖𝐀𝐑𝐍𝐒 〕━━⬣\n' +
                        '┃\n' +
                        `┃ 👤 ${mencionTexto}\n` +
                        `┃ 🔢 Warns: ${reg.count}/3\n` +
                        '┃\n' +
                        '┃ 📝 Razones:\n' +
                        (razones || '┃    (sin razones guardadas)') + '\n' +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣',
                    mentions: [objetivo]
                }, { quoted: msg });
                return;
            }

            const entradas = Object.entries(grupo).filter(([, v]) => v?.count > 0);

            if (entradas.length === 0) {
                await responder.texto(
                    '╭━━〔 ⚠️ 𝐖𝐀𝐑𝐍𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ ✅ No hay usuarios con\n' +
                    '┃    advertencias en este grupo.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━'
                );
                return;
            }

            const menciones = [];
            const lineas = entradas.map(([userJid, v]) => {
                menciones.push(userJid);
                const num = '@' + String(userJid).split('@')[0].replace(/\D/g, '');
                return `┃ • ${num} → ${v.count}/3`;
            }).join('\n');

            await sock.sendMessage(jid, {
                text:
                    '╭━━〔 ⚠️ 𝐖𝐀𝐑𝐍𝐒 𝐃𝐄𝐋 𝐆𝐑𝐔𝐏𝐎 〕━━⬣\n' +
                    '┃\n' +
                    lineas + '\n' +
                    '┃\n' +
                    '┃ 📌 Ver detalle de alguien:\n' +
                    '┃ › .warns @usuario\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣',
                mentions: menciones
            }, { quoted: msg });

        } catch (error) {
            console.error('[WARNS] Error:', error?.stack || error?.message || error);
            await responder.texto(
                '❌ Error al leer advertencias.\n\n⚠️ Detalle: ' + (error?.message || String(error))
            );
        }
    }
};