// commands/delowner.js
import fs from 'fs/promises';
import path from 'path';

const OWNER_FILE = path.join(process.cwd(), 'database', 'owner.json');

export default {
    nombre: 'delowner',
    categoria: 'Owner',
    alias: ['deleteowner', 'removerowner'],
    descripcion: 'Elimina un propietario del bot (menciona, responde o escribe el número)',
    ejecutar: async ({ msg, sock, responder, argumento }) => {
        try {
            // 1. Obtener el número a eliminar
            let targetNumber = null;

            // FORMA 1: Respondiendo a un mensaje
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
            if (quoted) {
                targetNumber = quoted.split('@')[0];
            }

            // FORMA 2: Mención
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
            if (mentioned.length > 0) {
                targetNumber = mentioned[0].split('@')[0];
            }

            // FORMA 3: Número escrito directo
            if (!targetNumber && argumento) {
                targetNumber = String(argumento).replace(/[^0-9]/g, '');
            }

            if (!targetNumber || targetNumber.length < 10) {
                await responder.texto(
                    `❌ *DELOWNER*\n\n` +
                    `Usa una de estas formas:\n` +
                    `1️⃣ Responde a un mensaje del usuario\n` +
                    `2️⃣ Menciona al usuario: *.delowner @usuario*\n` +
                    `3️⃣ Escribe el número: *.delowner 521234567890*\n\n` +
                    `📌 Ejemplos:\n` +
                    `*.delowner @pedro*\n` +
                    `*.delowner 521234567890*`
                );
                return;
            }

            // 2. Leer el archivo owner.json
            let data = {};
            try {
                const raw = await fs.readFile(OWNER_FILE, 'utf8');
                data = JSON.parse(raw);
            } catch {
                await responder.texto('❌ No se pudo leer la base de datos de propietarios.');
                return;
            }

            // 3. Obtener el array de owners
            let owners = [];
            if (Array.isArray(data)) {
                owners = data;
            } else if (data.owners && Array.isArray(data.owners)) {
                owners = data.owners;
            } else {
                owners = Object.values(data).filter(v => typeof v === 'string');
            }

            if (owners.length === 0) {
                await responder.texto('❌ No hay propietarios registrados.');
                return;
            }

            // 4. Buscar el número en el array (sin importar formato)
            let foundIndex = -1;
            for (let i = 0; i < owners.length; i++) {
                const ownerNumber = String(owners[i]).replace(/[^0-9]/g, '');
                if (ownerNumber === targetNumber) {
                    foundIndex = i;
                    break;
                }
            }

            if (foundIndex === -1) {
                await responder.texto('❌ Ese usuario no es un propietario registrado.');
                return;
            }

            // 5. Eliminar y guardar
            owners.splice(foundIndex, 1);

            // Guardar en el mismo formato que tenía
            if (Array.isArray(data)) {
                data = owners;
            } else if (data.owners && Array.isArray(data.owners)) {
                data.owners = owners;
            } else {
                data = owners;
            }

            await fs.writeFile(OWNER_FILE, JSON.stringify(data, null, 2));

            // 6. Mensaje de confirmación
            const respuesta = `
╭〔 ✅ 𝐎𝐖𝐍𝐄𝐑 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐎 〕⬣
┃
┃ 🗑️ Usuario eliminado: @${targetNumber}
┃
┃ 👥 Total Owners: ${owners.length}
┃
┃ 💾 Base de datos actualizada.
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: respuesta,
                mentions: [`${targetNumber}@s.whatsapp.net`]
            }, { quoted: msg });

            console.log(`[DELOWNER] Eliminado: ${targetNumber}`);

        } catch (error) {
            console.error('[DELOWNER] Error:', error);
            await responder.texto('❌ Error al eliminar el propietario.');
        }
    }
};