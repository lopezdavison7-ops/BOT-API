import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    alias: ['verpersonaje', 'verp'],
    ejecutar: async ({ sock, msg }) => {
        try {
            const type = Object.keys(msg.message || {})[0];
            const text = msg.message[type]?.text || msg.message.conversation || '';
            const nombrePers = text.split(' ').slice(1).join(' ').trim();

            if (!nombrePers) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Usa: `.vp <nombre>`' }, { quoted: msg });

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            let db;
            try {
                const data = await fs.readFile(RUTA, 'utf-8');
                db = JSON.parse(data);
            } catch(e) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error leyendo gacha.json: ${e.message}` }, { quoted: msg });
            }

            // Buscar exacto y parecido
            let personaje = db[nombrePers];
            if (!personaje) {
                personaje = Object.values(db).find(p => p.nombre?.toLowerCase() === nombrePers.toLowerCase());
            }

            if (!personaje) {
                const lista = Object.keys(db).slice(0, 5).join(', ');
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ No encontrado: *${nombrePers}*\n\nPersonajes disponibles: ${lista}...`
                }, { quoted: msg });
            }

            const info = `☆ *${personaje.nombre}*
✧ Género: ${personaje.genero}
✧ Serie: ${personaje.serie}
✦ Valor: ${personaje.valor?.toLocaleString()} RWcoins`;

            if (personaje.imagen) {
                const imgPath = path.join(process.cwd(), 'database', personaje.imagen);
                try {
                    const imgBuffer = await fs.readFile(imgPath);
                    await sock.sendMessage(msg.key.remoteJid, { image: imgBuffer, caption: info }, { quoted: msg });
                } catch(e) {
                    await sock.sendMessage(msg.key.remoteJid, { text: info + `\n\n⚠️ Error imagen: ${e.message}` }, { quoted: msg });
                }
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: info + '\n\n⚠️ Sin campo imagen' }, { quoted: msg });
            }

        } catch(e) {
            console.error(e);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error fatal: ${e.message}` }, { quoted: msg });
        }
    }
};