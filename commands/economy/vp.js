import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    alias: ['verpersonaje', 'verp'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ texto, args, text, commandArgs, responder, conn, msg }) => {
        try {
            // Agarramos el nombre de donde sea que venga
            const nombrePers = (texto || args?.join(' ') || text || commandArgs || '').trim();

            if (!nombrePers) return await responder.texto('❌ Usa: `.vp <nombre del personaje>`');

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            const data = await fs.readFile(RUTA, 'utf-8');
            const db = JSON.parse(data);

            // Buscar por key exacto primero
            let personaje = db[nombrePers];

            // Si no, buscar por nombre.toLowerCase
            if (!personaje) {
                for (let key in db) {
                    if (db[key].nombre?.toLowerCase() === nombrePers.toLowerCase()) {
                        personaje = db[key];
                        break;
                    }
                }
            }

            if (!personaje) {
                return await responder.texto(`❌ No se encontró: *${nombrePers}*`);
            }

            const info = `☆ *${personaje.nombre}*
✧ Género: ${personaje.genero || 'Desconocido'}
✦ Valor: ${personaje.valor?.toLocaleString() || 0} RWcoins
◆ Votos: ${personaje.votos || 0}
★ Estado: ${personaje.estado || 'Libre'}`;

            if (personaje.imagen && personaje.imagen.startsWith('http')) {
                return await conn.sendMessage(msg.key.remoteJid, {
                    image: { url: personaje.imagen },
                    caption: info
                });
            } else {
                return await responder.texto(info + '\n\n⚠️ Sin imagen');
            }

        } catch(e) {
            console.error('Error en vp:', e);
            await responder.texto(`❌ Error: ${e.message}`);
        }
    }
};