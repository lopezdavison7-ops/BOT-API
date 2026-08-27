import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    ejecutar: async ({ sock, msg }) => {
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const nombrePers = text.split(' ').slice(1).join(' ').trim();

        const db = JSON.parse(await fs.readFile(path.join(process.cwd(), 'database', 'gacha.json'), 'utf-8'));

        // Busca por nombre
        let key = Object.keys(db).find(k => db[k].nombre?.toLowerCase() === nombrePers.toLowerCase());
        if(!key) return await sock.sendMessage(msg.key.remoteJid, {text: '❌ No encontrado'}, {quoted: msg});

        const p = db[key];
        const info = `☆ *${p.nombre}*\n✧ Género: ${p.genero}\n✧ Serie: ${p.serie}\n✦ Valor: ${p.valor} RWcoins`;

        // Intenta con _ y con espacio
        let imgPath = path.join(process.cwd(), 'database', key);
        try {
            const img = await fs.readFile(imgPath);
            return await sock.sendMessage(msg.key.remoteJid, {image: img, caption: info}, {quoted: msg});
        } catch {
            // Si falla, intenta cambiando _ por espacio
            imgPath = path.join(process.cwd(), 'database', key.replace(/_/g, ' '));
            try {
                const img = await fs.readFile(imgPath);
                return await sock.sendMessage(msg.key.remoteJid, {image: img, caption: info}, {quoted: msg});
            } catch {
                return await sock.sendMessage(msg.key.remoteJid, {text: info + `\n\n⚠️ No encontré la imagen: ${key}`}, {quoted: msg});
            }
        }
    }
};