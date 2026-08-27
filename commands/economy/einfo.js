import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'einfo',
    categoria: 'economia',
    alias: ['economiainfo', 'series', 'listaseries'],
    descripcion: 'Lista todas las series de personajes disponibles.',

    ejecutar: async ({ responder }) => {
        try {
            // Ruta relativa desde donde se ejecuta el bot
            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            
            let data;
            try {
                data = await fs.readFile(RUTA, 'utf-8');
            } catch {
                return await responder.texto('❌ No encontré `database/gacha.json`\nAsegúrate de que la carpeta y el archivo existan');
            }

            let db;
            try {
                db = JSON.parse(data);
            } catch {
                return await responder.texto('❌ Tu `gacha.json` tiene un error de sintaxis. Revisa comas y llaves');
            }

            const series = Object.keys(db);
            if (series.length === 0) return await responder.texto('❌ No hay series en gacha.json');

            let texto = `☆ *Series Disponibles* (●´ϖ\`●)\n\n`;
            
            for (let key of series) {
                const serie = db[key];
                const total = serie.personajes?.length || 0;
                const reclamados = serie.personajes?.filter(p => p.estado === 'Reclamado').length || 0;
                
                texto += `➭ *${serie.nombre}*\n`;
                texto += `   › Personajes: ${total}\n`;
                texto += `   › Reclamados: ${reclamados}/${total}\n`;
                texto += `   › Comando: .ainfo ${serie.nombre}\n\n`;
            }

            texto += `💡 Usa *.ainfo <nombre>* para ver los personajes\n`;
            texto += `💡 Usa *.vp <nombre>* para ver 1 personaje`;

            await responder.texto(texto);

        } catch(e) {
            console.error('Error en einfo:', e);
            await responder.texto