import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'ytmp4',
    alias: ['yt', 'video'],
    descripcion: 'Descarga video de YouTube. Uso: .ytmp4 <link o texto>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) return responder.texto('Manda un link o texto de búsqueda. Ej: .ytmp4 daddy yankee gasolina');
        const data = await llamarApi('/api/v1/download/youtube-mp4', { q: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.video(data.result.video_url, data.result.titulo);
    }
};