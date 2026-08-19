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
    descripcion: 'Muestra la lista de propietarios con menciones (híbrido)',
    ejecutar: async ({ msg, responder, argumento, sock }) => {
        try {
            let data = {};
            try {
                const raw = await fs.readFile(OWNER_FILE, 'utf8');
                data = JSON.parse(raw);
            } catch {
                await responder.texto('❌ No se pudo leer la base de datos.');
                return;
            }

            let owners = [];
            if (Array.isArray(data)) {
                owners = data;
            } else if (data.owners && Array.isArray(data.owners)) {
                owners = data.owners;
            } else {
                owners = Object.values(data).filter(v => typeof v === 'string');
            }

            if (owners.length === 0) {
                await responder.texto('❌ No hay propietarios.');
                return;
            }

            let textoRespuesta = `╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 𝐃𝐄𝐋 𝐁𝐎𝐓 〕⬣\n┃\n┃ 📌 Total: ${owners.length} owner(s)\n┃\n`;
            const mentions = [];

            owners.forEach((owner, i) => {
                const numeroLimpio = String(owner).replace(/[^0-9]/g, '');
                const jid = `${numeroLimpio}@s.whatsapp.net`;
                mentions.push(jid);
                // 🔥 PONEMOS @ EN EL TEXTO PARA INTENTAR LA MENCIÓN
                textoRespuesta += `┃ ${i + 1}. @${numeroLimpio}\n`;
            });

            textoRespuesta += `┃\n╰━━━━━━━━━━━━━━━━⬣\n\n╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣`;

            await sock.sendMessage(msg.key.remoteJid, {
                text: textoRespuesta,
                mentions: mentions
            }, { quoted: msg });

        } catch (error) {
            console.error('[OWNER] Error:', error);
            await responder.texto('❌ Error al mostrar owners.');
        }
    }
};