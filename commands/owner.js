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
            // 1. Cargar la lista de owners desde el JSON
            let ownersData = [];
            try {
                const data = await fs.readFile(OWNER_FILE, 'utf8');
                ownersData = JSON.parse(data);
            } catch {
                await responder.texto('❌ No hay propietarios configurados en la base de datos.');
                return;
            }

            // Si no hay owners, avisar
            if (!Array.isArray(ownersData) || ownersData.length === 0) {
                await responder.texto('❌ La lista de propietarios está vacía.');
                return;
            }

            // 2. Construir la lista con menciones @
            let listaTexto = '';
            const mentionsList = [];

            ownersData.forEach((ownerId, i) => {
                // Asegurar que el owner tenga formato de JID (si no, agregarlo)
                const jid = ownerId.includes('@s.whatsapp.net') 
                    ? ownerId 
                    : `${ownerId}@s.whatsapp.net`;
                
                const numero = jid.split('@')[0];
                listaTexto += `${i + 1}. @${numero} 👑\n`;
                mentionsList.push(jid);
            });

            // 3. Construir el mensaje con estilo
            const respuesta = `
╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣
┃
┃ 📌 Total: ${ownersData.length} owner(s)
┃
┃ ${listaTexto}
┃
╰━━━━━━━━━━━━━━━━⬣

╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣
`;

            // 4. Enviar con sock.sendMessage y menciones forzadas
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