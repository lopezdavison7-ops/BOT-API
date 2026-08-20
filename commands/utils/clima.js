// commands/utils/clima.js
import { llamarApi } from '../../lib/api.js';

export default {
    nombre: 'clima',
    categoria: 'Utilidades',
    alias: ['tiempo'],
    descripcion: 'Clima actual de una ciudad. Uso: .clima <ciudad>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) return responder.texto('Manda una ciudad. Ej: .clima Ciudad de México');
        const data = await llamarApi('/api/v1/tools/clima', { q: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        const r = data.result;
        await responder.texto(`🌤️ *Clima en ${r.ciudad}*\n\n${r.descripcion}\nTemperatura: ${r.temperatura_c}°C\nSensación: ${r.sensacion_c}°C\nHumedad: ${r.humedad_porciento}%\nViento: ${r.viento_kmh} km/h`);
    }
};