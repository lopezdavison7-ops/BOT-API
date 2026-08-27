import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'vp',
    categoria: 'economy',
    alias: ['verpersonaje', 'verp'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ args, responder, conn, msg }) => {
        try {
            const nombrePers = args.join(' ').trim();
            if (!nombrePers) return await responder.texto('❌ Usa: `.vp <nombre del personaje>`');

            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            const data = await fs.readFile(RUTA, 'utf-8');
            const db = JSON.parse(data);

            // Debug: buscar exacto
            let personaje = db[nombrePers]; // intenta buscar por key directo
            if (!personaje) {
                // si no, busca por nombre.toLowerCase
                for (let key in db) {
                    if (db[key].nombre?.toLowerCase() === nombrePers.toLowerCase()) {
                        personaje = db[key];
                        break;
                    }
                }
            }

            if (!personaje) {
                return await responder.texto(`❌ No se encontró: *${nombrePers}*\nKeys en json: ${Object.keys(db).slice(0,5).join(', ')}...`);
            }

            const texto = `☆ *${personaje.nombre}*
✧ Género: ${personaje.genero || 'Desconocido'}
✦ Valor: ${personaje.valor?.toLocaleString() || 0} RWcoins
◆ Votos: ${personaje.votos || 0}
★ Estado: ${personaje.estado || 'Libre'}`;

            if (personaje.imagen && personaje.imagen.startsWith('http')) {
                return await conn.sendMessage(msg.key.remoteJid, {
                    image: { url: personaje.imagen },
                    caption: texto
                });
            } else {
                return await responder.texto(texto + '\n\n⚠️ Sin imagen');
            }

        } catch(e) {
            console.error('Error en vp:', e);
            await responder.texto(`❌ Error: ${e.message}\nTipo: ${e.name}`);
        }
    }
};