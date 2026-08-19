// commands/warns.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'warns',
    categoria: 'Moderación',
    alias: ['advertencias', 'warnings'],
    descripcion: 'Muestra advertencias (responde o menciona)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            let target = null;

            // FORMA 1: Respondiendo a un mensaje
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                target = quoted;
            }

            // FORMA 2: Mención
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
                    `Usa una de estas formas:\n` +
                    `1️⃣ Responde a un mensaje del usuario: *.warns*\n` +
                    `2️⃣ Menciona al usuario: *.warns @usuario*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.warns* (respondiendo)\n` +
                    `*.warns @pedro*`
                );
                return;
            }

            let warns = {};
            try {
                const data = await fs.readFile(WARN_FILE, 'utf8');
                warns = JSON.parse(data);
            } catch {
                await responder.texto('❌ No hay advertencias registradas.');
                return;
            }

            if (!warns[target] || warns[target].length === 0) {
                await responder.texto(
                    `✅ @${target.split('@')[0]} no tiene advertencias.`,
                    { mentions: [target] }
                );
                return;
            }

            const lista = warns[target].map((w, i) => 
                `${i + 1}. #${w.id} | ${w.fecha} | ${w.razon}`
            ).join('\n');

            const respuesta = `
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
            await responder.texto(respuesta, { mentions: [target] });

        } catch (error) {
            console.error('[WARNS] Error:', error);
            await responder.texto('❌ Error al obtener advertencias.');
        }
    }
};