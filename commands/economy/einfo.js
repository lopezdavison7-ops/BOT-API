import fs from 'fs/promises';
import path from 'path';

export default {
    nombre: 'einfo',
    categoria: 'economy',
    alias: ['economiainfo', 'personajes', 'list'],
    descripcion: 'Lista todos los personajes disponibles en el gacha.',

    ejecutar: async ({ responder }) => {
        try {
            const RUTA = path.join(process.cwd(), 'database', 'gacha.json');
            let data = await fs.readFile(RUTA, 'utf-8');
            let db = JSON.parse(data);

            const personajes = Object.keys(db);
            if (personajes.length === 0) {
                return await responder.texto('❌ No hay personajes en gacha.json');
            }

            let texto = `☆ *Gacha - Personajes Disponibles* (●´ϖ\`●)\n`;
            texto += `Total: ${personajes.length}\n\n`;
            
            let i = 1;
            for (let key in db) {
                const p = db[key];
                const estado = p.estado || 'Libre';
                const emoji = estado === 'Reclamado' ? '🔒' : '✅';
                
                texto += `${i}. ${emoji} *${p.nombre || key}*\n`;
                texto += `   › Valor: ${p.valor?.toLocaleString() || 0} RWcoins\n`;
                texto += `   › Estado: ${estado}\n`;
                texto += `   › Comando: .vp ${p.nombre || key}\n\n`;
                
                if(i === 50) { // por si tienes muchos, corta a 50
                    texto += `... y ${personajes.length - 50} más\n`;
                    break;
                }
                i++;
            }

            texto += `💡 Usa *.vp <nombre>* para ver info + foto`;
            await responder.texto(texto);

        } catch(e) {
            console.error('Error en einfo:', e);
            if (e.code === 'ENOENT') {
                await responder.texto('❌ No encontré `database/gacha.json`');
            } else {
                await responder.texto(`❌ Error: ${e.message}`);
            }
        }
    }
};