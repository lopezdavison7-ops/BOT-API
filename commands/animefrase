import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'animefrase',
    alias: ['frase'],
    descripcion: 'Frase random de anime',
    ejecutar: async ({ responder }) => {
        const data = await llamarApi('/api/v1/anime/frase', {});
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.texto(`💬 "${data.result.frase}"\n— ${data.result.personaje} (${data.result.anime})`);
    }
};