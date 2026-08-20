// commands/group/warns.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), '../../database', 'warns.json');

export default {
    nombre: 'warns',
    categoria: 'Moderación',
    alias: ['advertencias', 'warnings'],
    descripcion: 'Muestra las advertencias de un usuario',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            let target = null;

            // FORMA 1: Respondiendo a un mensaje
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                target = quoted;
            }

            // FORMA 2: Mención (@usuario)
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length > 0) {
                target = mentioned[0];
                if (quoted && mentioned.length > 0) {
                    target = mentioned[0];
                }
            }

            if (!target) {
                await responder.texto(
                    `❌ *WARNS*\n\n` +
                    `Menciona a un usuario o responde a su mensaje.\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.warns @usuario*`
                );
                return;
            }

            // Cargar warns
            let warns = {};
            try {
                const data = await fs.readFile(WARN_FILE, 'utf8');
                warns = JSON.parse(data);
            } catch {}

            if (!warns[target] || warns[target].length === 0) {
                const textoLimpio = `
╭〔 ✅ 𝐒𝐈𝐍 𝐀𝐃𝐕𝐄𝐑𝐓𝐄𝐍𝐂𝐈𝐀𝐒 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ 🔢 Total: 0
┃
┃ 🍀 Usuario limpio.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
                await sock.sendMessage(msg.key.remoteJid, {
                    text: textoLimpio,
                    mentions: [target]
                }, { quoted: msg });
                return;
            }

            // Construir lista de advertencias
            const lista = warns[target].map((w, i) => 
                `${i + 1}. #${w.id} | ${w.fecha} | ${w.razon}`
            ).join('\n');

            const textoWarns = `
╭〔 📋 𝐀𝐃𝐕𝐄𝐑𝐓𝐄𝐍𝐂𝐈𝐀𝐒 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ 🔢 Total: ${warns[target].length}
┃
┃ ${lista}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await sock.sendMessage(msg.key.remoteJid, {
                text: textoWarns,
                mentions: [target]
            }, { quoted: msg });

        } catch (error) {
            console.error('[WARNS] Error:', error);
            await responder.texto('❌ Error al obtener advertencias.');
        }
    }
};