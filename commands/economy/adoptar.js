import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUTA_ADOPCIONES = path.join(__dirname, '..', '..', 'database', 'adopciones.json');

function leerAdopciones() {
    try {
        const data = fs.readFileSync(RUTA_ADOPCIONES, 'utf8');
        return JSON.parse(data);
    } catch {
        return {};
    }
}

function guardarAdopcion(adoptante, adoptado) {
    const db = leerAdopciones();
    if (!db[adoptante]) db[adoptante] = [];
    if (!db[adoptante].includes(adoptado)) {
        db[adoptante].push(adoptado);
    }
    fs.mkdirSync(path.dirname(RUTA_ADOPCIONES), { recursive: true });
    fs.writeFileSync(RUTA_ADOPCIONES, JSON.stringify(db, null, 2), 'utf8');
}

export default {
    nombre: 'adoptar',
    categoria: 'Diversión',
    alias: ['adopt', 'hijo', 'hija', 'adoptados', 'misadoptados', 'listaadoptados'],
    descripcion: '.adoptar @usuario para adoptar | .adoptados para ver tu lista',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        const mencion = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const adoptado = mencion[0];
        const adoptante = msg.key.participant || msg.key.remoteJid;
        const nombreComando = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '')
            .trim().toLowerCase().split(' ')[0].replace('.', '');

        // ───────────── .adoptados ─────────────
        if (['adoptados', 'misadoptados', 'listaadoptados'].includes(nombreComando)) {
            const objetivo = adoptado || adoptante;
            const db = leerAdopciones();
            const lista = db[objetivo] || [];

            if (lista.length === 0) {
                return await responder.texto(
                    '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n' +
                    '┃\n' +
                    `┃ 📭 *@${objetivo.split('@')[0]}* no ha adoptado a nadie aún.\n` +
                    '┃\n' +
                    '┃ 💡 Usa *.adoptar @usuario* para empezar tu familia.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
            }

            let texto =
                '╭━━〔 👶 𝐀𝐃𝐎𝐏𝐓𝐀𝐃𝐎𝐒 〕━━\n' +
                '┃\n' +
                `┃ 👑 *@${objetivo.split('@')[0]}* tiene *${lista.length}* adoptado(s):\n` +
                '┃\n';

            lista.forEach((adoptadoJid, i) => {
                texto += `┃ ${i + 1}. @${adoptadoJid.split('@')[0]}\n`;
            });

            texto +=
                '┃\n' +
                '┃ 📅 Registrados en BOT-API\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣';

            return await sock.sendMessage(jid, {
                text: texto,
                mentions: [objetivo, ...lista]
            }, { quoted: msg });
        }

        // ───────────── .adoptar ─────────────
        if (!adoptado || adoptado === adoptante) {
            return await responder.texto(
                '╭━━〔 👶 𝐀𝐎𝐏𝐂𝐎́𝐍 〕━━⬣\n' +
                '┃\n' +
                '┃  Debes mencionar a alguien para adoptar.\n' +
                '┃\n' +
                '┃ 💡 Ejemplo: .adoptar @usuario\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        try {
            await sock.sendMessage(jid, { react: { text: '🍼', key: msg.key } });

            guardarAdopcion(adoptante, adoptado);

            const certificado =
                '╭━━━〔 📜 𝐂𝐄𝐓𝐈𝐅𝐈𝐂𝐀𝐎 𝐃𝐄 𝐃𝐎𝐏𝐂𝐈𝐎́𝐍 〕━━━╮\n' +
                '┃\n' +
                '┃  🍼 *¡NUEVA ADOPCIÓN REGISTRADA!*\n' +
                '┃\n' +
                `┃  👑 *Padre/Madre:* @${adoptante.split('@')[0]}\n` +
                `┃  👶 *Hijo/a:* @${adoptado.split('@')[0]}\n` +
                '\n' +
                '┃  ━━━━━━━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                '┃  "Por la presente se certifica que\n' +
                '┃   se ha realizado una adopción oficial\n' +
                '┃   registrada en el sistema BOT-API."\n' +
                '┃\n' +
                '┃  ━━━━━━━━━━━━━━━━━━━━━━━\n' +
                '┃\n' +
                `┃  📅 Fecha: ${new Date().toLocaleDateString('es-ES')}\n` +
                '┃  🏛️ Registrado por: ⚡ BOT-API\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯';

            await sock.sendMessage(jid, {
                text: certificado,
                mentions: [adoptante, adoptado]
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            console.error('[ADOPTAR] Error:', error?.message || error);
            await responder.texto(
                '❌ Ocurrió un error al procesar la adopción.\n\n' +
                '⚠️ Detalle: ' + (error?.message || 'Error desconocido')
            );
        }
    }
};