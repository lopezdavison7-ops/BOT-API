// commands/warn.js
import fs from 'fs/promises';
import path from 'path';

const WARN_FILE = path.join(process.cwd(), 'database', 'warns.json');

export default {
    nombre: 'warn',
    categoria: 'Moderación',
    alias: ['advertir'],
    descripcion: 'Agrega advertencia y expulsa al llegar a 3',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            if (!msg.key.remoteJid.endsWith('@g.us')) {
                await responder.texto('❌ Este comando solo funciona en grupos.');
                return;
            }

            let target = null;
            let razon = (argumento || '').trim();

            // FORMA 1: Respondiendo a un mensaje
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                target = quoted;
                if (!razon) razon = 'Sin razón especificada';
            }

            // FORMA 2: Mención
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length > 0) {
                target = mentioned[0];
                if (quoted && mentioned.length > 0) {
                    target = mentioned[0];
                }
                if (!razon) razon = 'Sin razón especificada';
            }

            if (!target) {
                await responder.texto(
                    `❌ *WARN*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Responde a un mensaje del usuario: *.warn razón*\n` +
                    `2️⃣ Menciona al usuario: *.warn @usuario razón*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.warn Spam* (respondiendo)\n` +
                    `*.warn @pedro Spam*`
                );
                return;
            }

            // Cargar warns
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

            // ✅ AUTO-KICK SI LLEGA A 3 ADVERTENCIAS
            if (total >= 3) {
                try {
                    await sock.groupParticipantsUpdate(
                        msg.key.remoteJid,
                        [target],
                        'remove'
                    );
                    
                    const respuestaKick = `
╭〔 🚫 𝐀𝐔𝐓𝐎-𝐊𝐈𝐂𝐊 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ ⚠️ Motivo: Llegó a 3 advertencias
┃
┃ 📝 Última razón: ${razon}
┃
┃ 🔢 Total: 3/3 advertencias
┃
┃ 🛡️ Moderador: @${(msg.key.participant || msg.key.remoteJid).split('@')[0]}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;
                    await responder.texto(respuestaKick, { mentions: [target, msg.key.participant || msg.key.remoteJid] });
                    return;
                } catch (error) {
                    console.error('[WARN] Error al kickear:', error);
                    await responder.texto('❌ No se pudo expulsar al usuario (revisa permisos).');
                }
            }

            // Si no llegó a 3, solo muestra el warn normal
            const respuesta = `
╭〔 ⚠️ 𝐖𝐀𝐑𝐍 〕⬣
┃
┃ 👤 Usuario: @${target.split('@')[0]}
┃
┃ 📝 Razón: ${razon}
┃
┃ 🔢 Total: ${total}/3 advertencia(s)
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