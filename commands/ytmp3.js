import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'ytmp3',
    alias: ['musica'],
    descripcion: 'Descarga audio de YouTube. Uso: .ytmp3 <link o texto>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) return responder.texto('Manda un link o texto de búsqueda. Ej: .ytmp3 daddy yankee gasolina');
        const data = await llamarApi('/api/v1/download/youtube-mp3', { q: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.audio(data.result.audio_url);
    }
};