import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    alias: ['verpersonaje', 'verp'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const type = Object.keys(msg.message || {})[0];
            const text = msg.message[type]?.text || msg.message[type]?.caption || msg.message.conversation || '';
            const nombrePers = text.split(' ').slice(1).join(' ').trim();

            if (!nombrePers) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Usa: `.vp <nombre del personaje>`' }, { quoted: msg });

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            const db = JSON.parse(await fs.readFile(RUTA, 'utf-8'));

            let personaje = db[nombrePers] || Object.values(db).find(p => p.nombre?.toLowerCase() === nombrePers.toLowerCase());
            if (!personaje) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ No se encontró: *${nombrePers}*` }, { quoted: msg });

            const info = `☆ *${personaje.nombre}*
✧ Género: ${personaje.genero || 'Desconocido'}
✧ Serie: ${personaje.serie || 'Desconocida'}
✦ Valor: ${personaje.valor?.toLocaleString() || 0} RWcoins
◆ Votos: ${personaje.votos || 0}
★ Estado: ${personaje.estado || 'Libre'}`;

            if (personaje.imagen) {
                const imgPath = path.join(process.cwd(), 'database', personaje.imagen);
                const imgBuffer = await fs.readFile(imgPath);
                await sock.sendMessage(msg.key.remoteJid, {
                    image: imgBuffer,
                    caption: info
                }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { text: info + '\n\n⚠️ Sin imagen' }, { quoted: msg });
            }

        } catch(e) {
            console.error('Error en vp:', e);
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};