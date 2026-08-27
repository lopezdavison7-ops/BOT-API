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
            const db = JSON.parse(await fs.readFile(RUTA, 'utf-8'));

            // Buscar por key o por nombre
            let key = Object.keys(db).find(k => k.toLowerCase() === nombrePers.toLowerCase());
            if (!key) {
                key = Object.keys(db).find(k => db[k].nombre?.toLowerCase() === nombrePers.toLowerCase());
            }

            if (!key) {
                const lista = Object.keys(db).slice(0, 5).join(', ');
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ No encontrado: *${nombrePers}*\n\nEj: ${lista}` }, { quoted: msg });
            }

            const personaje = db[key];

            const info = `☆ *${personaje.nombre || key}*
✧ Género: ${personaje.genero || 'Desconocido'}
✧ Serie: ${personaje.serie || 'Desconocida'}
✦ Valor: ${personaje.valor?.toLocaleString() || 0} RWcoins
◆ Votos: ${personaje.votos || 0}
★ Estado: ${personaje.estado || 'Libre'}`;

            // BUSCAR IMAGEN CON EL MISMO NOMBRE DE LA KEY
            const imgPath = path.join(process.cwd(), 'database', key);
            try {
                const imgBuffer = await fs.readFile(imgPath);
                await sock.sendMessage(msg.key.remoteJid, { image: imgBuffer, caption: info }, { quoted: msg });
            } catch(e) {
                // Si no encuentra la imagen, manda solo texto
                await sock.sendMessage(msg.key.remoteJid, { text: info + `\n\n⚠️ No se encontró imagen: ${key}` }, { quoted: msg });
            }

        } catch(e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};