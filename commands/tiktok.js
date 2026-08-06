import { llamarApi } from '../lib/api.js';

export default {
    nombre: 'tiktok',
    categoría: 'multimedia',
    alias: [],
    descripcion: 'Descarga video de TikTok. Uso: .tiktok <link>',
    ejecutar: async ({ responder, argumento }) => {
        if (!argumento) return responder.texto('Manda un link de TikTok. Ej: .tiktok https://vm.tiktok.com/xxxx');
        const data = await llamarApi('/api/v1/download/tiktok', { url: argumento });
        if (!data.status) return responder.texto('❌ ' + data.message);
        await responder.video(data.result.play || data.result.hdplay, data.result.title || '');
    }
};