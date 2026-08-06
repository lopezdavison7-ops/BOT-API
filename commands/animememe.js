import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'animememe',
    categoria: 'Diversión',
    alias: ['meme'],
    descripcion: 'Meme random de anime',
    ejecutar: async ({ responder }) => {
        const data = await llamarApi('/api/v1/anime/meme', {});
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.imagen(data.result.imagen_url, data.result.titulo);
    }
};