// commands/warns.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'warns',
    categoria: 'Moderación',
    alias: ['advertencias', 'warnings'],
    descripcion: 'Muestra las advertencias de un usuario',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Obtener mencionados
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length === 0) {
                await responder.texto(
                    `❌ *WARNS*\n\n` +
                    `Menciona a un usuario.\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.warns @usuario*`
                );
                return;
            }

            const target = mentioned[0];

            // Cargar warns
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