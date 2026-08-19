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

            // 🔥 LIMPIEZA EXTREMA (quita +, espacios, ⁨, ⁩, puntos, guiones)
            const cleanedOwners = owners.map(o => {
                let num = String(o)
                    .replace(/[⁨⁩]/g, '')       // Quita caracteres invisibles
                    .replace(/[+\s\-.]/g, '')    // Quita +, espacios, guiones, puntos
                    .replace(/[^0-9]/g, '');     // Deja solo números
                return num;
            }).filter(num => num.length >= 10);

            if (cleanedOwners.length === 0) {
                await responder.texto('❌ La lista de propietarios está vacía o inválida.');
                return;
            }

            // 2. Construir lista con JIDs limpios
            let listaTexto = '';
            const mentionsList = [];

            cleanedOwners.forEach((numero, i) => {
                const jid = `${numero}@s.whatsapp.net`;
                listaTexto += `${i + 1}. @${numero} 👑\n`;
                mentionsList.push(jid);
            });

            // 3. Mensaje con estilo
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

            // 4. ENVIAR CON sock.sendMessage Y EL ARRAY DE MENCIONES
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