import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    alias: ['verpersonaje', 'verp'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ sock, msg, responder }) => {
        try {
            // SACAR EL NOMBRE DE msg.body
            const nombrePers = msg.body.split(' ').slice(1).join(' ').trim();

            if (!nombrePers) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: '❌ Usa: `.vp <nombre del personaje>`'
                }, { quoted: msg });
            }

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            const data = await fs.readFile(RUTA, 'utf-8');
            const db = JSON.parse(data);

            // Buscar por key o por nombre
            let personaje = db[nombrePers];
            if (!personaje) {
                personaje = Object.values(db).find(p => p.nombre?.toLowerCase() === nombrePers.toLowerCase());
            }

            if (!personaje) {
                return await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ No se encontró: *${nombrePers}*`
                }, { quoted: msg });
            }

            const info = `☆ *${personaje.nombre}*
✧ Género: ${personaje.genero || 'Desconocido'}
✦ Valor: ${personaje.valor?.toLocaleString() || 0} RWcoins
◆ Votos: ${personaje.votos || 0}
★ Estado: ${personaje.estado || 'Libre'}`;

            if (personaje.imagen && personaje.imagen.startsWith('http')) {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: personaje.imagen },
                    caption: info
                }, { quoted: msg });
            } else {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: info + '\n\n⚠️ Sin imagen'
                }, { quoted: msg });
            }

        } catch(e) {
            console.error('Error en vp:', e);
            await sock.sendMessage(msg.key.remoteJid, {
                text: `❌ Error: ${e.message}`
            }, { quoted: msg });
        }
    }
};