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
            // 1. Cargar el JSON
            let data = {};
            try {
                const raw = await fs.readFile(OWNER_FILE, 'utf8');
                data = JSON.parse(raw);
            } catch {
                await responder.texto('❌ No se pudo leer la base de datos de owners.');
                return;
            }

            // 2. Obtener el array de owners (soporte para formato array o { owners: [...] })
            let owners = [];
            if (Array.isArray(data)) {
                owners = data;
            } else if (data.owners && Array.isArray(data.owners)) {
                owners = data.owners;
            } else {
                owners = Object.values(data).filter(v => typeof v === 'string');
            }

            // 3. Limpiar números (quitar todo lo que no sea dígito)
            const cleanedOwners = owners
                .map(o => String(o).replace(/[^0-9]/g, ''))
                .filter(num => num.length >= 10);

            if (cleanedOwners.length === 0) {
                await responder.texto('❌ No hay propietarios válidos en la base de datos.');
                return;
            }

            // 4. Construir la lista con menciones
            let listaTexto = '';
            const mentionsList = [];

            cleanedOwners.forEach((numero, i) => {
                const jid = `${numero}@s.whatsapp.net`;
                listaTexto += `${i + 1}. @${numero} 👑\n`;
                mentionsList.push(jid);
            });

            const respuesta = `
╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣
┃
┃ 📌 Total: ${cleanedOwners.length} owner(s)
┃
┃ ${listaTexto}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            // 5. Enviar con menciones forzadas
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