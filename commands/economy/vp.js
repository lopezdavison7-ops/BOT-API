import fs from 'fs/promises';

const RUTA = './database/gacha.json';

const buscarPersonaje = async (nombre) => {
    const data = await fs.readFile(RUTA, 'utf-8');
    const db = JSON.parse(data);

    for (let key in db) {
        let serie = db[key];
        let pers = serie.personajes.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
        if (pers) {
            return {...pers, serie: serie.nombre }; // le agregamos el nombre de la serie
        }
    }
    return null;
};

export default {
    nombre: 'vp',
    categoria: 'economia',
    alias: ['verpersonaje', 'char'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ args, responder, conn, msg }) => {
        try {
            const nombrePers = args.join(' ');
            if (!nombrePers) return await responder.texto('❌ Usa: `.vp <nombre del personaje>`\nEj: `.vp Sakura Miku`');

            const personaje = await buscarPersonaje(nombrePers);
            if (!personaje) return await responder.texto(`❌ No se encontró el personaje: *${nombrePers}*`);

            const texto = `● Nombre: ${personaje.nombre}
✧ Género: ${personaje.genero}
✦ Valor: ${personaje.valor.toLocaleString()} RWcoins
◆ Votos: ${personaje.votos || 0}
✤ Fuente: ${personaje.serie}
★ Estado: ${personaje.estado}`;

            // Si tiene imagen la manda, si no solo texto
            if (personaje.imagen && personaje.imagen!== '') {
                await conn.sendMessage(msg.key.remoteJid, {
                    image: { url: personaje.imagen },
                    caption: texto
                });
            } else {
                await responder.texto(texto + '\n\n⚠️ Sin imagen');
            }

        } catch(e) {
            console.error('Error en vp:', e);
            await responder.texto('❌ Error al obtener el personaje. Revisa gacha.json');
        }
    }
};