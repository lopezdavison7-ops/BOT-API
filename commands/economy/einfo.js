import fs from 'fs/promises';

const RUTA = './database/gacha.json';

export default {
    nombre: 'einfo',
    categoria: 'economia',
    alias: ['economiainfo', 'series'],
    descripcion: 'Lista todas las series de personajes disponibles.',

    ejecutar: async ({ responder }) => {
        try {
            const data = await fs.readFile(RUTA, 'utf-8');
            const db = JSON.parse(data);

            const series = Object.keys(db);
            if (series.length === 0) return await responder.texto('❌ No hay series en gacha.json');

            let texto = `☆ *Series Disponibles* (●´ϖ\`●)\n\n`;
            
            for (let key of series) {
                const serie = db[key];
                const total = serie.personajes.length;
                const reclamados = serie.personajes.filter(p => p.estado === 'Reclamado').length;
                
                texto += `➭ *${serie.nombre}*\n`;
                texto += `   › Personajes: ${total}\n`;
                texto += `   › Reclamados: ${reclamados}/${total}\n`;
                texto += `   › Comando: .ainfo ${serie.nombre}\n\n`;
            }

            texto += `💡 Usa *.ainfo <nombre>* para ver los personajes\n`;
            texto += `💡 Usa *.vp <nombre>* para ver un personaje`;

            await responder.texto(texto);

        } catch(e) {
            console.error('Error en einfo:', e);
            await responder.texto('❌ Error al leer gacha.json');
        }
    }
};