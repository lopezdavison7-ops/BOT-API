import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    alias: ['verpersonaje', 'verp'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ args, responder, conn, msg }) => {
        try {
            const nombrePers = args.join(' ');
            if (!nombrePers) return await responder.texto('❌ Usa: `.vp <nombre del personaje>`');

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            const data = await fs.readFile(RUTA, 'utf-8');
            const db = JSON.parse(data);

            // Buscar el personaje. Tu json es: { "Momioka Risa": {nombre: "Momioka Risa",...} }
            let personaje = null;
            for (let key in db) {
                if (db[key].nombre?.toLowerCase() === nombrePers.toLowerCase()) {
                    personaje = db[key];
                    break;
                }
            }

            if (!personaje) {
                return await responder.texto(`❌ No se encontró el personaje: *${nombrePers}*\nUsa.einfo para ver la lista`);
            }

            const texto = `☆ *${personaje.nombre}*
✧ Género: ${personaje.genero || 'Desconocido'}
✦ Valor: ${personaje.valor?.toLocaleString() || 0} RWcoins
◆ Votos: ${personaje.votos || 0}
★ Estado: ${personaje.estado || 'Libre'}`;

            if (personaje.imagen) {
                return await conn.sendMessage(msg.key.remoteJid, {
                    image: { url: personaje.imagen },
                    caption: texto
                });
            } else {
                return await responder.texto(texto + '\n\n⚠️ Este personaje no tiene imagen');
            }

        } catch(e) {
            console.error('Error en vp:', e);
            await responder.texto(`❌ Error al obtener el personaje. Revisa gacha.json`);
        }
    }
};