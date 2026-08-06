import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'reaccion',
    categoria: 'Diversion',
    alias: [],
    descripcion: 'GIF de reacción anime. Uso: .reaccion <tipo> (hug, pat, wave...)',
    ejecutar: async ({ responder, argumento }) => {
        const data = await llamarApi('/api/v1/anime/reaccion', { q: argumento || 'hug' });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.imagen(data.result.gif_url, '');
    }
};