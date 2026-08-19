// commands/owner.js
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OWNER_FILE = path.join(process.cwd(), 'database', 'owner.json');

export default {
    nombre: 'owner',
    categoria: 'Owner',
    alias: ['owners', 'dueños'],
    descripcion: 'Muestra la lista de propietarios del bot con menciones',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // 1. Cargar el archivo
            let data = {};
            let owners = [];

            try {
                const raw = await fs.readFile(OWNER_FILE, 'utf8');
                data = JSON.parse(raw);

                // Detectar el formato: si es un array directo o un objeto con una propiedad
                if (Array.isArray(data)) {
                    owners = data;
                } else if (data.owners && Array.isArray(data.owners)) {
                    owners = data.owners;
                } else {
                    // Si es un objeto con números como keys (formato antiguo)
                    owners = Object.values(data);
                }
            } catch {
                await responder.texto('❌ No hay propietarios configurados en la base de datos.');
                return;
            }

            // Limpiar números (quitar espacios y caracteres especiales)
            owners = owners.map(o => String(o).replace(/[^0-9]/g, ''));

            // Si no hay owners, avisar
            if (owners.length === 0) {
                await responder.texto('❌ La lista de propietarios está vacía.');
                return;
            }

            // 2. Construir la lista con menciones @
            let listaTexto = '';
            const mentionsList = [];

            owners.forEach((numero, i) => {
                const jid = `${numero}@s.whatsapp.net`;
                listaTexto += `${i + 1}. @${numero} 👑\n`;
                mentionsList.push(jid);
            });

            // 3. Mensaje con estilo
            const respuesta = `
╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣
┃
┃ 📌 Total: ${owners.length} owner(s)
┃
┃ ${listaTexto}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            // 4. Enviar con menciones
            await sock.sendMessage(msg.key.remoteJid, {
                text: respuesta,
                mentions: mentionsList
            }, { quoted: msg });

        } catch (error) {
            console.error('[OWNER] Error:', error);
            await responder.texto('❌ Error al obtener la lista de propietarios.');
        }
    }
};