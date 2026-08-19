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
    descripcion: 'Muestra la lista de propietarios con sus números',
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

            // 2. Obtener el array de owners
            let owners = [];
            if (Array.isArray(data)) {
                owners = data;
            } else if (data.owners && Array.isArray(data.owners)) {
                owners = data.owners;
            } else {
                owners = Object.values(data).filter(v => typeof v === 'string');
            }

            if (owners.length === 0) {
                await responder.texto('❌ No hay propietarios en la base de datos.');
                return;
            }

            // 3. Construir la lista con los números y menciones
            let listaTexto = '';
            const mentionsList = [];

            owners.forEach((numero, i) => {
                // Limpiar cualquier carácter no numérico (por si acaso)
                const numLimpio = String(numero).replace(/[^0-9]/g, '');
                const jid = `${numLimpio}@s.whatsapp.net`;
                
                // Mostrar el número con @ (para intentar la mención)
                listaTexto += `${i + 1}. @${numLimpio}\n`;
                mentionsList.push(jid);
            });

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

            // 4. Enviar con menciones forzadas
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