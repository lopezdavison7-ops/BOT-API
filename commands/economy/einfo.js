import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'einfo',
    categoria: 'economy',
    alias: ['economiainfo', 'series'],
    descripcion: 'Lista todas las series de personajes.',

    ejecutar: async ({ responder }) => {
        try {
            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            
            let data = await fs.readFile(RUTA, 'utf-8');
            let db = JSON.parse(data);

            const series = Object.keys(db);
            if (series.length === 0) {
                return await responder.texto('❌ No hay series en gacha.json');
            }

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

            texto += `💡 Usa *.ainfo <nombre>* para ver los personajes`;

            await responder.texto(texto);

        } catch(e) {
            console.error('Error en einfo:', e);
            if (e.code === 'ENOENT') {
                await responder.texto('❌ No encontré `database/gacha.json`');
            } else if (e instanceof SyntaxError) {
                await responder.texto('❌ Tu `gacha.json` tiene error de sintaxis');
            } else {
                await responder.texto(`❌ Error: ${e.message}`);
            }
        }
    }
};