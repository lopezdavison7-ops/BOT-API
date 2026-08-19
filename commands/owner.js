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
    descripcion: 'Muestra la lista de propietarios con menciones cliqueables',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            // 1. Cargar el archivo
            let data = {};
            let owners = [];

            try {
                const raw = await fs.readFile(OWNER_FILE, 'utf8');
                data = JSON.parse(raw);

                // Detectar formato
                if (Array.isArray(data)) {
                    owners = data;
                } else if (data.owners && Array.isArray(data.owners)) {
                    owners = data.owners;
                } else {
                    owners = Object.values(data);
                }
            } catch {
                await responder.texto('❌ No hay propietarios configurados en la base de datos.');
                return;
            }

            // 2. LIMPIAR NÚMEROS (quitar +, espacios, y caracteres raros)
            const cleanedOwners = owners.map(o => {
                let num = String(o).replace(/[^0-9]/g, ''); // Solo números
                return num;
            }).filter(num => num.length >= 10); // Filtrar números válidos

            if (cleanedOwners.length === 0) {
                await responder.texto('❌ La lista de propietarios está vacía o inválida.');
                return;
            }

            // 3. Construir la lista con JIDs limpios
            let listaTexto = '';
            const mentionsList = [];

            cleanedOwners.forEach((numero, i) => {
                const jid = `${numero}@s.whatsapp.net`;
                listaTexto += `${i + 1}. @${numero} 👑\n`;
                mentionsList.push(jid);
            });

            // 4. Mensaje con estilo
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

            // 5. ENVIAR CON sock.sendMessage Y EL ARRAY DE MENCIONES
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