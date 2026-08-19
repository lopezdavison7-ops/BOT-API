// commands/warn.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'warn',
    categoria: 'Moderación',
    alias: ['advertir'],
    descripcion: 'Agrega una advertencia a un usuario',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // Verificar si es grupo
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            // Obtener mencionados
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length === 0) {
                await responder.texto(
                    `❌ *WARN*\n\n` +
                    `Menciona a un usuario.\n\n` +
                    `📌 Ejemplo:\n` +
                    `*.warn @usuario razón*`
                );
                return;
            }

            const target = mentioned[0];
            const args = (argumento || '').trim().split(' ');
            const razon = args.slice(1).join(' ') || 'Sin razón especificada';

            // Cargar warns existentes
            let warns = {};
            try {
                const data = await fs.readFile(WARN_FILE, 'utf8');
                warns = JSON.parse(data);
            } catch {
                // Archivo no existe
            }

            if (!warns[target]) warns[target] = [];

            const warnData = {
                id: Date.now().toString(36),
                fecha: new Date().toLocaleString(),
                razon: razon,
                mod: msg.key.participant || msg.key.remoteJid
            };

            warns[target].push(warnData);

            await fs.writeFile(WARN_FILE, JSON.stringify(warns, null, 2));

            const total = warns[target].length;

            const respuesta = `
╭〔 ⚠️ 𝐖𝐀𝐑𝐍 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ 📝 Razón: ${razon}
┃
┃ 🔢 Total: ${total} advertencia(s)
┃
┃ 🛡️ Moderador: @${(msg.key.participant || msg.key.remoteJid).split('@')[0]}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
            await responder.texto(respuesta, { mentions: [target, msg.key.participant || msg.key.remoteJid] });

        } catch (error) {
            console.error('[WARN] Error:', error);
            await responder.texto('❌ Error al agregar advertencia.');
        }
    }
};