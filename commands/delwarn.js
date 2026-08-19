// commands/delwarn.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'delwarn',
    categoria: 'Moderación',
    alias: ['removewarn', 'borrarwarn', 'limpiarwarn'],
    descripcion: 'Elimina TODAS las advertencias de un usuario (menciona o responde)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

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
                    `❌ *DELWARN*\n\n` +
                    `Solo menciona a un usuario o responde a su mensaje.\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.delwarn @usuario*\n` +
                    `*.delwarn* (respondiendo a su mensaje)`
                );
                return;
            }

            // Cargar base de datos
            let warns = {};
            try {
                const data = await fs.readFile(WARN_FILE, 'utf8');
                warns = JSON.parse(data);
            } catch {
                await responder.texto('❌ No hay advertencias registradas.');
                return;
            }

            if (!warns[target] || warns[target].length === 0) {
                // 🔥 ENVÍO DIRECTO CON MENCIÓN OBLIGADA
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: `✅ @${target.split('@')[0]} ya está limpio, no tiene advertencias.`,
                    mentions: [target] 
                }, { quoted: msg });
                return;
            }

            const cantidad = warns[target].length;
            delete warns[target];
            await fs.writeFile(WARN_FILE, JSON.stringify(warns, null, 2));

            // 🔥 ENVÍO DIRECTO CON MENCIÓN OBLIGADA Y FORMATO
            const texto = `
╭〔 🧹 𝐀𝐃𝐕𝐄𝐑𝐓𝐄𝐍𝐂𝐈𝐀𝐒 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐀𝐒 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ 🗑️ Advertencias borradas: ${cantidad}
┃
┃ ✅ El usuario ahora está limpio.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(msg.key.remoteJid, { 
                text: texto,
                mentions: [target] 
            }, { quoted: msg });

        } catch (error) {
            console.error('[DELWARN] Error:', error);
            await responder.texto('❌ Error al eliminar las advertencias.');
        }
    }
};