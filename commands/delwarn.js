// commands/delwarn.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'delwarn',
    categoria: 'Moderación',
    alias: ['removewarn', 'borrarwarn'],
    descripcion: 'Elimina una advertencia específica',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Verificar si es grupo
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            const args = (argumento || '').trim().split(' ');
            if (args.length < 2) {
                await responder.texto(
                    `❌ *DELWARN*\n\n` +
                    `Uso: *.delwarn @usuario ID*\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.delwarn @usuario a1b2c3*\n\n` +
                    `📌 Para ver los IDs usa: *.warns @usuario*`
                );
                return;
            }

            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length === 0) {
                await responder.texto('❌ Menciona al usuario.');
                return;
            }

            const target = mentioned[0];
            const warnId = args[1];

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
                await responder.texto('❌ Este usuario no tiene advertencias.');
                return;
            }

            const index = warns[target].findIndex(w => w.id === warnId);
            if (index === -1) {
                await responder.texto('❌ ID de advertencia no encontrado.');
                return;
            }

            const removida = warns[target][index];
            warns[target].splice(index, 1);

            if (warns[target].length === 0) {
                delete warns[target];
            }

            await fs.writeFile(WARN_FILE, JSON.stringify(warns, null, 2));

            const respuesta = `
╭〔 ✅ 𝐖𝐀𝐑𝐍 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐀 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ 📝 Razón eliminada: ${removida.razon}
┃
┃ 🗑️ ID: ${removida.id}
┃
┃ 📅 Fecha: ${removida.fecha}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta, { mentions: [target] });

        } catch (error) {
            console.error('[DELWARN] Error:', error);
            await responder.texto('❌ Error al eliminar advertencia.');
        }
    }
};