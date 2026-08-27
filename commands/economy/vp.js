import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    ejecutar: async ({ sock, msg }) => {
        try {
            const type = Object.keys(msg.message || {})[0];
            const text = msg.message[type]?.text || msg.message.conversation || '';
            const nombrePers = text.split(' ').slice(1).join(' ').trim();

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            const db = JSON.parse(await fs.readFile(RUTA, 'utf-8'));

            let personaje = db[nombrePers];
            if (!personaje) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ No encontrado` }, { quoted: msg });

            const info = `☆ *${personaje.nombre}*\n✧ Género: ${personaje.genero}\n✧ Serie: ${personaje.serie}\n✦ Valor: ${personaje.valor} RWcoins`;

            if (personaje.imagen) {
                const imgPath = path.join(process.cwd(), 'database', personaje.imagen);
                await sock.sendMessage(msg.key.remoteJid, { text: `Buscando imagen en: ${imgPath}` }, { quoted: msg }); // DEBUG
                const imgBuffer = await fs.readFile(imgPath);
                await sock.sendMessage(msg.key.remoteJid, { image: imgBuffer, caption: info }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: info + '\n\n⚠️ Sin campo imagen' }, { quoted: msg });
            }

        } catch(e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error imagen: ${e.message}` }, { quoted: msg });
        }
    }
};