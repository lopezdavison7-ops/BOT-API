import fs from 'fs/promises';

const RUTA = './database/gacha.json';

export default {
    nombre: 'vp',
    categoria: 'economia',
    alias: ['verpersonaje'],
    descripcion: 'Ver info de un personaje con foto.',

    ejecutar: async ({ args, responder, conn, msg }) => {
        try {
            const nombrePers = args.join(' ');
            if (!nombrePers) return await responder.texto('❌ Usa: `.vp <nombre del personaje>`');

            // 1. Ver si existe el archivo
            let data;
            try {
                data = await fs.readFile(RUTA, 'utf-8');
            } catch {
                return await responder.texto('❌ No se encontró `database/gacha.json`\nCrea la carpeta y el archivo');
            }

            // 2. Ver si el json es válido
            let db;
            try {
                db = JSON.parse(data);
            } catch {
                return await responder.texto('❌ El `gacha.json` está mal escrito. Revisa comas y llaves');
            }

            // 3. Buscar personaje
            for (let key in db) {
                let serie = db[key];
                let pers = serie.personajes.find(p => p.nombre.toLowerCase() === nombrePers.toLowerCase());
                if (pers) {
                    const texto = `● Nombre: ${pers.nombre}
✧ Género: ${pers.genero}
✦ Valor: ${pers.valor.toLocaleString()} RWcoins
◆ Votos: ${pers.votos || 0}
✤ Fuente: ${serie.nombre}
★ Estado: ${pers.estado}`;

                    if (pers.imagen) {
                        return await conn.sendMessage(msg.key.remoteJid, { image: { url: pers.imagen }, caption: texto });
                    } else {
                        return await responder.texto(texto);
                    }
                }
            }

            return await responder.texto(`❌ No se encontró el personaje: *${nombrePers}*`);

        } catch(e) {
            console.error(e);
            await responder.texto('❌ Error al leer gacha.json');
        }
    }
};