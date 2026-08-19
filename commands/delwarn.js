// commands/delwarn.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'delwarn',
    categoria: 'Moderación',
    alias: ['removewarn', 'borrarwarn'],
    descripcion: 'Elimina una advertencia (responde, menciona o escribe el número)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            let target = null;
            let warnId = null;
            const args = (argumento || '').trim().split(' ');

            // 🔥 FORMA 1: Respondiendo a un mensaje
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                target = quoted;
                warnId = args[0] || null;
            }

            // 🔥 FORMA 2: Mención (@usuario)
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length > 0) {
                target = mentioned[0];
                // El ID es el siguiente argumento después de la mención
                warnId = args[1] || args[0] || null;
                if (quoted && mentioned.length > 0) {
                    target = mentioned[0];
                }
            }

            // 🔥 FORMA 3: Número escrito directamente (ej: +50576641902 o 50576641902)
            if (!target && args.length >= 1) {
                let posibleNumero = args[0].replace(/[^0-9]/g, ''); // Quitar + y espacios
                if (posibleNumero.length >= 10) {
                    // Convertir a formato JID de WhatsApp (ej: 50576641902@s.whatsapp.net)
                    target = `${posibleNumero}@s.whatsapp.net`;
                    warnId = args[1] || null;
                }
            }

            // Si no tenemos target ni ID, mostramos el mensaje de ayuda
            if (!target || !warnId) {
                await responder.texto(
                    `❌ *DELWARN*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Responde a un mensaje del usuario: *.delwarn ID*\n` +
                    `2️⃣ Menciona al usuario: *.delwarn @usuario ID*\n` +
                    `3️⃣ Escribe el número: *.delwarn +50576641902 ID*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.delwarn mt0baxzi* (respondiendo)\n` +
                    `*.delwarn @pedro mt0baxzi*\n` +
                    `*.delwarn +50576641902 mt0baxzi*\n\n` +
                    `📌 Para ver IDs usa: *.warns @usuario*`
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
                await responder.texto('❌ Este usuario no tiene advertencias.');
                return;
            }

            // Buscar el ID de la advertencia
            const index = warns[target].findIndex(w => w.id === warnId);
            if (index === -1) {
                await responder.texto('❌ ID de advertencia no encontrado. Revisa el ID correcto en *.warns*');
                return;
            }

            const removida = warns[target][index];
            warns[target].splice(index, 1);
            if (warns[target].length === 0) delete warns[target];

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